from fastapi import WebSocket
import tempfile, os, tarfile, io

DBoperations = {
    'CREATE_TABLE', 
    'DROP_TABLE',
    'ALTER_TABLE',
    'INSERT',
    'UPDATE',
    'DELETE',
}

FileOperations = {
    'READ_FILE',
    'WRITE_FILE',
    'SAVE_CHANGES',
    'UNDO_CHANGES',
    'DELETE_FILE',
}


async def handle_db_command(container, command: dict, websocket: WebSocket):
    """Handle database operations"""
    if command['operation'] not in DBoperations:
        raise ValueError(f"Invalid operation: {command['operation']}")
    
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
