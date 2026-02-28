import json
from fastapi import WebSocket
import tempfile, os, tarfile, io
from database import database

DBoperations = {
    'CREATE_TABLE', 
    'DROP_TABLE',
    'ALTER_TABLE',
    'INSERT',
    'UPDATE',
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


async def handle_db_command(container, command: dict, websocket: WebSocket, project_id: str):
    """Handle database operations"""
    if command['operation'] not in DBoperations:
        raise ValueError(f"Invalid operation: {command['operation']}")

    if command['operation'] in ('GET_SCHEMA', 'PUSH_SCHEMA'):
        await push_schema(container, project_id, websocket)
        return True
    
    sql = command['sql']
    
    # Execute in container
    result = container.exec_run([
        'su', '-', 'postgres', '-c',
        f"psql -d myapp -c \"{sql}\""
    ])
    
    if result.exit_code != 0:
        await websocket.send_text(f"[✗] SQL Error: {result.output.decode()}\n")
        return False
    
    await websocket.send_text(f"[✓] Executed: {command['operation']} on {command['target']}\n")
    await push_schema(container, project_id, websocket)
    return True


async def handle_file_command(container, command: dict, websocket: WebSocket):
    """Handle file operations"""
    if command['type'] not in FileOperations:
        raise ValueError(f"Invalid operation: {command['type']}")
    
    path = command.get('path')
    if not path:
        await websocket.send_text(f"[✗] No path provided\n")
        return False

    # Sanitize path - prevent path traversal
    if '..' in path:
        await websocket.send_text(f"[✗] Invalid path\n")
        return False

    if command['type'] == 'READ_FILE':
        result = container.exec_run(f"cat {path}")
        if result.exit_code != 0:
            await websocket.send_text(f"[✗] File not found: {path}\n")
            return False
        content = result.output.decode()
        await websocket.send_text(f"FILE_CONTENT:{content}")
        return True

    if command['type'] == 'WRITE_FILE':
        content = command.get('content', '')
    
        if not content or not content.strip():
            await websocket.send_text(f"[✗] Refused to write empty content to {path}\n")
            return False
    
        content_bytes = content.encode('utf-8')
        tar_stream = io.BytesIO()
    
        with tarfile.open(fileobj=tar_stream, mode='w') as tar:
            info = tarfile.TarInfo(name=os.path.basename(path))
            info.size = len(content_bytes)
            tar.addfile(info, io.BytesIO(content_bytes))
    
        tar_stream.seek(0)
    
        container.put_archive(
            path=os.path.dirname(path),
            data=tar_stream
        )
    
        await websocket.send_json({
            "type": "FILE_SAVED",
            "path": path
        })
        return True

    if command['type'] == 'DELETE_FILE':
        result = container.exec_run(f"rm {path}")
        if result.exit_code != 0:
            await websocket.send_text(f"[✗] Failed to delete: {path}\n")
            return False
        await websocket.send_text(f"[✓] Deleted: {path}\n")
        return True
    

async def push_schema(container, project_id, websocket):
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

    await websocket.send_json({"type": "DATABASE_SCHEMA", "tables": tables})