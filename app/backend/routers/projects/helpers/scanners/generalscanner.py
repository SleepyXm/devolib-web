def _scan_groups(container, repo_path: str, frontend_framework: str | None) -> list:
    """Build default groups based on detected structure."""
    groups = []
 
    if frontend_framework in ("Next.js", "React"):
        components_path = f"{repo_path}/src/components"
        result = container.exec_run(
            f"sh -c 'test -d {components_path} && echo yes'",
            tty=False, detach=False,
        )
        if result.output and result.output.decode().strip() == "yes":
            groups.append({
                "label": "Components",
                "root": "src/components",
                "files": [],
            })
 
    return groups