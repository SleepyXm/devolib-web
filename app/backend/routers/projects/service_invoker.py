from fastapi import WebSocket

DBoperations = {
    'CREATE_TABLE', 
    'DROP_TABLE',
    'ALTER_TABLE',
    'INSERT',
    'UPDATE',
    'DELETE',
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
