from __future__ import annotations

import json
from dataclasses import dataclass

try:
    from anthropic import Anthropic
except Exception:  # pragma: no cover
    Anthropic = None


@dataclass
class AgentResult:
    text: str
    source: str


class ClaudeClient:
    def __init__(self, api_key: str, model: str, enabled: bool):
        self.api_key = api_key
        self.model = model
        self.enabled = enabled and bool(api_key) and Anthropic is not None
        self._client = Anthropic(api_key=api_key) if self.enabled else None

    def ask(self, prompt: str, max_tokens: int = 3000) -> AgentResult:
        if not self.enabled:
            return AgentResult(text=json.dumps({"mode": "local_fallback"}, ensure_ascii=False), source="local")

        msg = self._client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        chunks = [c.text for c in msg.content if getattr(c, "type", "") == "text"]
        return AgentResult(text="\n".join(chunks).strip(), source="claude")
