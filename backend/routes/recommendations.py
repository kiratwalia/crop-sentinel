from typing import Any, Dict, Optional

from fastapi import APIRouter, Header, HTTPException, Query, status

from services import db
from services.recommendation_service import recommendation_service
from services.risk_service import SUPPORTED_CROPS, risk_service
from services.weather_service import weather_service

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


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


def _extract_token(authorization: Optional[str]) -> Optional[str]:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1]
    return None


@router.get("")
async def get_recommendations(
    crop: Optional[str] = Query(None, description="Crop name (e.g. potato, tomato)"),
    analysis_id: Optional[str] = Query(None, description="Optional stored analysis ID"),
    lat: Optional[float] = Query(None, ge=-90, le=90, description="Latitude"),
    lng: Optional[float] = Query(None, ge=-180, le=180, description="Longitude"),
    authorization: Optional[str] = Header(None),
) -> Dict[str, Any]:
    """
    Get context-aware prioritized recommendations combining AI findings,
    current weather, and crop risk factors.
    """
    valid_lat, valid_lng = _validate_coords(lat, lng)
    token = _extract_token(authorization)

    analysis_data: Optional[Dict[str, Any]] = None

    # Load stored analysis if ID provided
    if analysis_id:
        try:
            row = db.get_analysis_by_id(analysis_id, access_token=token)
            if row is not None:
                # Row might have inner "result" json or top-level columns
                res = row.get("result") if isinstance(row.get("result"), dict) else row
                analysis_data = {
                    "crop": res.get("crop") or row.get("crop_name"),
                    "condition": res.get("condition") or row.get("condition"),
                    "confidence": res.get("confidence") or row.get("confidence") or 0.0,
                    "severity": res.get("severity") or row.get("severity") or "unknown",
                    "prediction_type": res.get("prediction_type") or res.get("type") or row.get("prediction_type"),
                }
                if not crop and analysis_data.get("crop"):
                    crop = str(analysis_data["crop"])
        except Exception as exc:
            print("[RECOMMENDATIONS DB ERROR]", repr(exc))

    # Resolve and normalize crop
    target_crop = (crop or "tomato").strip().lower()
    if target_crop not in SUPPORTED_CROPS:
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

    # Fetch weather
    try:
        weather_resp = await weather_service.get_current_weather(valid_lat, valid_lng)
        weather_data = weather_resp.get("data") if weather_resp.get("status") != "unavailable" else None
    except Exception as exc:
        print("[RECOMMENDATIONS WEATHER ERROR]", repr(exc))
        weather_data = None

    fallback_weather = {
        "temperatureC": 24.0,
        "humidity": 65.0,
        "rainfallMm": 0.0,
        "windKph": 10.0,
        "condition": "Mainly clear",
    }
    w_effective = weather_data or fallback_weather

    # Calculate risk scores for this crop
    try:
        risk_scores = risk_service.calculate_crop_risk(target_crop, w_effective)
    except Exception as exc:
        print("[RECOMMENDATIONS RISK ERROR]", repr(exc))
        risk_scores = {
            "disease": 50,
            "pest": 50,
            "environmental": 50,
            "overall": 50,
            "risk_level": "moderate",
        }

    # Generate recommendations
    recs = recommendation_service.generate_recommendations(
        crop=target_crop,
        weather=w_effective,
        risk_scores=risk_scores,
        analysis=analysis_data,
    )

    return {
        "status": "ok",
        "crop": target_crop,
        "recommendations": recs,
    }
