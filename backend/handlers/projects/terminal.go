package handlers

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/pkg/stdcopy"
	"github.com/gin-gonic/gin"
	"golang.org/x/net/websocket"
)

type projectRuntimeState struct {
	send     chan<- string
	services map[string]any
}

var projectRuntimes = struct {
	sync.Mutex
	items map[string]*projectRuntimeState
}{items: map[string]*projectRuntimeState{}}

func ProjectWebSocket(db *sql.DB) gin.HandlerFunc {
	_, helper, dockerErr := projectDocker()
	return func(c *gin.Context) {
		if dockerErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Docker unavailable"})
			return
		}
		projectID, accessToken := c.Param("project_id"), c.Query("access_token")
		if accessToken == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Access token required"})
			return
		}
		var projectName, containerID string
		err := db.QueryRowContext(c.Request.Context(), `SELECT name, container_id FROM projects WHERE project_id = $1 AND (access_token = $2 OR access_token = $3)`, projectID, hashProjectAccessToken(accessToken), accessToken).Scan(&projectName, &containerID)
		if err == sql.ErrNoRows {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid access token or project not found"})
			return
		}
		if err != nil || containerID == "" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not load project container"})
			return
		}

		server := websocket.Server{
			Handshake: func(*websocket.Config, *http.Request) error { return nil },
			Handler: func(ws *websocket.Conn) {
				runTerminalSession(c.Request.Context(), ws, db, helper, containerID, projectID, projectName)
			},
		}
		server.ServeHTTP(c.Writer, c.Request)
	}
}

func runTerminalSession(parent context.Context, ws *websocket.Conn, db *sql.DB, helper *ContainerHelper, containerID, projectID, projectName string) {
	ctx, cancel := context.WithCancel(parent)
	defer cancel()
	send := make(chan string, 256)
	registerProjectRuntime(projectID, send)
	defer unregisterProjectRuntime(projectID, send)

	var workers sync.WaitGroup
	workers.Add(2)
	// All terminal, status, and log messages share one writer because WebSocket writes cannot overlap safely.
	go func() {
		defer workers.Done()
		for {
			select {
			case message := <-send:
				if err := websocket.Message.Send(ws, message); err != nil {
					cancel()
					_ = ws.Close()
					return
				}
			case <-ctx.Done():
				return
			}
		}
	}()
	go func() { defer workers.Done(); tailProjectLogs(ctx, helper, containerID, send) }()

	queueProjectMessage(ctx, send, "User connected at "+time.Now().UTC().Format("2006-01-02T15:04:05.999999")+"!\n")
	updateProjectServices(ctx, projectID, send, func(services map[string]any) { services["container"] = true })
	currentDir := "/app/workspace"
	for ctx.Err() == nil {
		var command string
		if err := websocket.Message.Receive(ws, &command); err != nil {
			break
		}
		output, nextDir := processProjectCommand(ctx, db, helper, containerID, projectID, projectName, currentDir, command, send)
		currentDir = nextDir
		if output != "" {
			queueProjectMessage(ctx, send, output)
		}
	}
	cancel()
	_ = ws.Close()
	workers.Wait()
}

func registerProjectRuntime(projectID string, send chan<- string) {
	projectRuntimes.Lock()
	projectRuntimes.items[projectID] = &projectRuntimeState{send: send, services: map[string]any{"container": true}}
	projectRuntimes.Unlock()
}

func unregisterProjectRuntime(projectID string, send chan<- string) {
	projectRuntimes.Lock()
	if current := projectRuntimes.items[projectID]; current != nil && current.send == send {
		delete(projectRuntimes.items, projectID)
	}
	projectRuntimes.Unlock()
}

func updateProjectServices(ctx context.Context, projectID string, fallback chan<- string, update func(map[string]any)) {
	projectRuntimes.Lock()
	runtime := projectRuntimes.items[projectID]
	if runtime == nil {
		runtime = &projectRuntimeState{send: fallback, services: map[string]any{"container": true}}
		projectRuntimes.items[projectID] = runtime
	}
	update(runtime.services)
	status := make(map[string]any, len(runtime.services))
	for key, value := range runtime.services {
		status[key] = value
	}
	send := runtime.send
	projectRuntimes.Unlock()
	sendServiceStatus(ctx, send, status)
}

func notifyProjectStopped(ctx context.Context, projectID string) {
	projectRuntimes.Lock()
	runtime := projectRuntimes.items[projectID]
	delete(projectRuntimes.items, projectID)
	projectRuntimes.Unlock()
	if runtime != nil {
		sendServiceStatus(ctx, runtime.send, map[string]any{"container": false, "frontend": false, "backend": false, "database": false})
	}
}

func sendServiceStatus(ctx context.Context, send chan<- string, status map[string]any) {
	data, _ := json.Marshal(map[string]any{"type": "service-status", "data": status})
	queueProjectMessage(ctx, send, string(data))
}

func queueProjectMessage(ctx context.Context, send chan<- string, message string) bool {
	if send == nil {
		return false
	}
	select {
	case send <- message:
		return true
	case <-ctx.Done():
		return false
	}
}

func tailProjectLogs(ctx context.Context, helper *ContainerHelper, containerID string, send chan<- string) {
	_, _ = streamContainerCommand(ctx, helper, containerID, "", []string{"tail", "-f", "/var/log/logd.log"}, func(line string) {
		var event map[string]any
		if json.Unmarshal([]byte(strings.TrimSpace(line)), &event) == nil && event["type"] == "LOG_EVENT" {
			queueProjectMessage(ctx, send, strings.TrimSpace(line))
		}
	})
}

func runContainerCommand(ctx context.Context, helper *ContainerHelper, containerID, workdir string, command []string) (string, int, error) {
	exec, err := helper.Docker.ContainerExecCreate(ctx, containerID, container.ExecOptions{Cmd: command, WorkingDir: workdir, AttachStdout: true, AttachStderr: true})
	if err != nil {
		return "", -1, err
	}
	attached, err := helper.Docker.ContainerExecAttach(ctx, exec.ID, container.ExecAttachOptions{})
	if err != nil {
		return "", -1, err
	}
	defer attached.Close()
	var stdout, stderr bytes.Buffer
	if _, err := stdcopy.StdCopy(&stdout, &stderr, attached.Reader); err != nil && !errors.Is(err, io.EOF) {
		return stdout.String() + stderr.String(), -1, err
	}
	inspect, err := helper.Docker.ContainerExecInspect(ctx, exec.ID)
	return stdout.String() + stderr.String(), inspect.ExitCode, err
}

type streamLineWriter struct {
	mu      sync.Mutex
	pending string
	onLine  func(string)
}

func (w *streamLineWriter) Write(data []byte) (int, error) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.pending += string(data)
	for {
		index := strings.IndexByte(w.pending, '\n')
		if index < 0 {
			break
		}
		w.onLine(strings.TrimSuffix(w.pending[:index], "\r"))
		w.pending = w.pending[index+1:]
	}
	return len(data), nil
}

func (w *streamLineWriter) flush() {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.pending != "" {
		w.onLine(w.pending)
		w.pending = ""
	}
}

func streamContainerCommand(ctx context.Context, helper *ContainerHelper, containerID, workdir string, command []string, onLine func(string)) (int, error) {
	exec, err := helper.Docker.ContainerExecCreate(ctx, containerID, container.ExecOptions{Cmd: command, WorkingDir: workdir, AttachStdout: true, AttachStderr: true})
	if err != nil {
		return -1, err
	}
	attached, err := helper.Docker.ContainerExecAttach(ctx, exec.ID, container.ExecAttachOptions{})
	if err != nil {
		return -1, err
	}
	defer attached.Close()
	done := make(chan struct{})
	go func() {
		select {
		case <-ctx.Done():
			attached.Close()
		case <-done:
		}
	}()
	stdout, stderr := &streamLineWriter{onLine: onLine}, &streamLineWriter{onLine: onLine}
	_, copyErr := stdcopy.StdCopy(stdout, stderr, attached.Reader)
	close(done)
	stdout.flush()
	stderr.flush()
	if ctx.Err() != nil {
		return -1, ctx.Err()
	}
	if copyErr != nil && !errors.Is(copyErr, io.EOF) {
		return -1, copyErr
	}
	inspect, err := helper.Docker.ContainerExecInspect(ctx, exec.ID)
	return inspect.ExitCode, err
}
