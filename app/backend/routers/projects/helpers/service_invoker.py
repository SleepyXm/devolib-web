import json
import os, tarfile, io, asyncio
from database import database
from helpers.packagemanager.packagemanager import PM_COMMANDS
from helpers.Operations.operations import DBoperations, FileOperations, DependencyOperations


# --------------------------------- DB Command -------------------------------------- #


async def handle_db_command(container, command: dict, q: asyncio.Queue, project_id: str):
    if command['operation'] not in DBoperations:
        raise ValueError(f"Invalid operation: {command['operation']}")

    if command['operation'] in ('GET_SCHEMA', 'PUSH_SCHEMA'):
        await push_schema(container, project_id, q)
        return True
    
    if command['operation'] == 'INSERT_TEST_DATA':
        sql = command.get('sql', '').replace('\n', ' ')
        wrapped = f"BEGIN; {sql} COMMIT;"
        result = container.exec_run(['psql', '-U', 'postgres', '-d', 'myapp', '-c', wrapped])
        if result.exit_code != 0:
            await q.put(f"[✗] Insert failed: {result.output.decode()}\n")
            return False
        await q.put("[✓] Test data inserted\n")
        await push_schema(container, project_id, q)
        return True

    if result.exit_code != 0:
        await q.put(f"[✗] SQL Error: {result.output.decode()}\n")
        return False

    await q.put(f"[✓] Executed: {command['operation']} on {command['target']}\n")
    await push_schema(container, project_id, q)
    return True




# ------------------------------- File Command ----------------------------------------- #

async def handle_file_command(container, command: dict, q: asyncio.Queue):
    if command['type'] not in FileOperations:
        raise ValueError(f"Invalid operation: {command['type']}")

    path = command.get('path')
    if not path:
        await q.put(f"[✗] No path provided\n")
        return False

    if '..' in path:
        await q.put(f"[✗] Invalid path\n")
        return False

    if command['type'] == 'READ_FILE':
        result = container.exec_run(f"cat {path}")
        if result.exit_code != 0:
            await q.put(f"[✗] File not found: {path}\n")
            return False
        await q.put(f"FILE_CONTENT:{result.output.decode()}")
        return True

    if command['type'] == 'WRITE_FILE':
        content = command.get('content', '')
        if not content or not content.strip():
            await q.put(f"[✗] Refused to write empty content to {path}\n")
            return False

        content_bytes = content.encode('utf-8')
        tar_stream = io.BytesIO()
        with tarfile.open(fileobj=tar_stream, mode='w') as tar:
            info = tarfile.TarInfo(name=os.path.basename(path))
            info.size = len(content_bytes)
            tar.addfile(info, io.BytesIO(content_bytes))
        tar_stream.seek(0)
        container.put_archive(path=os.path.dirname(path), data=tar_stream)
        await q.put(json.dumps({"type": "FILE_SAVED", "path": path}))
        return True

    if command['type'] == 'DELETE_FILE':
        result = container.exec_run(f"rm {path}")
        if result.exit_code != 0:
            await q.put(f"[✗] Failed to delete: {path}\n")
            return False
        await q.put(f"[✓] Deleted: {path}\n")
        return True
    

# ------------------------------- Grab Schema ----------------------------------------- #

async def push_schema(container, project_id, q: asyncio.Queue):
    schema_cmd = (
        'su - postgres -c "psql -d myapp -t -A -F\'|\' '
        '-c \\"SELECT table_name, column_name, data_type, is_nullable '
        'FROM information_schema.columns '
        'WHERE table_schema=\'public\' '
        'ORDER BY table_name, ordinal_position;\\""'
    )
    result = container.exec_run(schema_cmd)
    tables = {}
    for line in result.output.decode().strip().split("\n"):
        if not line:
            continue
        table, column, dtype, nullable = line.split("|")
        tables.setdefault(table, []).append({
            "column": column,
            "type": dtype,
            "nullable": nullable == "YES",
        })
    await database.execute(
        """
        UPDATE project_metadata 
        SET db_schema = :schema, updated_at = NOW()
        WHERE project_id = :project_id
        """,
        {"schema": json.dumps(tables), "project_id": project_id}
    )
    await q.put(json.dumps({"type": "DATABASE_SCHEMA", "tables": tables}))


# ------------------------------- Deps Handler ----------------------------------------- #

async def handle_package_command(container, command: dict, q: asyncio.Queue):
    if command['operation'] not in DependencyOperations:
        raise ValueError(f"Invalid operation: {command['operation']}")

    pm = command.get('pm')
    packages = command.get('packages', [])
    dev = command.get('dev', False)

    if not pm or pm not in ('npm', 'pip', 'yarn', 'cargo'):
        await q.put("[✗] Invalid or missing package manager\n")
        return False

    if not packages or not isinstance(packages, list):
        await q.put("[✗] No packages provided\n")
        return False

    # sanitize: package names only, no shell injection
    for pkg in packages:
        if not all(c.isalnum() or c in '-_@/.^~' for c in pkg):
            await q.put(f"[✗] Rejected suspicious package name: {pkg}\n")
            return False

    PM_COMMANDS = {
        'npm':   lambda pkgs, dev: ['npm', 'install', '--save-dev' if dev else '--save'] + pkgs,
        'pip':   lambda pkgs, _:   ['pip', 'install'] + pkgs,
        'yarn':  lambda pkgs, dev: ['yarn', 'add', '--dev' if dev else None] + pkgs if not dev else ['yarn', 'add', '--dev'] + pkgs,
        'cargo': lambda pkgs, dev: ['cargo', 'add'] + (['--dev'] if dev else []) + pkgs,
    }

    cmd = PM_COMMANDS[pm](packages, dev)
    cmd = [c for c in cmd if c is not None]  # strip None from yarn non-dev

    await q.put(f"→ {' '.join(cmd)}\n")
    await q.put(json.dumps({"type": "INSTALL_STARTED", "pm": pm, "packages": packages}))

    exec_result = container.exec_run(cmd, workdir='/app', stream=True)

    loop = asyncio.get_event_loop()
    read_queue = asyncio.Queue()

    def read_stream():
        for chunk in exec_result.output:
            lines = chunk.decode('utf-8', errors='replace').splitlines()
            for line in lines:
                if line.strip():
                    loop.call_soon_threadsafe(read_queue.put_nowait, line)
        loop.call_soon_threadsafe(read_queue.put_nowait, None)  # sentinel

    loop.run_in_executor(None, read_stream)

    while True:
        line = await read_queue.get()
        if line is None:
            break
        await q.put(f"  {line}\n")

    # stream=True doesn't give us exit_code until after iteration
    exit_code = exec_result.exit_code
    if exit_code != 0:
        await q.put(f"[✗] Install failed (exit {exit_code})\n")
        await q.put(json.dumps({"type": "INSTALL_DONE", "success": False}))
        return False

    await q.put(f"[✓] Installed {len(packages)} package(s) via {pm}\n")
    await q.put(json.dumps({"type": "INSTALL_DONE", "success": True}))
    return True