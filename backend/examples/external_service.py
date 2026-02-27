"""Local contract example ONLY; replace with the actual research implementation."""
import os
import secrets
from typing import Annotated
from fastapi import FastAPI, Header, HTTPException
from algorithms.placeholder import solve
from contract import SolveRequest, AlgorithmResult

app = FastAPI(title="External algorithm contract example")

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/solve", response_model=AlgorithmResult)
def run(instance: SolveRequest, authorization: Annotated[str | None, Header()] = None):
    if not secrets.compare_digest(authorization or "", f"Bearer {os.environ['EXTERNAL_ALGORITHM_TOKEN']}"):
        raise HTTPException(status_code=401)
    result = solve(instance)
    result.log = "EXTERNAL CONTRACT EXAMPLE, NOT RESEARCH MODEL. " + result.log
    return result
