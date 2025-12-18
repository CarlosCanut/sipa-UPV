import os
import secrets
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException

from algorithms import REGISTRY
from contract import Params, SolveRequest, SolveResponse
from metrics import complete

app = FastAPI(title="SIPA solver", version="1.0.0")


def authenticate(authorization: Annotated[str | None, Header()] = None):
    token = os.environ.get("SOLVER_TOKEN", "")
    if token and not secrets.compare_digest(authorization or "", f"Bearer {token}"):
        raise HTTPException(status_code=401, detail="Invalid solver credentials")


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/algorithms", dependencies=[Depends(authenticate)])
def algorithms():
    return [{"key": key, "name": "Heurística de referencia" if key == "placeholder" else key,
             "defaultParams": Params().model_dump()} for key in REGISTRY]


@app.post("/solve", response_model=SolveResponse, dependencies=[Depends(authenticate)])
def solve(instance: SolveRequest):
    algorithm = REGISTRY.get(instance.algorithm)
    if algorithm is None:
        raise HTTPException(status_code=400, detail="Unknown algorithm")
    return complete(instance, algorithm(instance))
