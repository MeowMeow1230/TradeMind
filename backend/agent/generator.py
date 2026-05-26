from anthropic import Anthropic
from knowledge.system_prompt import SYSTEM_PROMPT
from .parser import extract_code_block
import os

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY", ""))

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

    response = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=2048,
        temperature=0.2,
        messages=messages,
    )

    full_text = response.content[0].text
    code = extract_code_block(full_text)

    return code, full_text
