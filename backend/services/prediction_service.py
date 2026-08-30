import random
import hashlib
from typing import Any, Dict, Optional

from data.demo_data import CROP_DEMO_DATA, SUPPORTED_ANALYSIS_TYPES, SUPPORTED_CROPS


def _pick_demo_case(crop: str, analysis_type: str) -> Dict[str, Any]:
    candidates = CROP_DEMO_DATA.get(crop, [])
    if analysis_type in ("disease", "pest"):
        filtered = [c for c in candidates if c["type"] == analysis_type]
        if filtered:
            candidates = filtered
    if not candidates:
        candidates = CROP_DEMO_DATA.get(crop, [])
    return random.choice(candidates) if candidates else {}


def _compute_deterministic_confidence(image_bytes: Optional[bytes], base_range: tuple, seed_prefix: str) -> float:
    if not image_bytes:
        return round((base_range[0] + base_range[1]) / 2.0, 2)
    digest = hashlib.md5(image_bytes).hexdigest()
    rnd = random.Random(f"{seed_prefix}:{digest}")
    lo, hi = base_range
    return round(rnd.uniform(lo, hi), 2)


class PredictionService:
    """Prediction service.

    Currently returns DEMO-labeled synthetic predictions derived from curated demo
    profiles. The public API is intentionally narrow so that this module can later be
    swapped with a real PyTorch model without changing callers.
    """

    SUPPORTED_CROPS = SUPPORTED_CROPS
    SUPPORTED_ANALYSIS_TYPES = SUPPORTED_ANALYSIS_TYPES

    def is_supported_crop(self, crop: str) -> bool:
        return crop in self.SUPPORTED_CROPS

    def is_supported_analysis_type(self, analysis_type: str) -> bool:
        return analysis_type in self.SUPPORTED_ANALYSIS_TYPES

    def predict(
        self,
        crop: str,
        analysis_type: str,
        image_bytes: Optional[bytes] = None,
        image_filename: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Return a DEMO prediction for a crop image analysis request.

        Parameters
        ----------
        crop:
            Name of the crop (one of SUPPORTED_CROPS).
        analysis_type:
            One of 'disease', 'pest' or 'both'.
        image_bytes:
            (Optional) raw bytes of the uploaded image. Used only to make the
            returned confidence deterministic per image (for a real model this would
            be the tensor input).
        image_filename:
            (Optional) filename of the uploaded image, used as additional seed.
        """

        profile = _pick_demo_case(crop, analysis_type)
        confidence_range = profile.get("confidence_range", (0.80, 0.95))
        seed_prefix = f"{crop}|{analysis_type}|{image_filename or ''}"
        confidence = _compute_deterministic_confidence(image_bytes, confidence_range, seed_prefix)

        return {
            "crop": crop,
            "condition": f"[DEMO] {profile.get('condition', 'Unknown Condition')}",
            "type": profile.get("type", "disease"),
            "confidence": confidence,
            "severity": profile.get("severity", "Medium"),
            "risk": profile.get("risk", "Medium"),
            "symptoms": [f"[DEMO] {s}" for s in profile.get("symptoms", [])],
            "immediate_actions": [f"[DEMO] {a}" for a in profile.get("immediate_actions", [])],
            "prevention": [f"[DEMO] {p}" for p in profile.get("prevention", [])],
            "environmental_factors": [
                f"[DEMO] {e}" for e in profile.get("environmental_factors", [])
            ],
            "demo": True,
        }


prediction_service = PredictionService()
