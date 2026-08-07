package handlers

import "fmt"

// TraefikLabels returns Traefik routing labels for a project container.
func TraefikLabels(projectID, cleanName string, frontendPort int) map[string]string {
	return map[string]string{
		"traefik.enable": "true",
		fmt.Sprintf("traefik.http.routers.%s.rule", projectID):                                                                  fmt.Sprintf("Host(`%s.localhost`)", cleanName),
		fmt.Sprintf("traefik.http.services.%s.loadbalancer.server.port", projectID):                                             fmt.Sprintf("%d", frontendPort),
		fmt.Sprintf("traefik.http.routers.%s.middlewares", projectID):                                                           fmt.Sprintf("%s-headers", projectID),
		fmt.Sprintf("traefik.http.middlewares.%s-headers.headers.customResponseHeaders.Access-Control-Allow-Origin", projectID): "*",
		fmt.Sprintf("traefik.http.middlewares.%s-headers.headers.customResponseHeaders.X-Frame-Options", projectID):             "ALLOWALL",
		fmt.Sprintf("traefik.http.middlewares.%s-headers.headers.customResponseHeaders.Content-Security-Policy", projectID):     "frame-ancestors *",
	}
}

// DevolibLabels returns internal devolib metadata labels for a project container.
func DevolibLabels(projectID, projectName, baseType string, backendServices, frontendServices, db []string) map[string]string {
	return map[string]string{
		"devolib.project_id":        projectID,
		"devolib.project_name":      projectName,
		"devolib.base":              baseType,
		"devolib.backend_services":  joinStrings(backendServices),
		"devolib.frontend_services": joinStrings(frontendServices),
		"devolib.db_services":       joinStrings(db),
	}
}

func joinStrings(s []string) string {
	result := ""
	for i, v := range s {
		if i > 0 {
			result += ","
		}
		result += v
	}
	return result
}
