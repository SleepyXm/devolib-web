from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import os, re, json
from helpers.limiter import limiter
from schemas import MessageInput, SchemaInput, TestInput

load_dotenv()

router = APIRouter()

client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)


def extract_html_from_response(response: str) -> str | None:
    match = re.search(r'```html\n([\s\S]*?)```', response)
    return match.group(1).strip() if match else None

@router.post("/chat")
@limiter.limit("10/minute")
def get_ai_response(request: Request, data: MessageInput):
    messages = [
        {
            "role": "system",
            "content": """
You are a UI design assistant for Devolib, a design editor.

When generating components, always wrap your HTML in markdown code blocks:
\`\`\`html
<!-- your component here -->
\`\`\`

Always include data-ref on the root element following: {component}-{variant}-{source}
- component: the type of component e.g. button, input, form, card
- variant: the style variant e.g. default, primary, ghost, destructive
- source: the author or framework e.g. devolib, vite, or the user's name

Only use valid Tailwind classes. Never use inline styles unless a gradient requires it.
Only generate a single component, never a full page or document-level wrapper.
Only output HTML when the user explicitly asks for a component or UI element and do not insert code comments.
You can talk naturally outside of code blocks.
"""
        },
        {
            "role": "user",
            "content": data.user_input
        }
    ]

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            stream=True
        )
        assistant_response = ""
        for chunk in response:
            delta = chunk.choices[0].delta.content
            if delta is not None:
                assistant_response += delta

        return {
            "response": assistant_response,
            "code": extract_html_from_response(assistant_response)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

def extract_sql_from_response(response: str) -> str:
    # try to extract from code block first
    match = re.search(r'```sql\n([\s\S]*?)```', response)
    if match:
        return match.group(1).strip()
    # fallback — strip any lines that don't look like SQL
    lines = [l for l in response.splitlines() if l.strip() and l.strip().upper().startswith(("INSERT", "UPDATE", "DELETE", "BEGIN", "COMMIT"))]
    return "\n".join(lines)

@router.post("/generate-test-data")
@limiter.limit("10/minute")
async def generate_test_data(request: Request, data: SchemaInput):
    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {
                    "role": "system",
                    "content": "You are a SQL assistant. Return only raw SQL INSERT statements, no markdown, no code blocks, no slash N no explanation."
                },
                {
                    "role": "user",
                    "content": f"Generate 4 realistic rows per table for this PostgreSQL schema:\n{json.dumps(data.schema, indent=2)}\n\nRules:\n- Skip id/serial columns\n- Respect column types and nullable constraints\n- Use realistic values based on column names"
                }
            ]
        )
        sql = response.choices[0].message.content.strip()
        sql = extract_sql_from_response(sql).replace('\\n', ' ')
        return { "sql": sql }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/generate-tests")
@limiter.limit("10/minute")
async def generate_tests(request: Request, data: TestInput):
    endpoint_list = "\n".join(
        f"{ep['method'].upper()} {ep['path']}" for ep in data.endpoints
    )

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {
                    "role": "system",
                    "content": """You are a FastAPI test generator. Given a list of endpoints, generate one test per endpoint.
Return ONLY a JSON array. Each object must have:
- id: snake_case string e.g. "test_get_health"
- name: human readable e.g. "GET /api/health returns 200"
- endpoint: the path e.g. "/api/health"
- method: HTTP method uppercase
- description: one sentence
- payload: realistic JSON object for POST/PUT/PATCH, null for GET/DELETE
No markdown. No prose. No backticks. Pure JSON array only."""
                },
                {
                    "role": "user",
                    "content": f"Endpoints:\n{endpoint_list}"
                }
            ]
        )
        raw = response.choices[0].message.content.strip()
        tests = json.loads(raw.replace("```json", "").replace("```", "").strip())
        return { "tests": tests }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))