from typing import Any, Dict

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from services.prediction_service import (
    SUPPORTED_CROPS,
    prediction_service,
)
from data.demo_data import ALLOWED_IMAGE_TYPES


router = APIRouter(prefix="/api", tags=["analysis"])


# ============================================================
# CONFIG
# ============================================================

SUPPORTED_ANALYSIS_TYPES = {
    "disease",
    "pest",
    "both",
}

MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB


# ============================================================
# ANALYZE IMAGE
# ============================================================

@router.post(
    "/analyze",
    response_model_exclude_none=True,
)
async def analyze_image(
    crop: str = Form(...),
    analysis_type: str = Form(...),
    image: UploadFile = File(...),
) -> Dict[str, Any]:

    # --------------------------------------------------------
    # Validate image presence
    # --------------------------------------------------------

    if image is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "field": "image",
                "message": "Missing image file.",
            },
        )

    # --------------------------------------------------------
    # Validate content type
    # --------------------------------------------------------

    content_type = (image.content_type or "").lower().strip()

    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "field": "image",
                "message": (
                    f"Invalid image type '{content_type}'. "
                    f"Supported types: {', '.join(ALLOWED_IMAGE_TYPES)}"
                ),
            },
        )

    # --------------------------------------------------------
    # Normalize crop
    # --------------------------------------------------------

    crop = crop.strip()

    if not crop:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "field": "crop",
                "message": "Crop is required.",
            },
        )

    # Case-insensitive crop matching
    crop_lookup = {
        supported.lower(): supported
        for supported in SUPPORTED_CROPS
    }

    normalized_crop = crop_lookup.get(crop.lower())

    if normalized_crop is None:
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

    # --------------------------------------------------------
    # Normalize analysis type
    # --------------------------------------------------------

    analysis_type = analysis_type.strip().lower()

    if analysis_type not in SUPPORTED_ANALYSIS_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "field": "analysis_type",
                "message": (
                    f"Invalid analysis type '{analysis_type}'. "
                    f"Supported: "
                    f"{', '.join(sorted(SUPPORTED_ANALYSIS_TYPES))}"
                ),
            },
        )

    # --------------------------------------------------------
    # Read image
    # --------------------------------------------------------

    image_bytes = await image.read()

    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "field": "image",
                "message": "Uploaded image file is empty.",
            },
        )

    # --------------------------------------------------------
    # Validate image size
    # --------------------------------------------------------

    if len(image_bytes) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "field": "image",
                "message": "Image size must be 10 MB or smaller.",
            },
        )

    # --------------------------------------------------------
    # Run AI prediction
    # --------------------------------------------------------

    try:
        result = prediction_service.predict(
            image_bytes=image_bytes,
            crop=normalized_crop,
            analysis_type=analysis_type,
        )

    except Exception as exc:
        # Log actual error on backend
        print("Analysis service error:", repr(exc))

        # Never expose internal traceback to frontend
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "field": "analysis",
                "message": "Unable to analyze the image right now.",
            },
        ) from exc

    # --------------------------------------------------------
    # Return standardized AI response
    # --------------------------------------------------------

    return result