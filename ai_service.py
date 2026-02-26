from groq import Groq
import os
import json

# Ensure you have installed the groq package:
# pip install groq

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def generate_structured_response(system_prompt: str, user_prompt: str):
    """
    Calls the Groq LLM API and enforces a structured JSON payload response.
    Model: llama3-70b-8192
    """
    try:
        response = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.2,
            response_format={"type": "json_object"} # Force JSON mode on Groq
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Groq API Error: {e}")
        # Deterministic Fallback Mode
        return {
            "summary": "Fallback Mode Active: The AI service is currently unavailable.",
            "risk_analysis": "Cannot perform live analysis. Deterministic calculations still verify portfolio metrics.",
            "strategy": "Please check your GROQ_API_KEY or connection.",
            "confidence": "Low"
        }

if __name__ == "__main__":
    # Example deterministic structured input being passed completely calculated from backend
    mock_input_from_backend = {
        "portfolio_beta": 1.18,
        "risk_score": 1.5,
        "sector_exposure": {"tech": 44, "finance": 12},
        "sentiment_score": -0.7,
        "impact_score": 73,
        "projected_drawdown": -2.4
    }

    strict_prompt = """You are a financial reasoning engine. 
Use ONLY the numeric values provided in the JSON input. 
Do NOT invent or modify numbers. 
Do NOT calculate new values. 
Only interpret and explain the data.
MUST Return valid JSON matching: {"summary": "", "risk_analysis": "", "strategy": "", "confidence": ""}."""

    res = generate_structured_response(
        system_prompt=strict_prompt, 
        user_prompt=json.dumps(mock_input_from_backend)
    )
    
    print(json.dumps(res, indent=2))
