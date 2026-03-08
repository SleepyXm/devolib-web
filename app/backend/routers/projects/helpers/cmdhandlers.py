import os

def handle_shell_command(container, cmd: str, current_dir: str) -> tuple[str, str]:
    """Handle regular shell commands"""
    result = container.exec_run(f"bash -c 'cd {current_dir} && {cmd}'", demux=True)
    stdout, stderr = result.output
    output = ""
    if stdout:
        output += stdout.decode()
    if stderr:
        output += stderr.decode()
    return output, current_dir

def handle_cd_command(cmd: str, current_dir: str) -> tuple[str, str]:
    """Handle directory change commands"""
    target = cmd[3:].strip()
    new_dir = os.path.normpath(os.path.join(current_dir, target))
    return f"Changed directory to {new_dir}\n", new_dir