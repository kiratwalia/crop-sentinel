from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query, status

from services.risk_service import SUPPORTED_CROPS, risk_service
from services.weather_service import weather_service

router = APIRouter(prefix="/api/risk", tags=["risk"])


def _validate_coords(lat: Optional[float], lng: Optional[float]) -> tuple[float, float]:
    """Validate latitude and longitude or apply consistent default."""
    if lat is None or lng is None:
        return 19.9975, 73.7898

    if lat == 0 and lng == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"field": "lat/lng", "message": "Invalid coordinates (0, 0)."},
        )
    return lat, lng


def _normalize_crop(crop: Optional[str]) -> Optional[str]:
    """Validate and normalize crop name if provided."""
    if crop is None:
        return None
    clean_crop = crop.strip().lower()
    if not clean_crop:
        return None
    if clean_crop not in SUPPORTED_CROPS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "field": "crop",
                "message": (
                    f"Unsupported crop '{crop}'. "
                    f"Supported crops: {', '.join(sorted(SUPPORTED_CROPS))}"
                ),
            },
        )
    return clean_crop


@router.get("")
async def get_risk(
    crop: Optional[str] = Query(None, description="Crop name (optional)"),
    lat: Optional[float] = Query(None, ge=-90, le=90, description="Latitude"),
    lng: Optional[float] = Query(None, ge=-180, le=180, description="Longitude"),
) -> Dict[str, Any]:
    """
    Get real-time deterministic risk scores for a specified crop or all supported crops.
    """
    valid_lat, valid_lng = _validate_coords(lat, lng)
    normalized_crop = _normalize_crop(crop)

    try:
        weather_resp = await weather_service.get_current_weather(valid_lat, valid_lng)
    except Exception as exc:
        print("[RISK WEATHER ERROR]", repr(exc))
        weather_resp = {"status": "unavailable", "data": None}

    if weather_resp.get("status") == "unavailable" or not weather_resp.get("data"):
        return {
            "status": "unavailable",
            "weather": None,
            "crops": [],
            "message": "Risk cannot be calculated because weather data is unavailable.",
        }

    raw_w = weather_resp["data"]
    weather_summary = {
        "temperatureC": raw_w.get("temperatureC", 0),
        "humidity": raw_w.get("humidity", 0),
        "rainfallMm": raw_w.get("rainfallMm", 0),
        "windKph": raw_w.get("windKph", 0),
        "condition": raw_w.get("condition", "Unknown"),
    }

    try:
        if normalized_crop:
            scores = risk_service.calculate_crop_risk(normalized_crop, raw_w)
            return {
                "status": "ok",
                "crop": normalized_crop,
                "weather": weather_summary,
                "scores": scores,
            }

        crops_risk = risk_service.calculate_all_crops_risk(raw_w)
        return {
            "status": "ok",
            "weather": weather_summary,
            "crops": crops_risk,
        }
    except Exception as exc:
        print("[RISK CALCULATION ERROR]", repr(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"field": "risk", "message": "Unable to calculate risk scores at this time."},
        ) from None


@router.get("/forecast")
async def get_risk_forecast(
    crop: str = Query("potato", description="Crop name for 7-day risk forecast"),
    lat: Optional[float] = Query(None, ge=-90, le=90, description="Latitude"),
    lng: Optional[float] = Query(None, ge=-180, le=180, description="Longitude"),
) -> Dict[str, Any]:
    """
    Get 7-day daily risk forecast for a specified crop.
    """
    valid_lat, valid_lng = _validate_coords(lat, lng)
    normalized_crop = _normalize_crop(crop)
    if not normalized_crop:
        normalized_crop = "potato"

    try:
        f_resp = await weather_service.get_forecast_weather(valid_lat, valid_lng, days=7)
    except Exception as exc:
        print("[RISK FORECAST WEATHER ERROR]", repr(exc))
        f_resp = {"status": "unavailable", "data": None}

    if f_resp.get("status") == "unavailable" or not f_resp.get("data"):
        return {
            "status": "unavailable",
            "crop": normalized_crop,
            "forecast": [],
            "message": "Risk forecast cannot be calculated because forecast weather data is unavailable.",
        }

    daily_forecast = []
    try:
        for day in f_resp["data"]:
            scores = risk_service.calculate_crop_risk(normalized_crop, day)
            daily_forecast.append({
                "date": day["date"],
                "disease": scores["disease"],
                "pest": scores["pest"],
                "environmental": scores["environmental"],
                "overall": scores["overall"],
                "risk_level": scores["risk_level"],
            })

        return {
            "status": "ok",
            "crop": normalized_crop,
            "forecast": daily_forecast,
        }
    except Exception as exc:
        print("[RISK FORECAST CALC ERROR]", repr(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"field": "forecast", "message": "Unable to calculate risk forecast at this time."},
        ) from None
