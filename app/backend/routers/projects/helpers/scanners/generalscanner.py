def _scan_groups(container, repo_path: str, frontend_framework: str | None) -> list:
    result = container.exec_run(
        f"find {repo_path} "
        r"-not \( -path '*/node_modules/*' -o -path '*/.git/*' "
        r"-o -path '*/.next/*' -o -path '*/dist/*' -o -path '*/__pycache__/*' \) "
        r"-type f",
        tty=False, detach=False,
    )

    if not result.output:
        return []

    files_by_dir: dict[str, list] = {}

    for path in result.output.decode().strip().splitlines():
        path = path.strip()
        if not path.startswith(repo_path):
            continue
        rel = path[len(repo_path):].lstrip("/")
        if not rel:
            continue

        parent = "/".join(rel.split("/")[:-1]) or ""
        filename = rel.split("/")[-1]

        if parent not in files_by_dir:
            files_by_dir[parent] = []

        files_by_dir[parent].append({
            "name": filename.rsplit(".", 1)[0],
            "filepath": filename,
            "meta": {
                "extension": filename.rsplit(".", 1)[-1] if "." in filename else "",
            }
        })

    groups = []
    for dir_rel in sorted(files_by_dir.keys()):
        if dir_rel == "":
            continue
        label = dir_rel.split("/")[-1].replace("-", " ").replace("_", " ").title()
        groups.append({
            "label": label,
            "root": dir_rel,
            "files": files_by_dir.get(dir_rel, []),
        })

    return groups