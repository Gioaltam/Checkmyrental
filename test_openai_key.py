import os
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables
load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
print(f"Testing OpenAI API key: {api_key[:20]}...{api_key[-10:]}")

try:
    client = OpenAI(api_key=api_key)

    # Make a simple test request
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "user", "content": "Say 'API key is working!' if you receive this message."}
        ],
        max_tokens=20
    )

    print("\n✓ API Key is valid and working!")
    print(f"Response: {response.choices[0].message.content}")
    print(f"Model used: {response.model}")

except Exception as e:
    print(f"\n✗ API Key test failed!")
    print(f"Error: {str(e)}")
