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
