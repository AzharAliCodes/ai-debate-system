# Instructions for Local Setup

This file contains instructions for modifying the backend to work locally without Emergent dependencies.

## Option 1: Use Standard Google Generative AI (Recommended for Local)

Replace line 10 in server.py:
```python
from emergentintegrations.llm.chat import LlmChat, UserMessage
```

With:
```python
import google.generativeai as genai
```

Then in the interview generation function (around line 234), replace:
```python
chat = LlmChat(
    api_key=os.environ.get('EMERGENT_LLM_KEY'),
    session_id=f"interview-gen-{uuid.uuid4()}",
    system_message="You are an expert job interviewer helping to create interview questions."
).with_model("gemini", "gemini-2.5-flash")

prompt = f"""..."""
user_message = UserMessage(text=prompt)
response = await chat.send_message(user_message)
questions_text = response.strip()
```

With:
```python
genai.configure(api_key=os.environ.get('GOOGLE_GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-1.5-flash')

prompt = f"""..."""
response = model.generate_content(prompt)
questions_text = response.text.strip()
```

Similarly for the feedback generation function (around line 285).

## Option 2: Remove Emergent from requirements.txt

In `/app/backend/requirements.txt`, remove the line:
```
emergentintegrations==0.1.0
```

And add:
```
google-generativeai>=0.3.0
```

Then run:
```bash
pip install -r requirements.txt
```

## For College Project Submission

The local version should use:
- Standard `google-generativeai` library
- Your own free Gemini API key
- Local MongoDB installation
- No Emergent-specific dependencies

This makes your project truly standalone and portable!
