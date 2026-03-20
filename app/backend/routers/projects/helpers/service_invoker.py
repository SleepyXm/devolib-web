import json
import os, tarfile, io, asyncio
from database import database
from helpers.packagemanager.packagemanager import PM_COMMANDS
from helpers.Operations.operations import DBoperations, FileOperations, DependencyOperations, GeneralOperations


# --------------------------------- DB Command -------------------------------------- #


async def handle_db_command(container, command: dict, q: asyncio.Queue, project_id: str):
    if command['operation'] not in DBoperations:
        raise ValueError(f"Invalid operation: {command['operation']}")

    if command['operation'] in ('GET_SCHEMA', 'PUSH_SCHEMA'):
        await push_schema(container, project_id, q)
        return True

    if command['operation'] == 'GET_ROWS':
        table = command.get('target')
        result = container.exec_run(['psql', '-U', 'postgres', '-d', 'myapp', '-A', '-F', '|', '-c', f'SELECT * FROM {table};'])
        if result.exit_code != 0:
            await q.put(f"[✗] Query failed: {result.output.decode()}\n")
            return False
        lines = result.output.decode().strip().split('\n')
        headers = lines[0].split('|')
        rows = [dict(zip(headers, line.split('|'))) for line in lines[1:] if line]
        await q.put(json.dumps({ "type": "GET_ROWS", "table": table, "rows": rows }))
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
    
    sql = command.get('sql', '').replace('\n', ' ')
    result = container.exec_run(['psql', '-U', 'postgres', '-d', 'myapp', '-c', sql])

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
        await q.put(json.dumps({"type": "FILE_CONTENT", "path": path, "content": result.output.decode()}))
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

    foreignkey_cmd = (
        'su - postgres -c "psql -d myapp -t -A -F\'|\' '
        '-c \\"SELECT kcu.table_name, kcu.column_name, ccu.table_name, ccu.column_name '
        'FROM information_schema.table_constraints tc '
        'JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name '
        'JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name '
        'WHERE tc.constraint_type = \'FOREIGN KEY\';\\""'
    )
    foreignkey_result = container.exec_run(foreignkey_cmd)

    foreign_keys = {}
    for line in foreignkey_result.output.decode().strip().split("\n"):
        if not line:
            continue
        parts = line.split("|")
        if len(parts) != 4:
            continue
        table, column, ref_table, ref_column = parts
        foreign_keys.setdefault(table, {})[column] = {
            "referencedTable": ref_table,
            "referencedColumn": ref_column
        }

    tables = {}
    for line in result.output.decode().strip().split("\n"):
        if not line:
            continue
        table, column, dtype, nullable = line.split("|")
        tables.setdefault(table, []).append({
            "column": column,
            "type": dtype,
            "nullable": nullable == "YES",
            "foreignKey": foreign_keys.get(table, {}).get(column)
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


# --------------- General Operations ----------------- #
async def handle_general_commands(container, command: dict, q: asyncio.Queue):
    if command['type'] == 'CURL':
        method = command.get('method', 'GET')
        path = command.get('path')
        payload = command.get('payload')

        curl_cmd = ['curl', '-s', '-o', '-', '-w', '%{http_code}',
                    f'http://localhost:8000{path}']

        if method != 'GET' and payload:
            curl_cmd += ['-X', method, '-H', 'Content-Type: application/json',
                         '-d', json.dumps(payload)]

        result = container.exec_run(curl_cmd)
        output = result.output.decode()
        status_code = output[-3:]
        body = output[:-3]

        await q.put(json.dumps({
            "type": "CURL",
            "test_id": command.get('test_id'),
            "status_code": status_code,
            "body": body
        }))