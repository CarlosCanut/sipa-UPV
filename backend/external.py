"""Call a configured algorithm service. Never download or execute remote source code."""
import asyncio
import json

import httpx
from pydantic import ValidationError

from contract import AlgorithmResult, SolveRequest
from settings import Settings


class AlgorithmServiceError(Exception):
    pass


async def external_solve(instance: SolveRequest, config: Settings) -> AlgorithmResult:
    headers = {"Content-Type": "application/json"}
    if config.external_token:
        headers["Authorization"] = f"Bearer {config.external_token}"
    try:
        # Wall-clock limit also bounds slow streaming responses. No automatic retries:
        # an external optimization may be costly or already running after a timeout.
        async with asyncio.timeout(instance.params.timeLimitSec):
            async with httpx.AsyncClient(timeout=instance.params.timeLimitSec, follow_redirects=False, trust_env=False) as client:
                async with client.stream("POST", config.external_url, headers=headers, json=instance.model_dump()) as response:
                    response.raise_for_status()
                    content = bytearray()
                    async for chunk in response.aiter_bytes():
                        content.extend(chunk)
                        if len(content) > 5_000_000:
                            raise AlgorithmServiceError("External result exceeds 5 MB")
        return AlgorithmResult.model_validate(json.loads(content))
    except (TimeoutError, httpx.TimeoutException) as error:
        raise AlgorithmServiceError("External algorithm timed out") from error
    except (httpx.HTTPError, ValidationError, ValueError) as error:
        # Do not expose upstream URLs, credentials, bodies or exception details.
        raise AlgorithmServiceError("External algorithm unavailable or returned an invalid result") from error
