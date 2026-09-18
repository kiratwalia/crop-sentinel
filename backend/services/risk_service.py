"""
CropCare AI - Real Risk Engine Service
=======================================

IMPORTANT DISCLAIMER:
This risk engine is an initial heuristic Minimum Viable Product (MVP) model
based on empirical agronomic rules of thumb for weather-conducive conditions.
It is NOT a scientifically validated epidemiological or microclimatic model.
Scores represent environmental and microclimatic conduciveness for pathogen
development and insect activity, NOT guaranteed presence or absolute probability
of disease in the crop.

SUPPORTED CROPS:
- tomato
- potato
- maize
- grape
- apple
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple

SUPPORTED_CROPS = {"tomato", "potato", "maize", "grape", "apple"}


@dataclass(frozen=True)
class CropSensitivityProfile:
    # Disease optimal temperature range (Celsius)
    disease_temp_opt: Tuple[float, float]
    # Pest optimal temperature range (Celsius)
    pest_temp_opt: Tuple[float, float]
    # Humidity baseline where fungal/bacterial risk begins to escalate
    disease_rh_threshold: float
    # Rain sensitivity weight (0.0 - 1.0)
    disease_rain_weight: float
    # Wind sensitivity weight for spore dispersal (0.0 - 1.0)
    disease_wind_weight: float
    # Pest sensitivity to dry conditions vs humid
    pest_prefers_dry: bool


# Agronomic heuristic profiles for each supported crop
CROP_PROFILES: Dict[str, CropSensitivityProfile] = {
    "potato": CropSensitivityProfile(
        disease_temp_opt=(15.0, 22.0),  # Late blight favors cool-moderate
        pest_temp_opt=(20.0, 29.0),     # Colorado potato beetle
        disease_rh_threshold=75.0,      # >75% RH triggers blight sporulation
        disease_rain_weight=0.30,       # Free leaf wetness is essential
        disease_wind_weight=0.10,
        pest_prefers_dry=True,
    ),
    "tomato": CropSensitivityProfile(
        disease_temp_opt=(20.0, 28.0),  # Early blight, septoria, bacterial spot
        pest_temp_opt=(22.0, 32.0),     # Spider mites, whiteflies, hornworms
        disease_rh_threshold=70.0,
        disease_rain_weight=0.25,
        disease_wind_weight=0.10,
        pest_prefers_dry=True,          # Spider mites flourish in dry heat
    ),
    "maize": CropSensitivityProfile(
        disease_temp_opt=(18.0, 27.0),  # Northern corn leaf blight, common rust
        pest_temp_opt=(22.0, 31.0),     # Fall armyworm, stem borers
        disease_rh_threshold=72.0,
        disease_rain_weight=0.22,
        disease_wind_weight=0.12,       # Rust urediniospores wind-transported
        pest_prefers_dry=False,         # Armyworms tolerate humid warmth
    ),
    "grape": CropSensitivityProfile(
        disease_temp_opt=(18.0, 27.0),  # Downy & powdery mildew, black rot
        pest_temp_opt=(20.0, 30.0),     # Berry moth, leafhoppers
        disease_rh_threshold=75.0,      # High humidity crucial for downy mildew
        disease_rain_weight=0.25,
        disease_wind_weight=0.15,       # Powdery mildew conidia spread on air currents
        pest_prefers_dry=True,
    ),
    "apple": CropSensitivityProfile(
        disease_temp_opt=(14.0, 23.0),  # Apple scab (Venturia inaequalis), cedar rust
        pest_temp_opt=(18.0, 28.0),     # Codling moth, aphids
        disease_rh_threshold=70.0,      # Scab infection requires leaf wetness
        disease_rain_weight=0.28,
        disease_wind_weight=0.12,
        pest_prefers_dry=True,
    ),
}


def _clamp(val: float, min_val: float = 0.0, max_val: float = 100.0) -> float:
    """Clamps a numeric value between min_val and max_val."""
    return max(min_val, min(max_val, val))


def _risk_level(score: int) -> str:
    """
    Map score to risk level:
      0–39   low
      40–59  moderate
      60–74  high
      75–100 severe
    """
    if score >= 75:
        return "severe"
    if score >= 60:
        return "high"
    if score >= 40:
        return "moderate"
    return "low"


# ============================================================
# TRANSPARENT FACTOR FUNCTIONS
# ============================================================

def _temperature_factor(temp: float, opt_min: float, opt_max: float, buffer: float = 10.0) -> float:
    """
    Calculates temperature conduciveness factor (0.0 to 1.0).
    If within [opt_min, opt_max], returns 1.0.
    Falls off smoothly towards 0.0 outside optimal bounds within buffer range.
    """
    if opt_min <= temp <= opt_max:
        return 1.0
    if temp < opt_min:
        diff = opt_min - temp
        return max(0.0, 1.0 - (diff / buffer))
    diff = temp - opt_max
    return max(0.0, 1.0 - (diff / buffer))


def _humidity_factor(humidity: float, threshold: float = 70.0, target: str = "disease") -> float:
    """
    Calculates relative humidity conduciveness factor (0.0 to 1.0).
    For diseases: low below threshold, escalates up to 1.0 as RH nears 100%.
    For pests: dependent on whether dry or humid conditions favor the pest.
    """
    rh = _clamp(humidity, 0.0, 100.0)
    if target == "disease":
        if rh < 40.0:
            return 0.15
        if rh < threshold:
            # Linear rise from 0.15 to 0.50
            return 0.15 + 0.35 * ((rh - 40.0) / max(1.0, threshold - 40.0))
        # Above threshold, sharp rise from 0.50 to 1.00
        return 0.50 + 0.50 * ((rh - threshold) / max(1.0, 100.0 - threshold))

    # For pests
    if target == "pest_dry":
        # Pests like spider mites flourish in 30%-60% RH, suppressed in >80% RH
        if rh <= 55.0:
            return 0.90
        if rh >= 85.0:
            return 0.25
        return 0.90 - 0.65 * ((rh - 55.0) / 30.0)

    # General pests (moderate humidity)
    if 50.0 <= rh <= 80.0:
        return 0.85
    if rh < 50.0:
        return max(0.30, 0.85 - 0.55 * ((50.0 - rh) / 50.0))
    return max(0.35, 0.85 - 0.50 * ((rh - 80.0) / 20.0))


def _rainfall_factor(rainfall: float, target: str = "disease") -> float:
    """
    Calculates precipitation conduciveness factor (0.0 to 1.0).
    For diseases: rainfall causes leaf wetness and spore splash.
    For pests: heavy rain physically dislodges pests and suppresses flight.
    """
    r = max(0.0, rainfall)
    if target == "disease":
        if r == 0.0:
            return 0.15  # Some disease development still possible under high dew/RH
        if r < 5.0:
            return 0.45 + 0.30 * (r / 5.0)  # Light rain / drizzle triggers splash
        if r <= 25.0:
            return 0.75 + 0.25 * ((r - 5.0) / 20.0)
        return 1.0  # Prolonged leaf wetness

    # For pests:
    if r == 0.0:
        return 0.90
    if r < 3.0:
        return 0.80
    if r <= 15.0:
        return max(0.35, 0.80 - 0.45 * ((r - 3.0) / 12.0))
    return 0.20  # Torrential wash-off


def _wind_factor(wind: float, target: str = "disease") -> float:
    """
    Calculates wind speed factor (0.0 to 1.0).
    Wind speeds between 8-25 km/h aid spore and insect flight dispersal.
    High winds (> 40 km/h) dry out foliage faster but can cause physical abrasion.
    """
    w = max(0.0, wind)
    if target == "disease":
        if w < 5.0:
            return 0.40  # Stagnant air increases microclimate humidity in dense canopy
        if 5.0 <= w <= 22.0:
            return 0.80  # Ideal for spore dispersal
        if 22.0 < w <= 40.0:
            return 0.60
        return 0.40  # Very dry/high wind dries canopy

    # Pest dispersal
    if w < 3.0:
        return 0.50
    if 3.0 <= w <= 20.0:
        return 0.85  # Moderate breeze aids insect flight/migration
    if 20.0 < w <= 35.0:
        return 0.50
    return 0.20  # Strong winds prevent insect flight


# ============================================================
# RISK SERVICE CLASS
# ============================================================

class RiskService:
    """
    Deterministic rule-based risk evaluation service for crops.
    """

    def calculate_environmental_risk(
        self,
        temperature: float,
        humidity: float,
        rainfall: float,
        wind: float,
    ) -> int:
        """
        Calculates environmental stress index (0-100) based on weather extremes:
        - Temperature stress (< 10°C cold or > 32°C heat)
        - Moisture stress (flooding > 15mm or severe drought RH < 30%)
        - Wind stress (> 30 km/h lodging/abrasion)
        """
        stress = 15.0  # Baseline ambient stress

        # Temperature extremes
        if temperature < 10.0:
            stress += (10.0 - temperature) * 3.5
        elif temperature > 32.0:
            stress += (temperature - 32.0) * 3.8

        # Extreme rainfall / waterlogging
        if rainfall > 15.0:
            stress += min(35.0, (rainfall - 15.0) * 1.5)

        # Extreme humidity stress (either desiccating or water-saturated heat)
        if humidity < 30.0:
            stress += (30.0 - humidity) * 0.8
        elif humidity > 88.0 and temperature > 28.0:
            stress += (humidity - 88.0) * 1.8

        # Wind stress
        if wind > 30.0:
            stress += min(30.0, (wind - 30.0) * 1.2)

        return int(round(_clamp(stress, 0.0, 100.0)))

    def calculate_crop_risk(
        self,
        crop: str,
        weather: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Calculates disease, pest, environmental, and overall risk for a specific crop.
        Weather dict must provide:
          - temperatureC (or temperature)
          - humidity
          - rainfallMm (or rainfall)
          - windKph (or wind)
        """
        norm_crop = crop.strip().lower()
        profile = CROP_PROFILES.get(norm_crop)
        if profile is None:
            raise ValueError(
                f"Unsupported crop '{crop}'. Supported crops: {', '.join(sorted(SUPPORTED_CROPS))}"
            )

        temp = float(weather.get("temperatureC", weather.get("temperature", 22.0)))
        humidity = float(weather.get("humidity", 60.0))
        rainfall = float(weather.get("rainfallMm", weather.get("rainfall", 0.0)))
        wind = float(weather.get("windKph", weather.get("wind", 10.0)))

        # 1. Disease Risk Factors
        d_temp_f = _temperature_factor(temp, profile.disease_temp_opt[0], profile.disease_temp_opt[1])
        d_rh_f = _humidity_factor(humidity, threshold=profile.disease_rh_threshold, target="disease")
        d_rain_f = _rainfall_factor(rainfall, target="disease")
        d_wind_f = _wind_factor(wind, target="disease")

        # Weighted disease score
        w_temp = 0.35
        w_rh = 0.35
        w_rain = profile.disease_rain_weight
        w_wind = profile.disease_wind_weight
        total_w = w_temp + w_rh + w_rain + w_wind
        raw_disease = 100.0 * (
            w_temp * d_temp_f +
            w_rh * d_rh_f +
            w_rain * d_rain_f +
            w_wind * d_wind_f
        ) / total_w
        disease_risk = int(round(_clamp(raw_disease, 0.0, 100.0)))

        # 2. Pest Risk Factors
        p_temp_f = _temperature_factor(temp, profile.pest_temp_opt[0], profile.pest_temp_opt[1])
        p_rh_target = "pest_dry" if profile.pest_prefers_dry else "pest_general"
        p_rh_f = _humidity_factor(humidity, target=p_rh_target)
        p_rain_f = _rainfall_factor(rainfall, target="pest")
        p_wind_f = _wind_factor(wind, target="pest")

        raw_pest = 100.0 * (
            0.40 * p_temp_f +
            0.25 * p_rh_f +
            0.25 * p_rain_f +
            0.10 * p_wind_f
        )
        pest_risk = int(round(_clamp(raw_pest, 0.0, 100.0)))

        # 3. Environmental Risk
        env_risk = self.calculate_environmental_risk(
            temperature=temp,
            humidity=humidity,
            rainfall=rainfall,
            wind=wind,
        )

        # 4. Overall Risk
        raw_overall = 0.45 * disease_risk + 0.35 * pest_risk + 0.20 * env_risk
        overall_risk = int(round(_clamp(raw_overall, 0.0, 100.0)))
        level = _risk_level(overall_risk)

        return {
            "disease": disease_risk,
            "pest": pest_risk,
            "environmental": env_risk,
            "overall": overall_risk,
            "risk_level": level,
        }

    def calculate_all_crops_risk(
        self,
        weather: Dict[str, Any],
    ) -> list[Dict[str, Any]]:
        """Calculate risk scores across all supported crops in a fixed order."""
        ordered_crops = ["tomato", "potato", "maize", "grape", "apple"]
        results = []
        for c in ordered_crops:
            scores = self.calculate_crop_risk(c, weather)
            results.append({
                "crop": c,
                "scores": scores,
            })
        return results


risk_service = RiskService()
