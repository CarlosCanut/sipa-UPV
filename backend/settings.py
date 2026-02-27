import os
from dataclasses import dataclass
from functools import lru_cache
from urllib.parse import urlsplit


@dataclass(frozen=True)
class Settings:
    token: str
    placeholder: bool
    external_url: str
    external_token: str

    @property
    def algorithm(self):
        return "placeholder" if self.placeholder else "external"


@lru_cache
def settings() -> Settings:
    token = os.environ.get("BACKEND_TOKEN", "")
    if len(token) < 32:
        raise ValueError("BACKEND_TOKEN must have at least 32 characters")
    mode = os.environ.get("USE_PLACEHOLDER_ALGORITHM", "true").lower()
    if mode not in ("true", "false"):
        raise ValueError("USE_PLACEHOLDER_ALGORITHM must be true or false")
    url = os.environ.get("EXTERNAL_ALGORITHM_URL", "")
    if mode == "false":
        parsed = urlsplit(url)
        if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password or parsed.fragment:
            raise ValueError("Set EXTERNAL_ALGORITHM_URL to the HTTP(S) solve endpoint without embedded credentials")
    return Settings(token, mode == "true", url, os.environ.get("EXTERNAL_ALGORITHM_TOKEN", ""))
