from pydantic import BaseModel, ConfigDict, Field


class PredictionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    temperature: float = Field(..., ge=-60, le=60, description="Air temperature in °C")
    humidity: float = Field(..., ge=0, le=100, description="Relative humidity in %")
    wind: float = Field(..., ge=0, le=250, description="Wind speed in km/h")
    vegetation: float = Field(..., ge=0, le=100, description="Vegetation/fuel density proxy in %")
