import json
from fastapi import WebSocket
import tempfile, os, tarfile, io
from database import database
import asyncio
from helpers.packagemanager.packagemanager import PM_COMMANDS

DBoperations = {
    'CREATE_TABLE', 
    'DROP_TABLE',
    'ALTER_TABLE',
    'INSERT',
    'UPDATE',
    'CHANGE_COLUMN_TYPE',
    'DELETE',
    'GET_SCHEMA',
    'PUSH_SCHEMA'
}

FileOperations = {
    'READ_FILE',
    'WRITE_FILE',
    'SAVE_CHANGES',
    'UNDO_CHANGES',
    'DELETE_FILE',
}

DependencyOperations = {
    'INSTALL_PACKAGES',
    'REMOVE_PACKAGE',
    'UPGRADE'
}


async def handle_db_command(container, command: dict, q: asyncio.Queue, project_id: str):
    if command['operation'] not in DBoperations:
        raise ValueError(f"Invalid operation: {command['operation']}")

    if command['operation'] in ('GET_SCHEMA', 'PUSH_SCHEMA'):
        await push_schema(container, project_id, q)
        return True

    sql = command['sql']
    result = container.exec_run(['su', '-', 'postgres', '-c', f"psql -d myapp -c \"{sql}\""])

    if result.exit_code != 0:
        await q.put(f"[✗] SQL Error: {result.output.decode()}\n")
        return False

    await q.put(f"[✓] Executed: {command['operation']} on {command['target']}\n")
    await push_schema(container, project_id, q)
    return True


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

    cmd = PM_COMMANDS[pm](packages, dev)
    cmd = [c for c in cmd if c is not None]

    await q.put(f"→ {' '.join(cmd)}\n")

    result = container.exec_run(cmd, workdir='/app')

    output = result.output.decode('utf-8', errors='replace')
    for line in output.splitlines():
        if line.strip():
            await q.put(f"  {line}\n")

    if result.exit_code != 0:
        await q.put(f"[✗] Install failed (exit {result.exit_code})\n")
        return False

    await q.put(f"[✓] Installed {len(packages)} package(s) via {pm}\n")
    return True