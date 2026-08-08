package handlers

import (
	"archive/tar"
	"bytes"
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"sort"
	"strconv"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/mount"
	volumetypes "github.com/docker/docker/api/types/volume"
	"github.com/docker/docker/client"
	"github.com/docker/docker/errdefs"
	"github.com/docker/docker/pkg/stdcopy"
	"github.com/docker/go-connections/nat"
)

type TemplateFile struct {
	Key  string
	Path string
}

var frameworkTemplates = map[string][]TemplateFile{
	"React": {
		{Key: "vite.config.js", Path: "vite.config.js"},
		{Key: "main.jsx", Path: "src/main.jsx"},
		{Key: "index.css", Path: "src/index.css"},
		{Key: "Routes.jsx", Path: "src/Routes.jsx"},
		{Key: "components/handlers/auth.jsx", Path: "src/components/handlers/auth.jsx"},
		{Key: "components/handlers/requests.js", Path: "src/components/handlers/requests.js"},
		{Key: "components/handlers/api.js", Path: "src/components/handlers/api.js"},
	},
	"FastAPI": {
		{Key: "main.py", Path: "main.py"},
	},
	"LoggingService": {
		{Key: "logd", Path: "usr/local/bin/logd"},
	},
}

var binaryFrameworks = map[string]bool{
	"LoggingService": true,
}

type ContainerHelper struct {
	Docker   *client.Client
	Log      *slog.Logger
	R2       *s3.Client
	R2Bucket string
}

type ContainerCreateResult struct {
	ContainerID string
	Port        int
	URL         string
}

func NewContainerHelper(cli *client.Client, log *slog.Logger) *ContainerHelper {
	if log == nil {
		log = slog.Default()
	}

	accountID := os.Getenv("CF_ACCOUNT_ID")

	r2 := s3.New(s3.Options{
		Region: "auto",
		Credentials: aws.NewCredentialsCache(
			credentials.NewStaticCredentialsProvider(
				os.Getenv("R2_ACCESS_KEY"),
				os.Getenv("R2_SECRET_KEY"),
				"",
			),
		),
		BaseEndpoint: aws.String(fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)),
		UsePathStyle: true,
	})

	return &ContainerHelper{
		Docker:   cli,
		Log:      log,
		R2:       r2,
		R2Bucket: os.Getenv("R2_BUCKET_NAME"),
	}
}

func envMapToSlice(env map[string]string) []string {
	keys := make([]string, 0, len(env))
	for key := range env {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	result := make([]string, 0, len(keys))
	for _, key := range keys {
		result = append(result, key+"="+env[key])
	}

	return result
}

func (h *ContainerHelper) CreateAndStartContainer(
	ctx context.Context,
	projectID, projectName, baseTag, baseType, cleanName string,
	frontendPort int,
	backendServices, frontendServices, dbServices []string,
	env map[string]string,
) (*ContainerCreateResult, error) {
	containerName := "devolib_project_" + projectID
	volumeName := "devolib_project_" + projectID

	if _, err := h.Docker.VolumeCreate(ctx, volumetypes.CreateOptions{Name: volumeName}); err != nil {
		return nil, fmt.Errorf("creating project volume: %w", err)
	}

	config := &container.Config{
		Image:     baseTag,
		Tty:       true,
		OpenStdin: true,
		Env:       envMapToSlice(env),
		Cmd:       []string{"sh", "-c", "tail -f /dev/null"},
	}

	hostConfig := &container.HostConfig{
		NetworkMode: container.NetworkMode("web"),
		Mounts: []mount.Mount{{
			Type:   mount.TypeVolume,
			Source: volumeName,
			Target: "/app/workspace",
		}},
	}

	var exposedPort nat.Port

	if frontendPort > 0 {
		var err error

		exposedPort, err = nat.NewPort("tcp", strconv.Itoa(frontendPort))
		if err != nil {
			return nil, fmt.Errorf("creating frontend port: %w", err)
		}

		config.ExposedPorts = nat.PortSet{exposedPort: struct{}{}}
		hostConfig.PortBindings = nat.PortMap{
			exposedPort: []nat.PortBinding{{HostIP: "127.0.0.1", HostPort: ""}},
		}
	}

	resp, err := h.Docker.ContainerCreate(ctx, config, hostConfig, nil, nil, containerName)
	if err != nil {
		_ = h.Docker.VolumeRemove(ctx, volumeName, true)
		return nil, fmt.Errorf("creating container: %w", err)
	}

	if err := h.Docker.ContainerStart(ctx, resp.ID, container.StartOptions{}); err != nil {
		_ = h.Docker.ContainerRemove(ctx, resp.ID, container.RemoveOptions{Force: true})
		_ = h.Docker.VolumeRemove(ctx, volumeName, true)
		return nil, fmt.Errorf("starting container: %w", err)
	}

	if _, err := h.ExecInContainer(
		ctx,
		resp.ID,
		"mkdir -p /app/workspace/frontend /app/workspace/backend /app/workspace/database",
	); err != nil {
		return nil, fmt.Errorf("creating workspace directories: %w", err)
	}

	result := &ContainerCreateResult{
		ContainerID: resp.ID,
	}

	if frontendPort > 0 {
		inspect, err := h.Docker.ContainerInspect(ctx, resp.ID)
		if err != nil {
			return nil, fmt.Errorf("inspecting created container: %w", err)
		}

		if inspect.NetworkSettings != nil {
			bindings := inspect.NetworkSettings.Ports[exposedPort]

			if len(bindings) > 0 && bindings[0].HostPort != "" {
				result.Port, _ = strconv.Atoi(bindings[0].HostPort)
				result.URL = "http://localhost:" + bindings[0].HostPort
			}
		}
	}

	return result, nil
}

func (h *ContainerHelper) ExecInContainer(ctx context.Context, containerID, command string) (string, error) {
	exec, err := h.Docker.ContainerExecCreate(ctx, containerID, container.ExecOptions{
		Cmd:          []string{"sh", "-c", command},
		AttachStdout: true,
		AttachStderr: true,
		Tty:          false,
	})
	if err != nil {
		return "", fmt.Errorf("creating exec: %w", err)
	}

	resp, err := h.Docker.ContainerExecAttach(ctx, exec.ID, container.ExecAttachOptions{})
	if err != nil {
		return "", fmt.Errorf("attaching exec: %w", err)
	}
	defer resp.Close()

	var stdout, stderr bytes.Buffer

	if _, err := stdcopy.StdCopy(&stdout, &stderr, resp.Reader); err != nil && err != io.EOF {
		return "", fmt.Errorf("reading exec output: %w", err)
	}

	inspect, err := h.Docker.ContainerExecInspect(ctx, exec.ID)
	if err != nil {
		return stdout.String(), fmt.Errorf("inspecting exec: %w", err)
	}

	output := stdout.String()

	if stderr.Len() > 0 {
		if output != "" {
			output += "\n"
		}

		output += stderr.String()
	}

	if inspect.ExitCode != 0 {
		return output, fmt.Errorf("command exited with code %d: %s", inspect.ExitCode, output)
	}

	return output, nil
}

func (h *ContainerHelper) ExecDetached(ctx context.Context, containerID, command string) error {
	exec, err := h.Docker.ContainerExecCreate(ctx, containerID, container.ExecOptions{
		Cmd: []string{"sh", "-c", command},
	})
	if err != nil {
		return fmt.Errorf("creating detached exec: %w", err)
	}

	if err := h.Docker.ContainerExecStart(ctx, exec.ID, container.ExecStartOptions{Detach: true}); err != nil {
		return fmt.Errorf("starting detached exec: %w", err)
	}

	return nil
}

func (h *ContainerHelper) StopContainer(ctx context.Context, containerID string) error {
	timeout := 2
	return h.Docker.ContainerStop(ctx, containerID, container.StopOptions{Timeout: &timeout})
}

func (h *ContainerHelper) DeleteProjectContainer(ctx context.Context, projectID string) error {
	name := "devolib_project_" + projectID

	if err := h.Docker.ContainerRemove(ctx, name, container.RemoveOptions{Force: true}); err != nil && !errdefs.IsNotFound(err) {
		return fmt.Errorf("removing project container: %w", err)
	}

	if err := h.Docker.VolumeRemove(ctx, name, true); err != nil && !errdefs.IsNotFound(err) {
		return fmt.Errorf("removing project volume: %w", err)
	}

	return nil
}

func (h *ContainerHelper) getTemplate(ctx context.Context, key string) ([]byte, error) {
	var lastErr error

	for attempt := 0; attempt < 3; attempt++ {
		resp, err := h.R2.GetObject(ctx, &s3.GetObjectInput{
			Bucket: aws.String(h.R2Bucket),
			Key:    aws.String(key),
		})

		if err != nil {
			lastErr = err
		} else {
			content, readErr := io.ReadAll(resp.Body)
			_ = resp.Body.Close()

			if readErr == nil {
				return content, nil
			}

			lastErr = readErr
		}

		if attempt < 2 {
			h.Log.Warn(
				"retrying template fetch",
				"key", key,
				"attempt", attempt+1,
				"error", lastErr,
			)
		}
	}

	return nil, fmt.Errorf("fetching template %s: %w", key, lastErr)
}

func (h *ContainerHelper) ScaffoldTemplate(
	ctx context.Context,
	containerID, framework, destination string,
) error {
	files, ok := frameworkTemplates[framework]
	if !ok {
		h.Log.Warn("no templates found for framework", "framework", framework)
		return nil
	}

	var buf bytes.Buffer
	tw := tar.NewWriter(&buf)
	isBinary := binaryFrameworks[framework]

	for _, file := range files {
		content, err := h.getTemplate(ctx, file.Key)
		if err != nil {
			_ = tw.Close()
			return err
		}

		mode := int64(0644)
		if isBinary {
			mode = 0755
		}

		header := &tar.Header{
			Name: file.Path,
			Mode: mode,
			Size: int64(len(content)),
		}

		if err := tw.WriteHeader(header); err != nil {
			_ = tw.Close()
			return fmt.Errorf("writing template header %s: %w", file.Key, err)
		}

		if _, err := tw.Write(content); err != nil {
			_ = tw.Close()
			return fmt.Errorf("writing template %s: %w", file.Key, err)
		}

		h.Log.Info("added template file", "framework", framework, "file", file.Path)
	}

	if err := tw.Close(); err != nil {
		return fmt.Errorf("closing template archive: %w", err)
	}

	if err := h.Docker.CopyToContainer(
		ctx,
		containerID,
		destination,
		bytes.NewReader(buf.Bytes()),
		container.CopyToContainerOptions{},
	); err != nil {
		return fmt.Errorf("scaffolding %s templates: %w", framework, err)
	}

	h.Log.Info("scaffolded templates", "framework", framework, "destination", destination)

	return nil
}
