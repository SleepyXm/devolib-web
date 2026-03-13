package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"time"
)

var accessLogPattern = regexp.MustCompile(`"(GET|POST|PUT|DELETE|PATCH|OPTIONS) (/\S*) HTTP/\S+" (\d{3})`)

type LogEvent struct {
	CorrelationID string `json:"correlation_id,omitempty"`
	Source        string `json:"source"`
	Direction     string `json:"direction"`
	Status        int    `json:"status,omitempty"`
	Message       string `json:"message"`
	Timestamp     string `json:"timestamp"`
}

type LogOutput struct {
	Type  string   `json:"type"`
	Event LogEvent `json:"event"`
}

func classify(event *LogEvent) {
	switch {
	case event.Status == 0 && event.Message != "":
		event.Direction = "self"
	case event.Status >= 500:
		event.Direction = "self"
	case event.Status >= 400 && event.Status < 500:
		event.Direction = "inbound"
	case event.Status >= 200 && event.Status < 400:
		event.Direction = "outbound"
	default:
		event.Direction = "self"
	}
}

func emit(event LogEvent) {
	if event.Timestamp == "" {
		event.Timestamp = time.Now().UTC().Format(time.RFC3339)
	}
	classify(&event)
	out := LogOutput{Type: "LOG_EVENT", Event: event}
	json.NewEncoder(os.Stdout).Encode(out)
}

func tailFile(path string, source string) {
	for {
		if _, err := os.Stat(path); err == nil {
			break
		}
		time.Sleep(1 * time.Second)
	}

	f, err := os.Open(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "could not open %s: %v\n", path, err)
		return
	}
	defer f.Close()

	// Seek to end - only care about new lines
	offset, _ := f.Seek(0, 2)

	for {
		// Check if file has grown
		info, err := os.Stat(path)
		if err != nil {
			time.Sleep(1 * time.Second)
			continue
		}

		if info.Size() <= offset {
			time.Sleep(250 * time.Millisecond)
			continue
		}

		// Read only new content from last position
		f.Seek(offset, 0)
		scanner := bufio.NewScanner(f)
		for scanner.Scan() {
			line := scanner.Text()
			match := accessLogPattern.FindStringSubmatch(line)
			if match == nil {
				continue
			}
			status, _ := strconv.Atoi(match[3])
			if status < 400 {
				continue
			}
			emit(LogEvent{
				Source:  source,
				Status:  status,
				Message: fmt.Sprintf("%s %s", match[1], match[2]),
			})
		}
		offset, _ = f.Seek(0, 1)
	}
}

func handleLog(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var event LogEvent
	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	emit(event)
	w.WriteHeader(http.StatusAccepted)
}

func main() {
	port := os.Getenv("LOGD_PORT")
	if port == "" {
		port = "7070"
	}

	go func() { tailFile("/tmp/backend.log", "backend") }()
	go func() { tailFile("/tmp/frontend.log", "frontend") }()

	http.HandleFunc("/log", handleLog)

	emit(LogEvent{
		Source:  "logd",
		Message: "logd started",
	})

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		fmt.Fprintf(os.Stderr, "logd failed: %v\n", err)
		os.Exit(1)
	}
}
