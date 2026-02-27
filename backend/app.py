from contextlib import asynccontextmanager
import secrets
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException

from starlette.concurrency import run_in_threadpool
from algorithms import placeholder
from external import external_solve, AlgorithmServiceError
from settings import settings
from contract import Params, SolveRequest, SolveResponse
from metrics import complete

@asynccontextmanager
async def lifespan(app):
    settings()  # Invalid deployment configuration fails before serving requests.
    yield


app = FastAPI(title="SIPA backend", version="1.1.0", lifespan=lifespan)


def authenticate(authorization: Annotated[str | None, Header()] = None):
    if not secrets.compare_digest(authorization or "", f"Bearer {settings().token}"):
        raise HTTPException(status_code=401, detail="Invalid backend credentials")


@app.get("/health")
def health():
    return {"ok": True, "algorithm": settings().algorithm}


@app.get("/algorithms", dependencies=[Depends(authenticate)])
def algorithms():
    config = settings()
    return [{"key": config.algorithm,
             "name": "Heurística de demostración" if config.placeholder else "Algoritmo externo",
             "defaultParams": Params().model_dump()}]


@app.post("/solve", response_model=SolveResponse, dependencies=[Depends(authenticate)])
async def solve(instance: SolveRequest):
    config = settings()
    if instance.algorithm != config.algorithm:
        raise HTTPException(status_code=400, detail="Algorithm is not enabled in this deployment")
    try:
        result = await run_in_threadpool(placeholder.solve, instance) if config.placeholder else await external_solve(instance, config)
        return complete(instance, result)
    except AlgorithmServiceError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=502, detail="Algorithm returned an infeasible or invalid assignment") from error
