package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"path"
	"sort"
	"strings"

	"devolib/structs"
)

func scannerExec(ctx context.Context, helper *ContainerHelper, containerID, command string) (string, error) {
	output, err := helper.ExecInContainer(ctx, containerID, command)
	return strings.TrimSpace(output), err
}

func FileExists(ctx context.Context, helper *ContainerHelper, containerID, filePath string) bool {
	output, err := scannerExec(ctx, helper, containerID, fmt.Sprintf("if [ -f %s ]; then printf yes; fi", shellQuote(filePath)))
	return err == nil && output == "yes"
}

func readFile(ctx context.Context, helper *ContainerHelper, containerID, filePath string) (string, error) {
	return scannerExec(ctx, helper, containerID, "cat "+shellQuote(filePath))
}

func findFiles(ctx context.Context, helper *ContainerHelper, containerID, root, pattern string) []string {
	output, err := scannerExec(ctx, helper, containerID, fmt.Sprintf("find %s -name %s 2>/dev/null || true", shellQuote(root), shellQuote(pattern)))
	if err != nil || output == "" {
		return nil
	}

	var files []string
	for _, line := range strings.Split(output, "\n") {
		if line = strings.TrimSpace(line); line != "" {
			files = append(files, line)
		}
	}
	return files
}

type packageJSON struct {
	Dependencies    map[string]string `json:"dependencies"`
	DevDependencies map[string]string `json:"devDependencies"`
}

func readPackageJSON(ctx context.Context, helper *ContainerHelper, containerID, filePath string) (*packageJSON, error) {
	content, err := readFile(ctx, helper, containerID, filePath)
	if err != nil {
		return nil, err
	}

	var pkg packageJSON
	if err := json.Unmarshal([]byte(content), &pkg); err != nil {
		return nil, err
	}
	return &pkg, nil
}

func packageHas(pkg *packageJSON, name string) bool {
	if pkg == nil {
		return false
	}
	if _, ok := pkg.Dependencies[name]; ok {
		return true
	}
	_, ok := pkg.DevDependencies[name]
	return ok
}

func detectNextJS(ctx context.Context, helper *ContainerHelper, containerID, repoPath string) bool {
	return FileExists(ctx, helper, containerID, repoPath+"/next.config.js") ||
		FileExists(ctx, helper, containerID, repoPath+"/next.config.ts") ||
		FileExists(ctx, helper, containerID, repoPath+"/next.config.mjs")
}

func detectReact(ctx context.Context, helper *ContainerHelper, containerID, repoPath string) bool {
	pkg, err := readPackageJSON(ctx, helper, containerID, repoPath+"/package.json")
	return err == nil && packageHas(pkg, "react") && !packageHas(pkg, "next")
}

func detectVue(ctx context.Context, helper *ContainerHelper, containerID, repoPath string) bool {
	pkg, err := readPackageJSON(ctx, helper, containerID, repoPath+"/package.json")
	return err == nil && packageHas(pkg, "vue")
}

func detectVanilla(ctx context.Context, helper *ContainerHelper, containerID, repoPath string) bool {
	return FileExists(ctx, helper, containerID, repoPath+"/index.html")
}

func detectRequirementsDependency(ctx context.Context, helper *ContainerHelper, containerID, repoPath, dependency string) bool {
	req := repoPath + "/requirements.txt"
	if !FileExists(ctx, helper, containerID, req) {
		return false
	}

	content, err := readFile(ctx, helper, containerID, req)
	return err == nil && strings.Contains(strings.ToLower(content), strings.ToLower(dependency))
}

func detectFastAPI(ctx context.Context, helper *ContainerHelper, containerID, repoPath string) bool {
	return detectRequirementsDependency(ctx, helper, containerID, repoPath, "fastapi")
}

func detectFlask(ctx context.Context, helper *ContainerHelper, containerID, repoPath string) bool {
	return detectRequirementsDependency(ctx, helper, containerID, repoPath, "flask")
}

func detectExpress(ctx context.Context, helper *ContainerHelper, containerID, repoPath string) bool {
	pkg, err := readPackageJSON(ctx, helper, containerID, repoPath+"/package.json")
	return err == nil && packageHas(pkg, "express")
}

func detectRustActix(ctx context.Context, helper *ContainerHelper, containerID, repoPath string) bool {
	cargo := repoPath + "/Cargo.toml"
	if !FileExists(ctx, helper, containerID, cargo) {
		return false
	}

	content, err := readFile(ctx, helper, containerID, cargo)
	return err == nil && strings.Contains(strings.ToLower(content), "actix")
}

func detectDB(ctx context.Context, helper *ContainerHelper, containerID, repoPath string) string {
	if FileExists(ctx, helper, containerID, repoPath+"/prisma/schema.prisma") {
		return "Prisma"
	}

	if content, err := readFile(ctx, helper, containerID, repoPath+"/requirements.txt"); err == nil {
		content = strings.ToLower(content)
		switch {
		case strings.Contains(content, "sqlalchemy"), strings.Contains(content, "psycopg"), strings.Contains(content, "asyncpg"):
			return "PostgreSQL"
		case strings.Contains(content, "pymongo"):
			return "MongoDB"
		}
	}

	if pkg, err := readPackageJSON(ctx, helper, containerID, repoPath+"/package.json"); err == nil {
		switch {
		case packageHas(pkg, "pg"), packageHas(pkg, "@prisma/client"):
			return "PostgreSQL"
		case packageHas(pkg, "mysql"), packageHas(pkg, "mysql2"):
			return "MySQL"
		case packageHas(pkg, "mongoose"), packageHas(pkg, "mongodb"):
			return "MongoDB"
		case packageHas(pkg, "better-sqlite3"), packageHas(pkg, "sqlite3"):
			return "SQLite"
		}
	}

	return ""
}

func findFrontendRoot(ctx context.Context, helper *ContainerHelper, containerID, repoPath, framework string) string {
	switch framework {
	case "Next.js":
		return repoPath
	case "React":
		if FileExists(ctx, helper, containerID, repoPath+"/package.json") {
			return repoPath
		}
		for _, subdir := range []string{"frontend", "client", "web"} {
			root := repoPath + "/" + subdir
			if FileExists(ctx, helper, containerID, root+"/package.json") {
				return root
			}
		}
	case "Vue":
		if FileExists(ctx, helper, containerID, repoPath+"/package.json") {
			return repoPath
		}
	}
	return repoPath
}

func findBackendRoot(ctx context.Context, helper *ContainerHelper, containerID, repoPath, framework string) string {
	var candidates []string

	switch framework {
	case "FastAPI":
		candidates = []string{"backend/main.py", "api/main.py", "server/main.py", "main.py"}
	case "Express":
		candidates = []string{"backend/index.js", "api/index.js", "server/index.js", "index.js", "server.js"}
	}

	for _, candidate := range candidates {
		if FileExists(ctx, helper, containerID, repoPath+"/"+candidate) {
			dir := path.Dir(candidate)
			if dir == "." {
				return repoPath
			}
			return repoPath + "/" + dir
		}
	}

	if framework == "FastAPI" {
		for _, file := range findFiles(ctx, helper, containerID, repoPath, "main.py") {
			if strings.Contains(file, "node_modules") || strings.Contains(file, ".next") ||
				strings.Contains(file, "dist") || strings.Contains(file, "__pycache__") {
				continue
			}
			return path.Dir(file)
		}
	}

	return ""
}

func extractQuotedValue(s string) string {
	double, single := strings.IndexByte(s, '"'), strings.IndexByte(s, '\'')
	var start int
	var quote byte

	switch {
	case double >= 0 && (single < 0 || double < single):
		start, quote = double, '"'
	case single >= 0:
		start, quote = single, '\''
	default:
		return ""
	}

	rest := s[start+1:]
	end := strings.IndexByte(rest, quote)
	if end < 0 {
		return ""
	}
	return rest[:end]
}

func scanEndpoints(ctx context.Context, helper *ContainerHelper, containerID, repoPath, framework string) []structs.Endpoint {
	var endpoints []structs.Endpoint

	for _, method := range []string{"get", "post", "put", "delete", "patch"} {
		var command string

		if framework == "FastAPI" {
			command = fmt.Sprintf(
				`grep -rnE '@.*\.%s|@app\.%s|@router\.%s' %s --include='*.py' 2>/dev/null || true`,
				method, method, method, shellQuote(repoPath),
			)
		} else {
			command = fmt.Sprintf(
				`grep -rnE 'router\.%s|app\.%s' %s --include='*.js' --include='*.ts' 2>/dev/null || true`,
				method, method, shellQuote(repoPath),
			)
		}

		output, _ := scannerExec(ctx, helper, containerID, command)
		for _, line := range strings.Split(output, "\n") {
			parts := strings.SplitN(line, ":", 3)
			if len(parts) < 3 {
				continue
			}

			route := extractQuotedValue(parts[2])
			if route == "" {
				continue
			}

			file := strings.TrimPrefix(strings.TrimPrefix(parts[0], repoPath), "/")
			endpoints = append(endpoints, structs.Endpoint{
				Method: strings.ToUpper(method),
				Path:   route,
				File:   file,
			})
		}
	}

	return endpoints
}

func scanNextJSPages(ctx context.Context, helper *ContainerHelper, containerID, repoPath string) []structs.Page {
	var pages []structs.Page

	for _, name := range []string{"page.tsx", "page.jsx", "page.ts", "page.js"} {
		for _, file := range findFiles(ctx, helper, containerID, repoPath, name) {
			rel := strings.TrimPrefix(strings.TrimPrefix(file, repoPath), "/")
			parts := strings.Split(rel, "/")

			appIndex := -1
			for i, part := range parts {
				if part == "app" {
					appIndex = i
					break
				}
			}
			if appIndex < 0 {
				continue
			}

			var routeParts []string
			for _, part := range parts[appIndex+1 : len(parts)-1] {
				if strings.HasPrefix(part, "(") && strings.HasSuffix(part, ")") {
					continue
				}
				routeParts = append(routeParts, part)
			}

			route := "/"
			if len(routeParts) > 0 {
				route += strings.Join(routeParts, "/")
			}
			pages = append(pages, structs.Page{Route: route, File: rel})
		}
	}

	return pages
}

func scanReactPages(ctx context.Context, helper *ContainerHelper, containerID, repoPath string) []structs.Page {
	for _, candidate := range []string{
		"Routes.jsx", "Routes.tsx", "Router.jsx", "Router.tsx",
		"App.jsx", "App.tsx", "main.jsx", "main.tsx",
	} {
		files := findFiles(ctx, helper, containerID, repoPath+"/src", candidate)
		if len(files) == 0 {
			continue
		}

		rel := strings.TrimPrefix(strings.TrimPrefix(files[0], repoPath), "/")
		return []structs.Page{{Route: "/", File: rel}}
	}
	return nil
}

func scanVanillaPages(ctx context.Context, helper *ContainerHelper, containerID, repoPath string) []structs.Page {
	var pages []structs.Page

	for _, file := range findFiles(ctx, helper, containerID, repoPath, "*.html") {
		rel := strings.TrimPrefix(strings.TrimPrefix(file, repoPath), "/")
		route := "/" + rel
		if rel == "index.html" {
			route = "/"
		}
		pages = append(pages, structs.Page{Route: route, File: rel})
	}

	return pages
}

var backendMarkers = map[string]bool{
	"routes": true, "routers": true, "controllers": true, "middleware": true,
	"services": true, "models": true, "schemas": true, "db": true,
	"database": true, "migrations": true, "api": true,
}

var frontendMarkers = map[string]bool{
	"components": true, "pages": true, "app": true, "src": true,
	"hooks": true, "styles": true, "layouts": true, "views": true,
	"assets": true, "public": true, "ui": true,
}

func inferContext(rel string) string {
	parts := strings.Split(strings.ReplaceAll(strings.ToLower(rel), "\\", "/"), "/")

	for _, part := range parts {
		if backendMarkers[part] {
			return "backend"
		}
	}
	for _, part := range parts {
		if frontendMarkers[part] {
			return "frontend"
		}
	}
	return "frontend"
}

func inferMeta(name, ext, folder, contextType string) map[string]string {
	meta := map[string]string{}
	name, folder = strings.ToLower(name), strings.ToLower(folder)

	if contextType == "frontend" {
		switch {
		case strings.Contains(name, "hook"), strings.HasPrefix(name, "use"):
			meta["type"] = "hook"
		case strings.Contains(folder, "middleware"), strings.Contains(name, "middleware"):
			meta["type"] = "middleware"
		case strings.Contains(folder, "handler"), strings.Contains(name, "wrapper"):
			meta["type"] = "wrapper"
		case ext == "jsx" || ext == "tsx":
			meta["type"] = "helper"
		}

		switch {
		case strings.Contains(name, "auth"), strings.Contains(folder, "auth"):
			meta["category"] = "auth"
		case strings.Contains(name, "api"), strings.Contains(name, "request"), strings.Contains(name, "http"):
			meta["category"] = "http"
		case strings.Contains(name, "valid"):
			meta["category"] = "validation"
		case strings.Contains(name, "payment"), strings.Contains(name, "stripe"):
			meta["category"] = "payment"
		}

		switch ext {
		case "jsx":
			meta["compatibility"] = "React"
		case "tsx":
			meta["compatibility"] = "Next.js"
		case "vue":
			meta["compatibility"] = "Vue"
		}
	} else if contextType == "backend" {
		switch {
		case strings.Contains(folder, "middleware"), strings.Contains(name, "middleware"):
			meta["type"] = "middleware"
		case strings.Contains(folder, "helper"), strings.Contains(folder, "util"):
			meta["type"] = "helper"
		case strings.Contains(name, "wrapper"):
			meta["type"] = "wrapper"
		}

		switch {
		case strings.Contains(name, "auth"), strings.Contains(folder, "auth"):
			meta["category"] = "auth"
		case strings.Contains(folder, "route"), strings.Contains(folder, "router"):
			meta["category"] = "http"
		case strings.Contains(name, "valid"):
			meta["category"] = "validation"
		}
	}

	if len(meta) == 0 {
		return nil
	}
	return meta
}

type treeNode struct {
	IsDir    bool
	Children map[string]*treeNode
}

func BuildTree(ctx context.Context, helper *ContainerHelper, containerID, rootPath, contextType string) []structs.ProjectGroup {
	exclusions := `\( -path '*/node_modules' -o -path '*/.git' -o -path '*/.next' -o -path '*/dist' -o -path '*/__pycache__' \) -prune -o`

	dirs, _ := scannerExec(ctx, helper, containerID,
		fmt.Sprintf("find %s %s -type d -print 2>/dev/null || true", shellQuote(rootPath), exclusions))
	files, _ := scannerExec(ctx, helper, containerID,
		fmt.Sprintf("find %s %s -type f -print 2>/dev/null || true", shellQuote(rootPath), exclusions))

	root := &treeNode{IsDir: true, Children: map[string]*treeNode{}}

	add := func(full string, isDir bool) {
		full = strings.TrimSpace(full)
		if full == "" || full == rootPath || !strings.HasPrefix(full, rootPath) {
			return
		}

		rel := strings.TrimPrefix(strings.TrimPrefix(full, rootPath), "/")
		if rel == "" {
			return
		}

		node := root
		parts := strings.Split(rel, "/")

		for i, part := range parts {
			child, ok := node.Children[part]
			if !ok {
				child = &treeNode{IsDir: true, Children: map[string]*treeNode{}}
				node.Children[part] = child
			}
			if i == len(parts)-1 {
				child.IsDir = isDir
			}
			node = child
		}
	}

	for _, line := range strings.Split(dirs, "\n") {
		add(line, true)
	}
	for _, line := range strings.Split(files, "\n") {
		add(line, false)
	}

	return treeNodes(root.Children, "", contextType)
}

func treeNodes(nodes map[string]*treeNode, currentPath, contextType string) []structs.ProjectGroup {
	names := make([]string, 0, len(nodes))
	for name := range nodes {
		names = append(names, name)
	}
	sort.Strings(names)

	result := make([]structs.ProjectGroup, 0, len(names))

	for _, name := range names {
		node := nodes[name]
		rel := name
		if currentPath != "" {
			rel = currentPath + "/" + name
		}

		if node.IsDir {
			result = append(result, structs.ProjectGroup{
				Name:     name,
				Filepath: rel,
				Type:     "folder",
				Context:  inferContext(rel),
				Children: treeNodes(node.Children, rel, contextType),
			})
			continue
		}

		stem, ext := name, ""
		if dot := strings.LastIndex(name, "."); dot >= 0 {
			stem, ext = name[:dot], name[dot+1:]
		}

		result = append(result, structs.ProjectGroup{
			Name:     stem,
			Filepath: rel,
			Type:     "file",
			Meta:     inferMeta(stem, ext, currentPath, contextType),
		})
	}

	return result
}

func ScanProject(ctx context.Context, helper *ContainerHelper, containerID, repoPath string) *structs.ScanResult {
	result := &structs.ScanResult{}

	switch {
	case detectNextJS(ctx, helper, containerID, repoPath):
		result.FrontendFramework = "Next.js"
		result.FrontendRoot = findFrontendRoot(ctx, helper, containerID, repoPath, "Next.js")
		result.Pages = scanNextJSPages(ctx, helper, containerID, repoPath)
		result.FrontendGroups = BuildTree(ctx, helper, containerID, result.FrontendRoot, "frontend")

	case detectReact(ctx, helper, containerID, repoPath):
		result.FrontendFramework = "React"
		result.FrontendRoot = findFrontendRoot(ctx, helper, containerID, repoPath, "React")
		result.Pages = scanReactPages(ctx, helper, containerID, result.FrontendRoot)
		result.FrontendGroups = BuildTree(ctx, helper, containerID, result.FrontendRoot, "frontend")

	case detectVue(ctx, helper, containerID, repoPath):
		result.FrontendFramework = "Vue"
		result.FrontendRoot = findFrontendRoot(ctx, helper, containerID, repoPath, "Vue")

	case detectVanilla(ctx, helper, containerID, repoPath):
		result.FrontendFramework = "Vanilla"
		result.FrontendRoot = repoPath
		result.Pages = scanVanillaPages(ctx, helper, containerID, repoPath)
	}

	switch {
	case detectFastAPI(ctx, helper, containerID, repoPath):
		result.BackendFramework = "FastAPI"
		result.BackendRoot = findBackendRoot(ctx, helper, containerID, repoPath, "FastAPI")
		result.Endpoints = scanEndpoints(ctx, helper, containerID, repoPath, "FastAPI")

	case detectFlask(ctx, helper, containerID, repoPath):
		result.BackendFramework = "Flask"

	case detectExpress(ctx, helper, containerID, repoPath):
		result.BackendFramework = "Express"
		result.Endpoints = scanEndpoints(ctx, helper, containerID, repoPath, "Express")

	case detectRustActix(ctx, helper, containerID, repoPath):
		result.BackendFramework = "Actix"
	}

	if result.BackendFramework != "" {
		root := result.BackendRoot
		if root == "" {
			root = repoPath
		}
		result.BackendGroups = BuildTree(ctx, helper, containerID, root, "backend")
	}

	result.DBFramework = detectDB(ctx, helper, containerID, repoPath)
	if result.DBFramework == "" {
		result.DBFramework = "PostgreSQL"
	}

	return result
}
