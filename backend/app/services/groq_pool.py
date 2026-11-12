import asyncio
import logging
import re
import time
from collections.abc import Awaitable, Callable
from typing import TypeVar

import groq

from app.config import GROQ_KEYS

logger = logging.getLogger("fluento.groq")

T = TypeVar("T")

MAX_WAIT_SECONDS = 8
DEFAULT_COOLDOWN = 60
UNAVAILABLE_COOLDOWN = 3600


def _retry_after(exc: groq.APIStatusError) -> float:
    header = exc.response.headers.get("retry-after") if exc.response is not None else None
    if header:
        try:
            return float(header)
        except ValueError:
            pass
    match = re.search(r"try again in (?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?", str(exc))
    if match and any(match.groups()):
        hours, minutes, seconds = (float(g) if g else 0.0 for g in match.groups())
        return hours * 3600 + minutes * 60 + seconds
    return DEFAULT_COOLDOWN


def _unavailable(exc: groq.APIStatusError) -> bool:
    text = str(exc)
    return isinstance(exc, groq.NotFoundError | groq.PermissionDeniedError) or "model_terms_required" in text


class GroqPool:
    def __init__(self, keys: list[str]) -> None:
        self.clients = [groq.AsyncGroq(api_key=key, max_retries=0) for key in keys]
        self.preferred: dict[str, int] = {}
        self.resting: dict[tuple[int, str], float] = {}

    def _rest(self, index: int, model: str, seconds: float, reason: str) -> None:
        self.resting[(index, model)] = time.monotonic() + seconds
        logger.warning("Groq key %d: %s for %s, switching keys for %ds", index + 1, reason, model, round(seconds))

    def status(self) -> list[dict]:
        now = time.monotonic()
        return [
            {"key": i + 1, "resting": {m: round(t - now) for (k, m), t in self.resting.items() if k == i and t > now}}
            for i in range(len(self.clients))
        ]

    async def run(self, model: str, call: Callable[[groq.AsyncGroq], Awaitable[T]]) -> T:
        count = len(self.clients)
        last_error: Exception | None = None
        for attempt in range(2):
            start = self.preferred.get(model, 0)
            for offset in range(count):
                index = (start + offset) % count
                if self.resting.get((index, model), 0) > time.monotonic():
                    continue
                try:
                    result = await call(self.clients[index])
                except groq.RateLimitError as exc:
                    self._rest(index, model, _retry_after(exc), "limit reached")
                    last_error = exc
                    continue
                except groq.AuthenticationError as exc:
                    self._rest(index, model, UNAVAILABLE_COOLDOWN, "invalid key")
                    last_error = exc
                    continue
                except groq.APIStatusError as exc:
                    if not _unavailable(exc):
                        raise
                    self._rest(index, model, UNAVAILABLE_COOLDOWN, "model not available")
                    last_error = exc
                    continue
                self.preferred[model] = index
                return result

            waits = [t - time.monotonic() for (k, m), t in self.resting.items() if m == model]
            soonest = min(waits) if len(waits) >= count else 0
            if attempt == 0 and soonest <= MAX_WAIT_SECONDS:
                await asyncio.sleep(max(soonest, 0.5))
                continue
            break
        if last_error:
            raise last_error
        raise RuntimeError("No Groq API keys are configured.")


pool = GroqPool(GROQ_KEYS)
