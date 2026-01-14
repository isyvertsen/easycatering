"""AI Client Factory for multiple AI providers.

Supports:
- OpenAI (GPT-4, GPT-3.5, etc.)
- Azure OpenAI
- Anthropic (Claude)

Configuration via environment variables:
- AI_PROVIDER: openai | azure | anthropic
- Provider-specific settings (see config.py)
"""
import logging
from typing import Optional, Dict, Any, List
from abc import ABC, abstractmethod

from app.core.config import settings

logger = logging.getLogger(__name__)


class AIClient(ABC):
    """Abstract base class for AI clients."""

    @abstractmethod
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        **kwargs
    ) -> str:
        """Send a chat completion request and return the response text."""
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        """Check if the client is properly configured."""
        pass


class OpenAIClient(AIClient):
    """OpenAI API client."""

    def __init__(self):
        import openai

        client_kwargs = {"api_key": settings.OPENAI_API_KEY}

        if settings.OPENAI_BASE_URL:
            client_kwargs["base_url"] = settings.OPENAI_BASE_URL
        if settings.OPENAI_ORGANIZATION:
            client_kwargs["organization"] = settings.OPENAI_ORGANIZATION

        self.client = openai.AsyncOpenAI(**client_kwargs)
        self.default_model = settings.OPENAI_MODEL
        self.default_max_tokens = settings.OPENAI_MAX_TOKENS
        self.default_temperature = settings.OPENAI_TEMPERATURE

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        **kwargs
    ) -> str:
        response = await self.client.chat.completions.create(
            model=model or self.default_model,
            messages=messages,
            max_tokens=max_tokens or self.default_max_tokens,
            temperature=temperature if temperature is not None else self.default_temperature,
            **kwargs
        )
        return response.choices[0].message.content or ""

    def is_configured(self) -> bool:
        return bool(settings.OPENAI_API_KEY)


class AzureOpenAIClient(AIClient):
    """Azure OpenAI API client."""

    def __init__(self):
        import openai

        self.client = openai.AsyncAzureOpenAI(
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version=settings.AZURE_OPENAI_API_VERSION,
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
        )
        self.deployment = settings.AZURE_OPENAI_DEPLOYMENT
        self.default_max_tokens = settings.OPENAI_MAX_TOKENS
        self.default_temperature = settings.OPENAI_TEMPERATURE

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        **kwargs
    ) -> str:
        response = await self.client.chat.completions.create(
            model=model or self.deployment,
            messages=messages,
            max_tokens=max_tokens or self.default_max_tokens,
            temperature=temperature if temperature is not None else self.default_temperature,
            **kwargs
        )
        return response.choices[0].message.content or ""

    def is_configured(self) -> bool:
        return bool(
            settings.AZURE_OPENAI_API_KEY and
            settings.AZURE_OPENAI_ENDPOINT and
            settings.AZURE_OPENAI_DEPLOYMENT
        )


class AnthropicClient(AIClient):
    """Anthropic (Claude) API client."""

    def __init__(self):
        try:
            import anthropic
            self.client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            self._available = True
        except ImportError:
            logger.warning("anthropic package not installed. Install with: pip install anthropic")
            self.client = None
            self._available = False

        self.default_model = settings.ANTHROPIC_MODEL
        self.default_max_tokens = settings.ANTHROPIC_MAX_TOKENS

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        **kwargs
    ) -> str:
        if not self._available or not self.client:
            raise RuntimeError("Anthropic client not available. Install anthropic package.")

        # Convert OpenAI format to Anthropic format
        system_message = None
        anthropic_messages = []

        for msg in messages:
            if msg["role"] == "system":
                system_message = msg["content"]
            else:
                anthropic_messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })

        response = await self.client.messages.create(
            model=model or self.default_model,
            max_tokens=max_tokens or self.default_max_tokens,
            system=system_message,
            messages=anthropic_messages,
            **kwargs
        )
        return response.content[0].text

    def is_configured(self) -> bool:
        return self._available and bool(settings.ANTHROPIC_API_KEY)


def get_ai_client() -> AIClient:
    """Get the configured AI client based on AI_PROVIDER setting.

    Returns:
        AIClient instance based on configuration

    Raises:
        ValueError: If no AI provider is properly configured
    """
    provider = settings.AI_PROVIDER.lower()

    if provider == "azure":
        client = AzureOpenAIClient()
        if client.is_configured():
            logger.info("Using Azure OpenAI client")
            return client
        logger.warning("Azure OpenAI not configured, falling back to OpenAI")

    if provider == "anthropic":
        client = AnthropicClient()
        if client.is_configured():
            logger.info("Using Anthropic (Claude) client")
            return client
        logger.warning("Anthropic not configured, falling back to OpenAI")

    # Default to OpenAI
    client = OpenAIClient()
    if client.is_configured():
        logger.info(f"Using OpenAI client with model: {settings.OPENAI_MODEL}")
        return client

    raise ValueError(
        "No AI provider configured. Set one of: "
        "OPENAI_API_KEY, AZURE_OPENAI_API_KEY, or ANTHROPIC_API_KEY"
    )


# Singleton instance (lazy loaded)
_ai_client: Optional[AIClient] = None


def get_default_ai_client() -> AIClient:
    """Get the default AI client (singleton).

    Use this for most cases. Creates client on first call.
    """
    global _ai_client
    if _ai_client is None:
        _ai_client = get_ai_client()
    return _ai_client
