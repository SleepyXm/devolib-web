from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
import os, re
from helpers.limiter import limiter

load_dotenv()

router = APIRouter()

client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url="https://api.deepseek.com"
)


class MessageInput(BaseModel):
    user_input: str

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
Only output HTML when the user explicitly asks for a component or UI element.
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
            stream=False
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