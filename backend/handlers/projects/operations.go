package handlers

import (
	"archive/tar"
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"path"
	"strings"

	"github.com/docker/docker/api/types/container"
)

var dbOperations = map[string]bool{"CREATE_TABLE": true, "DROP_TABLE": true, "ALTER_TABLE": true, "INSERT": true, "UPDATE": true, "CHANGE_COLUMN_TYPE": true, "DELETE": true, "GET_SCHEMA": true, "PUSH_SCHEMA": true, "INSERT_TEST_DATA": true, "GET_ROWS": true}
var fileOperations = map[string]bool{"READ_FILE": true, "WRITE_FILE": true, "SAVE_CHANGES": true, "UNDO_CHANGES": true, "DELETE_FILE": true}
var dependencyOperations = map[string]bool{"INSTALL_PACKAGES": true, "REMOVE_PACKAGE": true, "UPGRADE": true}

func processProjectCommand(ctx context.Context, db *sql.DB, helper *ContainerHelper, containerID, projectID, projectName, currentDir, raw string, send chan<- string) (string, string) {
	command := strings.TrimSpace(raw)
	if command == "" {
		return "", currentDir
	}
	if strings.HasPrefix(command, "cd ") {
		target := strings.TrimSpace(command[3:])
		next := path.Clean(path.Join(currentDir, target))
		if strings.HasPrefix(target, "/") {
			next = path.Clean(target)
		}
		return "Changed directory to " + next + "\n", next
	}
	if strings.HasPrefix(command, "{") && strings.HasSuffix(command, "}") {
		var payload map[string]any
		if err := json.Unmarshal([]byte(command), &payload); err != nil {
			return "Error handling command: " + err.Error() + "\n", currentDir
		}
		if err := handleProjectJSONCommand(ctx, db, helper, containerID, projectID, projectName, payload, send); err != nil {
			return "Error handling command: " + err.Error() + "\n", currentDir
		}
		_, _ = db.ExecContext(ctx, "UPDATE projects SET last_online = NOW() WHERE project_id = $1", projectID)
		if isKnownProjectCommand(payload) {
			return "", currentDir
		}
		return "Command handled\n", currentDir
	}
	output, _, err := runContainerCommand(ctx, helper, containerID, "", []string{"bash", "-c", "cd " + shellQuote(currentDir) + " && " + command})
	_, _ = db.ExecContext(ctx, "UPDATE projects SET last_online = NOW() WHERE project_id = $1", projectID)
	if err != nil && output == "" {
		output = err.Error() + "\n"
	}
	return output, currentDir
}

func isKnownProjectCommand(payload map[string]any) bool {
	commandType, operation := stringValue(payload["type"]), stringValue(payload["operation"])
	return commandType == "START_SERVICE" || commandType == "PACKAGE" || commandType == "CURL" || fileOperations[commandType] || dbOperations[operation]
}

func handleProjectJSONCommand(ctx context.Context, db *sql.DB, helper *ContainerHelper, containerID, projectID, projectName string, payload map[string]any, send chan<- string) error {
	commandType, operation := stringValue(payload["type"]), stringValue(payload["operation"])
	switch {
	case commandType == "START_SERVICE":
		return startProjectService(ctx, db, helper, containerID, projectID, projectName, stringValue(payload["service"]), send)
	case dbOperations[operation]:
		return handleDBCommand(ctx, db, helper, containerID, projectID, payload, send)
	case fileOperations[commandType]:
		return handleFileCommand(ctx, helper, containerID, payload, send)
	case commandType == "PACKAGE":
		return handlePackageCommand(ctx, helper, containerID, payload, send)
	case commandType == "CURL":
		return handleGeneralCommand(ctx, helper, containerID, payload, send)
	default:
		return nil
	}
}

func handleDBCommand(ctx context.Context, db *sql.DB, helper *ContainerHelper, containerID, projectID string, command map[string]any, send chan<- string) error {
	operation := stringValue(command["operation"])
	if !dbOperations[operation] {
		return fmt.Errorf("invalid operation: %s", operation)
	}
	if operation == "GET_SCHEMA" || operation == "PUSH_SCHEMA" {
		return pushProjectSchema(ctx, db, helper, containerID, projectID, send)
	}
	if operation == "GET_ROWS" {
		table := stringValue(command["target"])
		output, exitCode, err := runContainerCommand(ctx, helper, containerID, "", []string{"psql", "-U", "postgres", "-d", "myapp", "-A", "-F", "|", "-c", "SELECT * FROM " + table + ";"})
		if err != nil {
			return err
		}
		if exitCode != 0 {
			queueProjectMessage(ctx, send, "[✗] Query failed: "+output+"\n")
			return nil
		}
		lines := strings.Split(strings.TrimSpace(output), "\n")
		rows := make([]map[string]string, 0)
		if len(lines) > 0 && lines[0] != "" {
			headers := strings.Split(lines[0], "|")
			for _, line := range lines[1:] {
				if line == "" {
					continue
				}
				values, row := strings.Split(line, "|"), map[string]string{}
				for index, header := range headers {
					if index < len(values) {
						row[header] = values[index]
					}
				}
				rows = append(rows, row)
			}
		}
		return sendProjectJSON(ctx, send, map[string]any{"type": "GET_ROWS", "table": table, "rows": rows})
	}

	sqlText := strings.ReplaceAll(stringValue(command["sql"]), "\n", " ")
	if operation == "INSERT_TEST_DATA" {
		sqlText = "BEGIN; " + sqlText + " COMMIT;"
	}
	output, exitCode, err := runContainerCommand(ctx, helper, containerID, "", []string{"psql", "-U", "postgres", "-d", "myapp", "-c", sqlText})
	if err != nil {
		return err
	}
	if exitCode != 0 {
		label := "SQL Error"
		if operation == "INSERT_TEST_DATA" {
			label = "Insert failed"
		}
		queueProjectMessage(ctx, send, "[✗] "+label+": "+output+"\n")
		return nil
	}
	if operation == "INSERT_TEST_DATA" {
		queueProjectMessage(ctx, send, "[✓] Test data inserted\n")
	} else {
		queueProjectMessage(ctx, send, "[✓] Executed: "+operation+" on "+stringValue(command["target"])+"\n")
	}
	return pushProjectSchema(ctx, db, helper, containerID, projectID, send)
}

func handleFileCommand(ctx context.Context, helper *ContainerHelper, containerID string, command map[string]any, send chan<- string) error {
	commandType, filePath := stringValue(command["type"]), stringValue(command["path"])
	if !fileOperations[commandType] {
		return fmt.Errorf("invalid operation: %s", commandType)
	}
	if filePath == "" {
		queueProjectMessage(ctx, send, "[✗] No path provided\n")
		return nil
	}
	if strings.Contains(filePath, "..") {
		queueProjectMessage(ctx, send, "[✗] Invalid path\n")
		return nil
	}
	switch commandType {
	case "READ_FILE":
		output, exitCode, err := runContainerCommand(ctx, helper, containerID, "", []string{"cat", filePath})
		if err != nil {
			return err
		}
		if exitCode != 0 {
			queueProjectMessage(ctx, send, "[✗] File not found: "+filePath+"\n")
			return nil
		}
		return sendProjectJSON(ctx, send, map[string]any{"type": "FILE_CONTENT", "path": filePath, "content": output})
	case "WRITE_FILE":
		content := stringValue(command["content"])
		if strings.TrimSpace(content) == "" {
			queueProjectMessage(ctx, send, "[✗] Refused to write empty content to "+filePath+"\n")
			return nil
		}
		var archive bytes.Buffer
		writer := tar.NewWriter(&archive)
		if err := writer.WriteHeader(&tar.Header{Name: path.Base(filePath), Mode: 0644, Size: int64(len([]byte(content)))}); err != nil {
			return err
		}
		if _, err := writer.Write([]byte(content)); err != nil {
			return err
		}
		if err := writer.Close(); err != nil {
			return err
		}
		if err := helper.Docker.CopyToContainer(ctx, containerID, path.Dir(filePath), bytes.NewReader(archive.Bytes()), container.CopyToContainerOptions{}); err != nil {
			return err
		}
		return sendProjectJSON(ctx, send, map[string]any{"type": "FILE_SAVED", "path": filePath})
	case "DELETE_FILE":
		_, exitCode, err := runContainerCommand(ctx, helper, containerID, "", []string{"rm", filePath})
		if err != nil {
			return err
		}
		if exitCode != 0 {
			queueProjectMessage(ctx, send, "[✗] Failed to delete: "+filePath+"\n")
		} else {
			queueProjectMessage(ctx, send, "[✓] Deleted: "+filePath+"\n")
		}
	}
	return nil
}

// Keep persisted editor metadata and the live PostgreSQL schema in step after every database mutation.
func pushProjectSchema(ctx context.Context, db *sql.DB, helper *ContainerHelper, containerID, projectID string, send chan<- string) error {
	schemaCommand := `su - postgres -c "psql -d myapp -t -A -F'|' -c \"SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position;\""`
	foreignKeyCommand := `su - postgres -c "psql -d myapp -t -A -F'|' -c \"SELECT kcu.table_name, kcu.column_name, ccu.table_name, ccu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY';\""`
	schemaOutput, _, err := runContainerCommand(ctx, helper, containerID, "", []string{"sh", "-c", schemaCommand})
	if err != nil {
		return err
	}
	foreignKeyOutput, _, err := runContainerCommand(ctx, helper, containerID, "", []string{"sh", "-c", foreignKeyCommand})
	if err != nil {
		return err
	}
	foreignKeys := map[string]map[string]map[string]string{}
	for _, line := range strings.Split(strings.TrimSpace(foreignKeyOutput), "\n") {
		parts := strings.Split(line, "|")
		if len(parts) != 4 {
			continue
		}
		if foreignKeys[parts[0]] == nil {
			foreignKeys[parts[0]] = map[string]map[string]string{}
		}
		foreignKeys[parts[0]][parts[1]] = map[string]string{"referencedTable": parts[2], "referencedColumn": parts[3]}
	}
	tables := map[string][]map[string]any{}
	for _, line := range strings.Split(strings.TrimSpace(schemaOutput), "\n") {
		parts := strings.Split(line, "|")
		if len(parts) != 4 {
			continue
		}
		var foreignKey any
		if foreignKeys[parts[0]] != nil {
			foreignKey = foreignKeys[parts[0]][parts[1]]
		}
		tables[parts[0]] = append(tables[parts[0]], map[string]any{"column": parts[1], "type": parts[2], "nullable": parts[3] == "YES", "foreignKey": foreignKey})
	}
	encoded, err := json.Marshal(tables)
	if err != nil {
		return err
	}
	if _, err := db.ExecContext(ctx, "UPDATE project_metadata SET db_schema = $1::jsonb, updated_at = NOW() WHERE project_id = $2", string(encoded), projectID); err != nil {
		return err
	}
	return sendProjectJSON(ctx, send, map[string]any{"type": "DATABASE_SCHEMA", "tables": tables})
}

func handlePackageCommand(ctx context.Context, helper *ContainerHelper, containerID string, command map[string]any, send chan<- string) error {
	operation, manager := stringValue(command["operation"]), stringValue(command["pm"])
	if !dependencyOperations[operation] {
		return fmt.Errorf("invalid operation: %s", operation)
	}
	if manager != "npm" && manager != "pip" && manager != "yarn" && manager != "cargo" {
		queueProjectMessage(ctx, send, "[✗] Invalid or missing package manager\n")
		return nil
	}
	packages := stringSlice(command["packages"])
	if len(packages) == 0 {
		queueProjectMessage(ctx, send, "[✗] No packages provided\n")
		return nil
	}
	for _, pkg := range packages {
		if !validPackageName(pkg) {
			queueProjectMessage(ctx, send, "[✗] Rejected suspicious package name: "+pkg+"\n")
			return nil
		}
	}
	dev, _ := command["dev"].(bool)
	execCommand := packageCommand(manager, packages, dev)
	queueProjectMessage(ctx, send, "→ "+strings.Join(execCommand, " ")+"\n")
	_ = sendProjectJSON(ctx, send, map[string]any{"type": "INSTALL_STARTED", "pm": manager, "packages": packages})
	exitCode, err := streamContainerCommand(ctx, helper, containerID, "/app", execCommand, func(line string) {
		if strings.TrimSpace(line) != "" {
			queueProjectMessage(ctx, send, "  "+line+"\n")
		}
	})
	if err != nil {
		return err
	}
	if exitCode != 0 {
		queueProjectMessage(ctx, send, fmt.Sprintf("[✗] Install failed (exit %d)\n", exitCode))
		return sendProjectJSON(ctx, send, map[string]any{"type": "INSTALL_DONE", "success": false})
	}
	queueProjectMessage(ctx, send, fmt.Sprintf("[✓] Installed %d package(s) via %s\n", len(packages), manager))
	return sendProjectJSON(ctx, send, map[string]any{"type": "INSTALL_DONE", "success": true})
}

func handleGeneralCommand(ctx context.Context, helper *ContainerHelper, containerID string, command map[string]any, send chan<- string) error {
	method, requestPath := stringValue(command["method"]), stringValue(command["path"])
	if method == "" {
		method = "GET"
	}
	args := []string{"curl", "-s", "-o", "-", "-w", "%{http_code}", "http://localhost:8000" + requestPath}
	if method != "GET" && command["payload"] != nil {
		payload, _ := json.Marshal(command["payload"])
		args = append(args, "-X", method, "-H", "Content-Type: application/json", "-d", string(payload))
	}
	output, _, err := runContainerCommand(ctx, helper, containerID, "", args)
	if err != nil {
		return err
	}
	statusCode, body := output, ""
	if len(output) >= 3 {
		statusCode, body = output[len(output)-3:], output[:len(output)-3]
	}
	return sendProjectJSON(ctx, send, map[string]any{"type": "CURL", "test_id": command["test_id"], "status_code": statusCode, "body": body})
}

func packageCommand(manager string, packages []string, dev bool) []string {
	var command []string
	switch manager {
	case "npm":
		command = []string{"npm", "install", "--save"}
		if dev {
			command[2] = "--save-dev"
		}
	case "pip":
		command = []string{"pip", "install"}
	case "yarn":
		command = []string{"yarn", "add"}
		if dev {
			command = append(command, "--dev")
		}
	case "cargo":
		command = []string{"cargo", "add"}
		if dev {
			command = append(command, "--dev")
		}
	}
	return append(command, packages...)
}

func validPackageName(pkg string) bool {
	if pkg == "" {
		return false
	}
	for _, char := range pkg {
		if (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || (char >= '0' && char <= '9') || strings.ContainsRune("-_@/.^~", char) {
			continue
		}
		return false
	}
	return true
}

func stringValue(value any) string {
	text, _ := value.(string)
	return text
}

func stringSlice(value any) []string {
	items, ok := value.([]any)
	if !ok {
		return nil
	}
	result := make([]string, 0, len(items))
	for _, item := range items {
		if text, ok := item.(string); ok {
			result = append(result, text)
		}
	}
	return result
}

func sendProjectJSON(ctx context.Context, send chan<- string, value any) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	if !queueProjectMessage(ctx, send, string(data)) {
		return errors.New("project connection closed")
	}
	return nil
}
