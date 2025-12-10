# server.py

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from prediction import predict_dynamic_sequence
import uvicorn


class BatchInput(BaseModel):
    device_id: str
    sequence: List[List[float]]   # variable length sequence


app = FastAPI(
    title="Dynamic LSTM Spoilage Predictor",
    version="2.0",
    description="Accepts ANY batch length and predicts risk from sliding windows."
)


@app.post("/predict-batch")
def predict_batch(payload: BatchInput):
    seq = payload.sequence

    if len(seq) < 5:
        return {"error": "Need at least 5 readings to run LSTM sliding window."}

    result = predict_dynamic_sequence(seq)

    return {
        "device_id": payload.device_id,
        **result
    }


@app.get("/")
def home():
    return {"message": "Dynamic LSTM API running successfully!"}


if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
