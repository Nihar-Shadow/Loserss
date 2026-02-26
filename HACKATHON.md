# NexusFin: Next-Gen AI Financial Advisor & Learning Platform

## 1. Project Overview
NexusFin is a comprehensive, gamified, and AI-driven personal finance ecosystem. It bridges the gap between financial literacy and active market participation by providing an intuitive platform where users can learn finance fundamentals, analyze real-world portfolios, predict stock movements against an AI adversary, and interact with a contextual AI Strategy Advisor. The project transforms stagnant financial data into an active playground for growth and wealth management.

## 2. Problem Statement Alignment
Retail investors and financial novices face massive barriers to entry in modern markets. Traditional educational resources are purely theoretical, while actual brokerage tools are overwhelmingly complex and detached from the learning process. Furthermore, analyzing news sentiment or seeking personalized strategy advice traditionally requires expensive platforms or human advisors.

**NexusFin solves this by:**
- Integrating interactive, module-based learning with simulated market activities.
- Providing institutional-grade AI analysis (sentiment breakdowns, technical indicator processing) to retail users in plain English.
- Contextualizing advice uniquely to a user's uploaded portfolio and risk tolerance.

## 3. System Architecture
NexusFin employs a modern, serverless, decoupled architecture prioritizing speed and scalability:

*   **Presentation Layer (Frontend):** React 18 built with Vite for sub-second hot module replacement. UI is constructed using Tailwind CSS and shadcn/ui (Radix) for accessible, highly customizable, and performant components. Animations are powered by Framer Motion.
*   **API & Compute Layer (Serverless Edge Functions):** Instead of a traditional monolithic Node.js backend, complex AI logic (Prediction analysis, News sentiment generation, Chat strategy) is offloaded to Supabase Edge Functions (Deno). This ensures infinite scale, minimal latency, and robust API key security.
*   **Database & Auth Layer:** Supabase provides fully managed PostgreSQL databases with Row Level Security (RLS) policies. Authentication handles both traditional Email/Password and Web3 (MetaMask signature) flows.

## 4. Tech Stack Justification
*   **React + Vite:** Chosen for lightning-fast build times, exceptional developer experience (DX), and a massive ecosystem of libraries tailored for interactive dashboards.
*   **TypeScript:** Essential for a financial application to ensure strict type safety, predictable state shaping across complex AI JSON payloads, and reduction of runtime errors.
*   **Supabase (PostgreSQL + Auth + Edge Functions):** Offers an all-in-one Backend-as-a-Service (BaaS) with real-time capabilities (used in the Community Chat) and secure edge-compute environments for our integration with LLMs.
*   **Tailwind CSS + shadcn/ui:** Enables rapid, design-system-first UI development without the bloat of traditional component libraries. Allows for bespoke, "glassmorphism" financial interfaces.
*   **Recharts:** A lightweight, composable charting library perfect for rendering dynamic portfolio allocations (Pie) and stock price actions (Area/Line) on the fly.

## 5. Module Descriptions

### Authentication
A highly secure, dual-path authentication system. Users can onboard via standard Email/Password authentication or utilize Web3 capabilities (MetaMask) to sign nonces, proving wallet ownership natively. Both paths hook into Supabase Auth for unified session management.

### Learning Module
A gamified finance academy. Users progress through structured courses (Beginner, Intermediate, Advanced). Completion unlocks XP, badges, and streaks. Progress is persisted perfectly to PostgreSQL allowing continuous engagement across sessions.

### Prediction Playground
An interactive arena where users guess 30-day stock movements against an AI model. The AI returns a structured analysis (Direction, Confidence %, Technical Reasoning, Key Signals). Users earn XP for correct predictions, gamifying market research.

### News Intelligence
Automated, real-time market sentiment analysis. The system generates contextual news items, isolates ticker impacts, and categorizes overall market sentiment into Bullish/Bearish/Neutral metrics. Rendered visually via Pie and Bar distributions.

### Portfolio Analyzer
A local CSV ingestion engine that parses user brokerage data. Once ingested, the module calculates Total Investment, Asset Allocation (Pie Chart), Diversification Scores, and Risk Summaries. 

### AI Strategy Advisor
A fully contextualized LLM chatbot. It ingests the user's live Portfolio Analyzer metrics (Risk Score, Allocation %, Diversification) dynamically into its system prompt. This allows the AI to give highly targeted, hyper-specific rebalancing advice rather than generic templated responses.

## 6. API Integrations
*   **Supabase Client API:** Used heavily on the frontend for Real-time Channel subscriptions (Community feature), Auth state observation, and standard CRUD operations.
*   **Supabase Edge Functions:** 
    *   `/ai-chat`: Streams LLM responses for the Strategy Advisor.
    *   `/news-intelligence`: Returns structured JSON for market sentiment.
    *   `/stock-predict`: Calculates the AI's quantitative prediction.
    *   `/wallet-auth`: Verifies Ethereum cryptographic signatures for Web3 login.

## 7. AI Models Used
*   **Core Engine:** Google Gemini (via `gemini-3-flash-preview` and Lovable AI Gateway).
*   **Use Cases:** 
    *   *Function Calling:* Extensively used in News and Prediction modules to force the LLM to output rigid JSON properties (enums, confidence numbers, arrays of signals) instead of unstructured chat strings.
    *   *Natural Language Generation:* Used in the AI Advisor module to stream conversational strategy outputs formatted in Markdown.

## 8. Security Practices
*   **Row Level Security (RLS):** All Supabase tables (`predictions`, `user_progress`, `community_messages`) enforce strict RLS policies. A user can only `.select` or `.insert` data matching their `auth.uid()`.
*   **Server-Side AI API Keys:** The LLM API keys (`LOVABLE_API_KEY`) are stored natively in the Supabase Edge Function environment variables. The frontend never exposes secret keys.
*   **Payload Validation:** Web3 nonces and cryptographic signatures are verified on the backend before minting a session token.

## 9. Deployment Details
*   **Frontend:** The React application is built via Vite and deployed continuously. The build process creates minified static assets.
*   **Backend:** Edge Functions are deployed globally via Deno Deploy architecture via Supabase. The PostgeSQL database is highly available. 
*   **Environment Variables:** Configured securely to manage `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## 10. Future Improvements
1.  **Live Market Data:** Replace simulated/LLM-generated market data with a live WebSocket feed (e.g., Yahoo Finance API or Alpaca) for real-time portfolio tracking and prediction resolutions.
2.  **Cross-Module Intelligence:** Pass aggregated "News Sentinel" data into the "Prediction Engine" and "AI Advisor" so the modules are fundamentally aware of each other's live state.
3.  **Database Persistence for Portfolios:** Move the Portfolio Analyzer off localized CSV imports to a persistent DB table schema `user_holdings` to enable historical performance charting. 
4.  **Auto Re-Balancing Hooks:** Create trigger functions that alert the user via the AI Advisor when their actual allocation drifts more than 5% from their target allocation.
