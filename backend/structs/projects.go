package structs

import "time"

type Service struct {
	Name      string `json:"name"`
	Framework string `json:"framework"`
}

type Project struct {
	ID          string     `json:"project_id"`
	Name        string     `json:"name"`
	Status      string     `json:"status"`
	ContainerID string     `json:"container_id"`
	CreatedAt   time.Time  `json:"created_at"`
	LastOnline  *time.Time `json:"last_online"`
	Services    []Service  `json:"services"`
}

type CreateProjectRequest struct {
	Name      string `json:"name"`
	Backend   string `json:"backend"`
	Frontend  string `json:"frontend"`
	Database  string `json:"db"`
	ImportURL string `json:"import_url"`
	Envs      []Env  `json:"envs"`
}

type Env struct {
	Key      string `json:"key"`
	Value    string `json:"value"`
	IsSecret bool   `json:"is_secret"`
}

type Page struct {
	Route string `json:"route"`
	File  string `json:"file"`
}

type Endpoint struct {
	Method string `json:"method"`
	Path   string `json:"path"`
	File   string `json:"file"`
}

type ProjectGroup struct {
	Name     string            `json:"name"`
	Type     string            `json:"type"`
	Context  string            `json:"context,omitempty"`
	Filepath string            `json:"filepath"`
	Meta     map[string]string `json:"meta,omitempty"`
	Children []ProjectGroup    `json:"children,omitempty"`
}

type ScaffoldResult struct {
	Pages     []Page     `json:"pages"`
	Endpoints []Endpoint `json:"endpoints"`
}

type ScanResult struct {
	FrontendRoot      string
	BackendRoot       string
	DBRoot            string
	FrontendFramework string
	BackendFramework  string
	DBFramework       string
	Pages             []Page
	Endpoints         []Endpoint
	FrontendGroups    []ProjectGroup
	BackendGroups     []ProjectGroup
}
