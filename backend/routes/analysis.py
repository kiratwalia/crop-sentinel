from typing import Any, Dict

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from services.prediction_service import prediction_service
from data.demo_data import ALLOWED_IMAGE_TYPES

router = APIRouter(prefix="/api", tags=["analysis"])


@router.post("/analyze", response_model_exclude_none=True)
async def analyze_image(
    crop: str = Form(...),
    analysis_type: str = Form(...),
    image: UploadFile = File(...),
) -> Dict[str, Any]:
    if image is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"field": "image", "message": "Missing image file"},
        )

    content_type = (image.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "field": "image",
                "message": f"Invalid image type '{content_type}'. Supported types: {', '.join(ALLOWED_IMAGE_TYPES)}",
            },
        )

    if not crop or not prediction_service.is_supported_crop(crop):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "field": "crop",
                "message": f"Unsupported crop '{crop}'. Supported crops: {', '.join(prediction_service.SUPPORTED_CROPS)}",
            },
        )

    if not analysis_type or not prediction_service.is_supported_analysis_type(analysis_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "field": "analysis_type",
                "message": f"Invalid analysis type '{analysis_type}'. Supported: {', '.join(prediction_service.SUPPORTED_ANALYSIS_TYPES)}",
            },
        )

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"field": "image", "message": "Uploaded image file is empty"},
        )

    result = prediction_service.predict(
        crop=crop,
        analysis_type=analysis_type,
        image_bytes=image_bytes,
        image_filename=image.filename,
    )
    return result
