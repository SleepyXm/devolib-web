def _exec(container, cmd: str) -> str:
    """Run a command in the container and return stdout as a string."""
    result = container.exec_run(f"sh -c '{cmd}'", tty=False, detach=False)
    return result.output.decode("utf-8", errors="ignore").strip() if result.output else ""
 
 
def _file_exists(container, path: str) -> bool:
    result = container.exec_run(f"sh -c 'test -f {path} && echo yes'", tty=False, detach=False)
    return result.output.decode("utf-8", errors="ignore").strip() == "yes"
 
 
def _read_file(container, path: str) -> str:
    return _exec(container, f"cat {path}")
 
 
def _find_files(container, root: str, pattern: str) -> list[str]:
    """Find files matching a pattern under root, return list of paths."""
    out = _exec(container, f"find {root} -name '{pattern}' 2>/dev/null")
    return [line for line in out.splitlines() if line.strip()]
 