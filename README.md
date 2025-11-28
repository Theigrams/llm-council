# LLM Council

> **Fork of [karpathy/llm-council](https://github.com/karpathy/llm-council)**

## What's Changed

This fork includes the following enhancements:

- **Token-level Streaming**: Real-time typewriter effect for all 3 stages (not just stage-level updates)
- **Flexible API Config**: JSON-based configuration supporting multiple API endpoints (OpenRouter, OpenAI, local LLMs, etc.)
- **Enhanced Markdown**: Support for GFM tables and LaTeX math formulas ($x^2$, $$\sum_{i=1}^n$$)
- **Delete Conversations**: Hover over a conversation to reveal the delete button
- **Improved Scrolling**: Smart scroll behavior that respects user position during streaming

---

![llmcouncil](header.jpg)

The idea of this repo is that instead of asking a question to your favorite LLM provider (e.g. OpenAI GPT 5.1, Google Gemini 3.0 Pro, Anthropic Claude Sonnet 4.5, xAI Grok 4, eg.c), you can group them into your "LLM Council". This repo is a simple, local web app that essentially looks like ChatGPT except it uses OpenRouter to send your query to multiple LLMs, it then asks them to review and rank each other's work, and finally a Chairman LLM produces the final response.

In a bit more detail, here is what happens when you submit a query:

1. **Stage 1: First opinions**. The user query is given to all LLMs individually, and the responses are collected. The individual responses are shown in a "tab view", so that the user can inspect them all one by one.
2. **Stage 2: Review**. Each individual LLM is given the responses of the other LLMs. Under the hood, the LLM identities are anonymized so that the LLM can't play favorites when judging their outputs. The LLM is asked to rank them in accuracy and insight.
3. **Stage 3: Final response**. The designated Chairman of the LLM Council takes all of the model's responses and compiles them into a single final answer that is presented to the user.

## Vibe Code Alert

This project was 99% vibe coded as a fun Saturday hack because I wanted to explore and evaluate a number of LLMs side by side in the process of [reading books together with LLMs](https://x.com/karpathy/status/1990577951671509438). It's nice and useful to see multiple responses side by side, and also the cross-opinions of all LLMs on each other's outputs. I'm not going to support it in any way, it's provided here as is for other people's inspiration and I don't intend to improve it. Code is ephemeral now and libraries are over, ask your LLM to change it in whatever way you like.

## Setup

### 1. Install Dependencies

The project uses [uv](https://docs.astral.sh/uv/) for project management.

**Backend:**
```bash
uv sync
```

**Frontend:**
```bash
cd frontend
npm install
cd ..
```

### 2. Configure API

Copy the example config and add your API keys:

```bash
cp llm_config.example.json llm_config.json
```

Edit `llm_config.json` with your API configuration:

```json
{
  "models": {
    "gpt-4o": {
      "api_url": "https://api.openai.com/v1/chat/completions",
      "api_key": "your-api-key-here"
    },
    "claude-3-5-sonnet": {
      "api_url": "https://api.anthropic.com/v1/messages",
      "api_key": "your-api-key-here"
    }
  },
  "council": ["gpt-4o", "claude-3-5-sonnet"],
  "chairman": "gpt-4o",
  "title_generator": "gpt-4o"
}
```

You can use any OpenAI-compatible API endpoint (OpenRouter, local LLMs, etc.).

## Running the Application

**Option 1: Use the start script**
```bash
./start.sh
```

**Option 2: Run manually**

Terminal 1 (Backend):
```bash
uv run python -m backend.main
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

Then open http://localhost:5173 in your browser.

## Tech Stack

- **Backend:** FastAPI (Python 3.10+), async httpx
- **Frontend:** React + Vite, react-markdown for rendering
- **Storage:** JSON files in `data/conversations/`
- **Package Management:** uv for Python, npm for JavaScript
