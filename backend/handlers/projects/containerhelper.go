package handlers

import (
	"archive/tar"
	"bytes"
	"context"
	"fmt"
	"io"
	"os"

	"log/slog"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/mount"
	"github.com/docker/docker/api/types/network"
	volumetypes "github.com/docker/docker/api/types/volume"
	"github.com/docker/docker/client"
)

const NetworkName = "web"

// FrameworkTemplate maps a source S3 key to a destination path inside the container.
type FrameworkTemplate struct {
	BucketKey string
	TarPath   string
}

var FrameworkTemplates = map[string][]FrameworkTemplate{
	"React": {
		{"vite.config.js", "vite.config.js"},
		{"main.jsx", "src/main.jsx"},
		{"index.css", "src/index.css"},
		{"Routes.jsx", "src/Routes.jsx"},
		{"components/handlers/auth.jsx", "src/components/handlers/auth.jsx"},
		{"components/handlers/requests.js", "src/components/handlers/requests.js"},
		{"components/handlers/api.js", "src/components/handlers/api.js"},
	},
	"FastAPI": {
		{"main.py", "main.py"},
	},
	"LoggingService": {
		{"logd", "usr/local/bin/logd"},
	},
}

var BinaryFrameworks = map[string]bool{
	"LoggingService": true,
}

// ContainerHelper holds dependencies for container operations.
type ContainerHelper struct {
	Docker *client.Client
	S3     *s3.Client
	Bucket string
	Log    *slog.Logger
}

// ContainerResult is returned by CreateAndStartContainer.
type ContainerResult struct {
	ContainerID string
	Port        int
	URL         string
}

// CreateAndStartContainer creates and starts a Docker container for a project.
func (h *ContainerHelper) CreateAndStartContainer(
	ctx context.Context,
	projectID, projectName, baseTag, baseType, cleanName string,
	frontendPort int,
	backendServices, frontendServices, dbServices []string,
	env map[string]string,
) (*ContainerResult, error) {
	containerName := fmt.Sprintf("devolib_project_%s", projectID)
	volumeName := containerName

	labels := mergeLabels(
		TraefikLabels(projectID, cleanName, frontendPort),
		DevolibLabels(projectID, projectName, baseType, backendServices, frontendServices, dbServices),
	)

	envSlice := make([]string, 0, len(env))
	for k, v := range env {
		envSlice = append(envSlice, fmt.Sprintf("%s=%s", k, v))
	}

	h.Log.Info("creating container",
		"project_id", projectID,
		"base", baseType,
		"port", frontendPort,
		"be_count", len(backendServices),
		"fe_count", len(frontendServices),
	)

	// Ensure the volume exists.
	_, err := h.Docker.VolumeCreate(ctx, volumetypes.CreateOptions{Name: volumeName})
	if err != nil {
		return nil, fmt.Errorf("creating volume: %w", err)
	}

	resp, err := h.Docker.ContainerCreate(
		ctx,
		&container.Config{
			Image:     baseTag,
			Labels:    labels,
			Env:       envSlice,
			Tty:       true,
			OpenStdin: true,
		},
		&container.HostConfig{
			Mounts: []mount.Mount{
				{
					Type:   mount.TypeVolume,
					Source: volumeName,
					Target: "/app/workspace",
				},
			},
			Resources: container.Resources{
				Memory:   1024 * 1024 * 1024, // 1024m
				CPUQuota: 50000,
			},
		},
		&network.NetworkingConfig{
			EndpointsConfig: map[string]*network.EndpointSettings{
				NetworkName: {},
			},
		},
		nil,
		containerName,
	)
	if err != nil {
		return nil, fmt.Errorf("creating container: %w", err)
	}

	if err := h.Docker.ContainerStart(ctx, resp.ID, container.StartOptions{}); err != nil {
		// Best-effort cleanup.
		_ = h.Docker.ContainerRemove(ctx, resp.ID, container.RemoveOptions{Force: true})
		return nil, fmt.Errorf("starting container: %w", err)
	}

	url := fmt.Sprintf("http://%s.localhost", cleanName)
	h.Log.Info("container started",
		"project_id", projectID,
		"container_id", resp.ID[:12],
		"url", url,
	)

	return &ContainerResult{
		ContainerID: resp.ID,
		Port:        frontendPort,
		URL:         url,
	}, nil
}

// ScaffoldTemplate fetches template files from S3 and puts them into the container.
func (h *ContainerHelper) ScaffoldTemplate(ctx context.Context, containerID, framework, destination string) error {
	templates, ok := FrameworkTemplates[framework]
	if !ok {
		h.Log.Warn("no templates for framework", "framework", framework)
		return nil
	}

	isBinary := BinaryFrameworks[framework]

	var buf bytes.Buffer
	tw := tar.NewWriter(&buf)

	for _, tmpl := range templates {
		content, err := h.getTemplate(ctx, tmpl.BucketKey)
		if err != nil {
			return fmt.Errorf("fetching template %s: %w", tmpl.BucketKey, err)
		}

		hdr := &tar.Header{
			Name: tmpl.TarPath,
			Size: int64(len(content)),
		}
		if isBinary {
			hdr.Mode = 0o755
		} else {
			hdr.Mode = 0o644
		}

		if err := tw.WriteHeader(hdr); err != nil {
			return fmt.Errorf("writing tar header for %s: %w", tmpl.TarPath, err)
		}
		if _, err := tw.Write(content); err != nil {
			return fmt.Errorf("writing tar body for %s: %w", tmpl.TarPath, err)
		}

		h.Log.Info("added template file", "framework", framework, "file", tmpl.TarPath)
	}

	if err := tw.Close(); err != nil {
		return fmt.Errorf("closing tar writer: %w", err)
	}

	if err := h.Docker.CopyToContainer(ctx, containerID, destination, &buf, container.CopyToContainerOptions{}); err != nil {
		return fmt.Errorf("copying templates to container: %w", err)
	}

	h.Log.Info("scaffolded templates", "framework", framework, "destination", destination)
	return nil
}

// getTemplate fetches a file from S3/R2 with up to 3 retries.
func (h *ContainerHelper) getTemplate(ctx context.Context, key string) ([]byte, error) {
	var lastErr error
	for attempt := 0; attempt < 3; attempt++ {
		out, err := h.S3.GetObject(ctx, &s3.GetObjectInput{
			Bucket: aws.String(h.Bucket),
			Key:    aws.String(key),
		})
		if err != nil {
			lastErr = err
			h.Log.Warn("retrying template fetch", "key", key, "attempt", attempt+1, "error", err)
			continue
		}
		defer out.Body.Close()
		return io.ReadAll(out.Body)
	}
	return nil, fmt.Errorf("fetching %s after 3 attempts: %w", key, lastErr)
}

// ExecInContainer runs a shell command in a container and returns stdout.
func (h *ContainerHelper) ExecInContainer(ctx context.Context, containerID, cmd string) (string, error) {
	exec, err := h.Docker.ContainerExecCreate(ctx, containerID, container.ExecOptions{
		Cmd:          []string{"sh", "-c", cmd},
		AttachStdout: true,
		AttachStderr: true,
	})
	if err != nil {
		return "", fmt.Errorf("creating exec: %w", err)
	}

	resp, err := h.Docker.ContainerExecAttach(ctx, exec.ID, container.ExecAttachOptions{})
	if err != nil {
		return "", fmt.Errorf("attaching exec: %w", err)
	}
	defer resp.Close()

	var out bytes.Buffer
	if _, err := io.Copy(&out, resp.Reader); err != nil {
		return "", fmt.Errorf("reading exec output: %w", err)
	}

	return out.String(), nil
}

func mergeLabels(maps ...map[string]string) map[string]string {
	result := make(map[string]string)
	for _, m := range maps {
		for k, v := range m {
			result[k] = v
		}
	}
	return result
}

// R2ClientFromEnv builds an S3-compatible client from environment variables.
func R2ClientFromEnv() *s3.Client {
	accountID := os.Getenv("CF_ACCOUNT_ID")
	return s3.New(s3.Options{
		BaseEndpoint: aws.String(fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)),
		Credentials: aws.CredentialsProviderFunc(func(ctx context.Context) (aws.Credentials, error) {
			return aws.Credentials{
				AccessKeyID:     os.Getenv("R2_ACCESS_KEY"),
				SecretAccessKey: os.Getenv("R2_SECRET_KEY"),
			}, nil
		}),
		Region: "auto",
	})
}
