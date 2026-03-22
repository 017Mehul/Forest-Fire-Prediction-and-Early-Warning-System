from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    temperature: float = Field(..., description="Temperature value")
    humidity: float = Field(..., description="Humidity value")
    wind: float = Field(..., description="Wind speed value")
    vegetation: float = Field(..., description="Vegetation index/value")
