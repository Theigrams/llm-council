"""LLM API client for making requests (OpenAI-compatible)."""

import httpx
import json
import asyncio
from typing import List, Dict, Any, Optional, AsyncGenerator
from .config import get_model_config


async def query_model(
    model: str,
    messages: List[Dict[str, str]],
    timeout: float = 300.0,
    max_retries: int = 3
) -> Optional[Dict[str, Any]]:
    """
    Query a single model via LLM API with retry mechanism.

    Args:
        model: Model identifier (e.g., "gpt-5.1")
        messages: List of message dicts with 'role' and 'content'
        timeout: Request timeout in seconds
        max_retries: Maximum number of retry attempts (default: 3)

    Returns:
        Response dict with 'content' and optional 'reasoning_content', or None if failed
    """
    # Get model-specific configuration
    model_config = get_model_config(model)
    api_url = model_config["api_url"]
    api_key = model_config["api_key"]

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
        "reasoning_effort": "high",
    }

    for attempt in range(1, max_retries + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    api_url,
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()

                data = response.json()
                message = data['choices'][0]['message']

                if attempt > 1:
                    print(f"Model {model} succeeded on attempt {attempt}")

                return {
                    'content': message.get('content'),
                    'reasoning_content': message.get('reasoning_content')
                }

        except Exception as e:
            if attempt < max_retries:
                print(f"Model {model} failed on attempt {attempt}/{max_retries}: {e}. Retrying...")
            else:
                print(f"Model {model} failed after {max_retries} attempts. Last error: {e}")

    return None


async def query_models_parallel(
    models: List[str],
    messages: List[Dict[str, str]]
) -> Dict[str, Optional[Dict[str, Any]]]:
    """
    Query multiple models in parallel.

    Args:
        models: List of model identifiers
        messages: List of message dicts to send to each model

    Returns:
        Dict mapping model identifier to response dict (or None if failed)
    """
    import asyncio

    # Create tasks for all models
    tasks = [query_model(model, messages) for model in models]

    # Wait for all to complete
    responses = await asyncio.gather(*tasks)

    # Map models to their responses
    return {model: response for model, response in zip(models, responses)}


async def query_model_stream(
    model: str,
    messages: List[Dict[str, str]],
    timeout: float = 300.0
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Stream tokens from a single model via LLM API.

    Args:
        model: Model identifier (e.g., "grok-4-fast-reasoning")
        messages: List of message dicts with 'role' and 'content'
        timeout: Request timeout in seconds

    Yields:
        Dict with 'type' ('delta' or 'done'), 'model', and optionally 'content'
    """
    model_config = get_model_config(model)
    api_url = model_config["api_url"]
    api_key = model_config["api_key"]

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
        "stream": True,
        "reasoning_effort": "high",
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST",
                api_url,
                headers=headers,
                json=payload
            ) as response:
                response.raise_for_status()

                async for line in response.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue

                    data = line[6:]  # Remove "data: " prefix

                    if data == "[DONE]":
                        yield {"type": "done", "model": model}
                        break

                    try:
                        chunk = json.loads(data)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})

                        if "content" in delta and delta["content"]:
                            yield {
                                "type": "delta",
                                "model": model,
                                "content": delta["content"]
                            }
                    except json.JSONDecodeError:
                        continue

    except Exception as e:
        yield {"type": "error", "model": model, "message": str(e)}


async def query_models_parallel_stream(
    models: List[str],
    messages: List[Dict[str, str]]
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Query multiple models in parallel, yielding tokens as they arrive.

    Args:
        models: List of model identifiers
        messages: List of message dicts to send to each model

    Yields:
        Dict with 'type', 'model', and optionally 'content' for each event
    """
    queue: asyncio.Queue = asyncio.Queue()
    pending_models = set(models)

    async def stream_to_queue(model: str):
        """Stream a single model's output to the shared queue."""
        accumulated = ""
        try:
            async for event in query_model_stream(model, messages):
                if event["type"] == "delta":
                    accumulated += event["content"]
                await queue.put(event)

            # Send accumulated content when model completes
            await queue.put({
                "type": "model_complete",
                "model": model,
                "content": accumulated
            })
        except Exception as e:
            await queue.put({
                "type": "error",
                "model": model,
                "message": str(e)
            })

    # Start all streams concurrently
    tasks = [asyncio.create_task(stream_to_queue(m)) for m in models]

    # Yield events as they arrive from any model
    while pending_models:
        event = await queue.get()

        if event["type"] in ("done", "model_complete", "error"):
            pending_models.discard(event["model"])

        yield event

    # Cleanup and wait for all tasks
    await asyncio.gather(*tasks, return_exceptions=True)
    yield {"type": "all_done"}
