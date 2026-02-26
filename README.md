# FinMentor AI

FinMentor AI is a comprehensive AI-powered financial platform designed to provide personalized financial advising, learning resources, portfolio analysis, and market intelligence all in one place.

## Features

- **AI Financial Advisor**: Get personalized financial advice and interact with an intelligent chatbot for your finance queries.
- **User Authentication**: Secure signup and login powered by Supabase.
- **Dashboard**: A central hub to monitor your financial activities and progress.
- **Financial Learning Modules**: Structured educational content to improve your financial literacy.
- **Portfolio Analyzer**: Tools to evaluate and analyze your investment portfolio.
- **Stock Prediction**: AI-driven insights and predictions for various stocks.
- **News Intelligence**: Curated, up-to-date financial news and market intelligence.
- **Community Forum**: Connect with other users to discuss financial topics and strategies.
- **Gamification Leaderboard**: Track your learning progress and compete with others on the platform.

## Technology Stack

- **Frontend Framework**: React 18 with Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS & shadcn/ui (based on Radix UI)
- **Routing**: React Router DOM
- **Backend & Authentication**: Supabase
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Data Fetching**: React Query (@tanstack/react-query)

## Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) and npm installed on your machine.

### Installation

1. Clone the repository:
   ```bash
   git clone <YOUR_GIT_URL>
   ```

2. Navigate into the project directory:
   ```bash
   cd finmentor-ai
   ```

3. Install the dependencies:
   ```bash
   npm install
   ```

### Running Locally

To start the development server, run:
```bash
npm run dev
```

The application will be available at `http://localhost:8080/` (or another port if 8080 is in use).

To create a production build, run:
```bash
npm run build
```
This will generate the compiled output in the `dist` folder.

## API Configuration Setup

NexusFin requires multiple API keys and environment variables to function correctly across both frontend and backend edge functions.

### 1) Required API Keys

| Environment Variable | Description |
| :--- | :--- |
| `VITE_SUPABASE_URL` | **Database URL:** Your public Supabase project URL for the database and authentication layers. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **JWT Secret/Anon Key:** Publicly safe anon key used to interact with your Supabase backend from the browser. |
| `MARKET_DATA_API_KEY` | *(Optional/Future)* **Market Data API:** Used if migrating from the mock/simulated data to live historical tick data (e.g., Alpaca or Yahoo Finance APIs). |
| `NEWS_API_KEY` | *(Optional/Future)* **News API:** Fetches live news articles before they are piped into the sentiment engine. |
| `LOVABLE_API_KEY` | **LLM & Sentiment AI Key:** The proxy API key used inside the Supabase Edge functions to orchestrate Google Gemini outputs. |

### 2) `.env` Example File Template

Create a `.env` file in the root directory (for the Vite frontend architecture) and load your edge Secrets directly into Supabase. Here is a master template outlining everything required:

```env
# ====== Frontend Application (.env) ======
VITE_SUPABASE_PROJECT_ID="your_project_id"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1Ni... (your anon key)"
VITE_SUPABASE_URL="https://your_project_id.supabase.co"

# ====== Supabase Edge Functions / Backend (.env) ======
# DO NOT EXPOSE TO FRONTEND
LOVABLE_API_KEY="sk-lovable-..."
MARKET_DATA_API_KEY="sk-market-..."
NEWS_API_KEY="sk-news-..."
```

### 3) Security Best Practices

To maintain data integrity and project security in production, you must adhere strictly to the following rules:
- **Do not commit API keys:** Ensure your `.env` files are added to `.gitignore`. Never commit or push them to your repository or public environments.
- **Use Environment Variables:** Hardcode absolutely zero logic keys; load them natively into the execution environments via `import.meta.env` (Vite) or `process.env / Deno.env.get` (Edge computing structures).
- **Backend-Only Exposure:** The critical LLM keys (like `LOVABLE_API_KEY`) and theoretical live Market Data keys MUST only exist on the backend layers (Supabase Edge functions) so they cannot be harvested by a malicious client inspecting network requests.
- **Rate-Limiting Protection:** Ensure production backend triggers gracefully handle `429 Too Many Requests` API status codes. Edge functions should currently return user-friendly UI errors when LLM credits or limits are reached to deter abuse.

### 4) Local Configuration Instructions

1.  **Duplicate the Template:** Copy the `.env` example block outlined above into a file explicitly named `.env` in the root of your project.
2.  **Hydrate Keys:** Fill out your assigned Supabase credentials and generate LLM API proxy keys.
3.  **Local Edge Servicing:** If testing Edge functions locally and mocking live functionality, load your backend secrets using: `npx supabase functions serve --env-file ./supabase/.env`.
4.  **Backend Secrecy:** For deploying to production, upload the backend keys using the Supabase CLI: `npx supabase secrets set LOVABLE_API_KEY=sk-your-key`.
5.  **Restart Server:** If updating frontend keys, stop your current node UI server (`Ctrl+C`) and run `npm run dev` to ingest the new environment settings into your local instance context.
