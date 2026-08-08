package handlers

import (
	"context"
	"devolib/structs"
	"strings"
)

func buildProjectGroups(
	ctx context.Context,
	helper *ContainerHelper,
	containerID, projectName string,
	frontendServices, backendServices []string,
	scan *structs.ScanResult,
) []structs.ProjectGroup {
	var groups []structs.ProjectGroup

	if scan != nil {
		if len(scan.FrontendGroups) > 0 {
			filepath := strings.Trim(strings.TrimPrefix(scan.FrontendRoot, "/app/workspace/"), "/")
			if filepath == "" {
				filepath = "frontend"
			}

			groups = append(groups, structs.ProjectGroup{
				Name: "frontend", Type: "folder", Context: "frontend",
				Filepath: filepath, Children: scan.FrontendGroups,
			})
		}

		if len(scan.BackendGroups) > 0 {
			filepath := strings.Trim(strings.TrimPrefix(scan.BackendRoot, "/app/workspace/"), "/")
			if filepath == "" {
				filepath = "backend"
			}

			groups = append(groups, structs.ProjectGroup{
				Name: "backend", Type: "folder", Context: "backend",
				Filepath: filepath, Children: scan.BackendGroups,
			})
		}

		return groups
	}

	if len(frontendServices) > 0 {
		groups = append(groups, structs.ProjectGroup{
			Name: "frontend", Type: "folder", Context: "frontend", Filepath: "frontend",
			Children: BuildTree(ctx, helper, containerID,
				"/app/workspace/frontend/"+projectName, "frontend"),
		})
	}

	if len(backendServices) > 0 {
		groups = append(groups, structs.ProjectGroup{
			Name: "backend", Type: "folder", Context: "backend", Filepath: "backend",
			Children: BuildTree(ctx, helper, containerID,
				"/app/workspace/backend", "backend"),
		})
	}

	return groups
}
