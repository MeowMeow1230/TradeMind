import os
from dotenv import load_dotenv
load_dotenv()

from openai import OpenAI
from knowledge.system_prompt import SYSTEM_PROMPT
from .parser import extract_code_block

client = OpenAI(
    api_key=os.environ.get("DEEPSEEK_API_KEY", ""),
    base_url="https://api.deepseek.com",
    timeout=60.0,
)


def generate_strategy(user_message: str, conversation_history: list[dict] | None = None) -> tuple[str, str]:
    """Generate a trading strategy Python script from user's description.

    Returns (code: str, full_response: str).
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    if conversation_history:
        messages.extend(conversation_history)

    prompt = f"""The user wants to create a trading strategy. Generate Python code that implements their strategy.

User's description: "{user_message}"

Output ONLY the Python code in a markdown code block. No explanations before the code."""

    messages.append({"role": "user", "content": prompt})

    response = client.chat.completions.create(
        model="deepseek-chat",
        max_tokens=2048,
        temperature=0.2,
        messages=messages,
    )

    full_text = response.choices[0].message.content
    code = extract_code_block(full_text)

    return code, full_text
