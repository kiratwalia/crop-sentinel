"""
CropCare AI - Recommendation Service
====================================

Generates deterministic, context-aware agronomic recommendations by combining:
1. AI leaf analysis finding (condition, confidence, severity, prediction_type)
2. Target crop
3. Current weather observations
4. Rule-based risk scores (disease, pest, environmental, overall)

SAFETY RULES & EPIDEMIOLOGICAL INTEGRITY:
- The AI is a screening assistant, not a guaranteed diagnosis.
- Risk scores represent environmental conduciveness, NOT proof of pathogen presence.
- Never claim weather proves a disease exists.
- Never invent specific pesticide doses or off-label chemical recipes.
- All chemical advice is kept general and includes:
  "Follow product label and local agricultural guidance."
- If AI analysis is uncertain (confidence < 0.65 or prediction_type == "uncertain"),
  NEVER generate disease-specific chemical treatments. Instead, provide safe triage advice
  (retaking clear photos, consulting local agricultural extension).
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

CHEMICAL_DISCLAIMER = "Follow product label and local agricultural guidance."


class RecommendationService:
    """
    Deterministic rule-based recommendation engine.
    """

    def generate_recommendations(
        self,
        crop: str,
        weather: Optional[Dict[str, Any]] = None,
        risk_scores: Optional[Dict[str, Any]] = None,
        analysis: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Generate prioritized recommendations across immediate, monitoring, and preventive categories.
        """
        norm_crop = crop.strip().lower()
        w = weather or {}
        r = risk_scores or {}

        disease_score = int(r.get("disease", 50))
        pest_score = int(r.get("pest", 50))
        env_score = int(r.get("environmental", 50))
        overall_score = int(r.get("overall", 50))

        humidity = float(w.get("humidity", 60.0))
        rainfall = float(w.get("rainfallMm", 0.0))
        temp = float(w.get("temperatureC", 24.0))

        recommendations: List[Dict[str, Any]] = []

        # ----------------------------------------------------
        # SCENARIO A: UNCERTAIN AI RESULT
        # ----------------------------------------------------
        is_uncertain = False
        if analysis:
            pred_type = str(analysis.get("prediction_type", "")).lower()
            confidence = float(analysis.get("confidence", 0.0))
            if pred_type == "uncertain" or confidence < 0.65:
                is_uncertain = True

        if is_uncertain:
            recommendations.append({
                "id": f"{norm_crop}-recheck-photo",
                "priority": "high",
                "category": "immediate",
                "title": "Recheck leaf image / capture a clearer photo",
                "description": (
                    "Visual symptoms were ambiguous or image resolution was insufficient "
                    "for a reliable automated screening. Recheck the leaf image, capture a clearer image in focus, "
                    "or consult an agricultural expert. Do not apply disease-specific chemical treatments based on an uncertain scan."
                ),
                "reason": (
                    "Automated screening requires clear, in-focus photos of leaf margins under indirect daylight "
                    "to differentiate physiological stress from biotic infection."
                ),
                "crop": norm_crop,
                "steps": [
                    "Isolate a single leaf showing distinct, active lesion borders.",
                    "Retake photos in bright, indirect daylight avoiding shadows or extreme glare.",
                    "Ensure the camera is parallel to the leaf surface and tap to focus.",
                ],
                "organic": ["Physical inspection of leaf undersides with a 10x hand lens"],
                "chemical": [f"No chemical application recommended until diagnosis is verified. {CHEMICAL_DISCLAIMER}"],
            })

            recommendations.append({
                "id": f"{norm_crop}-consult-extension",
                "priority": "medium",
                "category": "monitoring",
                "title": "Consult local agricultural extension officer",
                "description": (
                    "Take a fresh leaf sample in a sealed plastic bag to your nearest Krishi Vigyan Kendra "
                    "or certified plant pathologist for microscope confirmation."
                ),
                "reason": (
                    "Multiple nutritional deficiencies and viral vectors produce overlapping foliar chlorosis "
                    "that requires physical verification before treatment."
                ),
                "crop": norm_crop,
                "steps": [
                    "Collect 2-3 symptomatic leaves and 1 healthy control leaf from the same plot.",
                    "Place in a ventilated paper or plastic bag and keep out of direct sunlight.",
                    "Contact your regional university or extension diagnostic clinic.",
                ],
                "organic": ["Maintain field records of when chlorosis or spots were first observed"],
                "chemical": [f"Avoid broad-spectrum chemical sprays while diagnosis is pending. {CHEMICAL_DISCLAIMER}"],
            })

            recommendations.append({
                "id": f"{norm_crop}-safe-cultural",
                "priority": "low",
                "category": "preventive",
                "title": "Sanitize equipment and inspect nearby rows",
                "description": (
                    "Practice standard preventive crop hygiene while monitoring symptomatic plants for progression."
                ),
                "reason": (
                    "Routine farm biosecurity stops unknown pathogens from spreading across unaffected field blocks."
                ),
                "crop": norm_crop,
                "steps": [
                    "Disinfect pruning shears and harvesting knives with 70% alcohol or 10% bleach between rows.",
                    "Avoid touching wet foliage to minimize mechanical transmission.",
                    "Ensure adequate row spacing to promote air circulation.",
                ],
                "organic": ["Biological compost tea to encourage beneficial phyllosphere microflora"],
                "chemical": [f"Use certified clean water for any foliar sprays. {CHEMICAL_DISCLAIMER}"],
            })

            return recommendations

        # ----------------------------------------------------
        # SCENARIO B: VERIFIED AI RESULT
        # ----------------------------------------------------
        condition = str(analysis.get("condition", "")).strip() if analysis else ""
        confidence = float(analysis.get("confidence", 0.0)) if analysis else 0.0
        severity = str(analysis.get("severity", "")).lower() if analysis else ""

        has_ai_detection = bool(condition and condition.lower() not in {"healthy", "unknown"})

        if has_ai_detection:
            # High severity & high confidence AI finding -> Immediate Action
            if severity == "high" or confidence >= 0.80:
                recommendations.append({
                    "id": f"{norm_crop}-immediate-inspection",
                    "priority": "high",
                    "category": "immediate",
                    "title": f"Inspect affected {norm_crop} plants for {condition}",
                    "description": (
                        f"AI screening flagged {condition} with {round(confidence * 100)}% confidence "
                        f"and {severity or 'elevated'} severity. Thoroughly inspect surrounding plants in the same row."
                    ),
                    "reason": (
                        f"Early isolation and spot-treatment of {condition} lesions prevents exponential pathogen "
                        f"sporulation into adjacent healthy crop canopies."
                    ),
                    "crop": norm_crop,
                    "steps": [
                        f"Flag and quarantine plants showing characteristic {condition} symptoms.",
                        "Carefully prune infected lower foliage and seal in bags for disposal away from fields.",
                        "Wash hands and sterilize cutting tools immediately after handling infected foliage.",
                    ],
                    "organic": [
                        "Neem seed kernel extract (NSKE 5%) foliar spray",
                        "Biological copper-soap or bio-fungicide formulation",
                    ],
                    "chemical": [
                        f"Targeted protective fungicide or pesticide registered for {norm_crop}. {CHEMICAL_DISCLAIMER}",
                        f"Observe pre-harvest interval (PHI) and safety wear instructions. {CHEMICAL_DISCLAIMER}",
                    ],
                })
            else:
                recommendations.append({
                    "id": f"{norm_crop}-targeted-monitoring",
                    "priority": "high",
                    "category": "immediate",
                    "title": f"Targeted monitoring for {condition}",
                    "description": (
                        f"Early symptoms consistent with {condition} detected. Verify progression on newly emerging leaves."
                    ),
                    "reason": (
                        "Intervening during initial lesion onset stops secondary cycles before systemic spread occurs."
                    ),
                    "crop": norm_crop,
                    "steps": [
                        "Check 20 consecutive plants across a zigzag field pattern.",
                        "Note whether lesions are expanding or remaining restricted.",
                    ],
                    "organic": ["Approved foliar bio-fungicide or botanical extract"],
                    "chemical": [f"Preventative barrier spray if wet weather persists. {CHEMICAL_DISCLAIMER}"],
                })

        # ----------------------------------------------------
        # SCENARIO C: WEATHER & RISK-DRIVEN RECOMMENDATIONS
        # ----------------------------------------------------

        # 1. High Disease Risk / Conducive Moisture
        if disease_score >= 60 or (humidity >= 75 and rainfall > 0):
            recommendations.append({
                "id": f"{norm_crop}-disease-scouting",
                "priority": "high" if disease_score >= 75 else "medium",
                "category": "immediate" if disease_score >= 75 else "monitoring",
                "title": f"Scout {norm_crop} lower canopy and optimize irrigation",
                "description": (
                    f"Current environmental conditions (humidity {round(humidity)}%, "
                    f"{round(rainfall, 1)}mm rainfall) create microclimatic moisture conducive to fungal infection. "
                    "Avoid overhead irrigation and scout lower leaf tiers."
                ),
                "reason": (
                    "Free water droplets and high humidity (>75%) enable fungal spores to germinate "
                    "within 4 to 8 hours on susceptible leaf surfaces. Note: weather indicates favorable conditions, not guaranteed disease."
                ),
                "crop": norm_crop,
                "steps": [
                    "Switch from overhead sprinkler to drip or basin irrigation at soil level.",
                    "Water in early morning hours to allow rapid foliage drying under daytime sunlight.",
                    "Clear weeds along plant rows to increase airflow through the lower canopy.",
                ],
                "organic": [
                    "Bordeaux mixture (1%) or copper hydroxide protective wash",
                    "Trichoderma viride bio-agent soil and foliar drench",
                ],
                "chemical": [
                    f"Contact protective fungicide application prior to extended rain events. {CHEMICAL_DISCLAIMER}",
                ],
            })
        elif disease_score >= 40:
            recommendations.append({
                "id": f"{norm_crop}-disease-routine-check",
                "priority": "medium",
                "category": "monitoring",
                "title": f"Twice-weekly foliar disease inspection for {norm_crop}",
                "description": (
                    f"Moderate disease risk index ({disease_score}/100). Scout leaf undersides twice weekly."
                ),
                "reason": (
                    "Routine scouting catches early foci before weather shifts towards high-risk conditions."
                ),
                "crop": norm_crop,
                "steps": [
                    "Inspect representative sample points across field edges and center.",
                    "Remove fallen plant debris from between furrows.",
                ],
                "organic": ["Preventative neem oil application (1500 ppm)"],
                "chemical": [f"Maintain standard protective spray schedule if required. {CHEMICAL_DISCLAIMER}"],
            })

        # 2. High Pest Risk
        if pest_score >= 60:
            recommendations.append({
                "id": f"{norm_crop}-pest-scouting",
                "priority": "high" if pest_score >= 75 else "medium",
                "category": "immediate" if pest_score >= 75 else "monitoring",
                "title": f"Field scouting for {norm_crop} insect pests & sticky traps",
                "description": (
                    f"Elevated pest risk score ({pest_score}/100) indicates temperatures and dry spells favorable "
                    "for pest reproduction and flight activity."
                ),
                "reason": (
                    "Warm temperatures accelerate insect development cycles and egg oviposition. "
                    "Early physical trapping detects population spikes before economic injury levels are reached."
                ),
                "crop": norm_crop,
                "steps": [
                    "Install yellow sticky traps (5-8 per acre) at crop canopy height for sucking pests.",
                    "Inspect 10 random leaf clusters per acre for egg masses or nymph colonies.",
                    "Check for pest frass, chewed leaf margins, or honeydew secretions.",
                ],
                "organic": [
                    "Neem oil (0.5%) spray with mild agricultural surfactant",
                    "Release of beneficial parasitoids (e.g. Trichogramma) or predatory ladybugs",
                ],
                "chemical": [
                    f"Selective insecticide only if economic threshold is exceeded. {CHEMICAL_DISCLAIMER}",
                ],
            })

        # 3. Environmental / Weather Stress
        if env_score >= 60:
            recommendations.append({
                "id": f"{norm_crop}-env-mitigation",
                "priority": "medium",
                "category": "monitoring",
                "title": f"Mitigate environmental stress on {norm_crop}",
                "description": (
                    f"Weather shows elevated environmental stress (index {env_score}/100) due to "
                    f"temperature ({round(temp, 1)}°C) and precipitation patterns."
                ),
                "reason": (
                    "Stressed host plants experience compromised cell wall defenses, increasing vulnerability "
                    "to opportunistic fungal and bacterial colonization."
                ),
                "crop": norm_crop,
                "steps": [
                    "Ensure adequate soil drainage to prevent root hypoxia if rainfall is heavy.",
                    "Apply organic straw mulch around crop basins to buffer soil moisture and temperature.",
                    "Avoid nitrogen-heavy top dressing during periods of acute environmental stress.",
                ],
                "organic": ["Foliar application of seaweed extract or humic substances for stress resilience"],
                "chemical": [f"Balanced micronutrient spray (zinc, boron) to support vitality. {CHEMICAL_DISCLAIMER}"],
            })

        # 4. Low Risk Baseline (Preventive practices)
        if overall_score < 40 and not has_ai_detection:
            recommendations.append({
                "id": f"{norm_crop}-routine-monitoring",
                "priority": "medium",
                "category": "monitoring",
                "title": "Maintain routine crop monitoring",
                "description": (
                    f"Overall risk index is currently low ({overall_score}/100). Current weather does not favor "
                    "rapid disease epidemics or pest surges. Avoid unnecessary prophylactic sprays."
                ),
                "reason": (
                    "Preventing unnecessary pesticide application preserves beneficial insect predators and saves operational input costs."
                ),
                "crop": norm_crop,
                "steps": [
                    "Perform routine weekly scouting walkthrough.",
                    "Record crop growth stage and canopy vigor in field log.",
                ],
                "organic": ["Encourage natural biocontrol agents and flowering borders"],
                "chemical": [f"Refrain from routine chemical treatments while risk is low. {CHEMICAL_DISCLAIMER}"],
            })

        # 5. Core Preventive Hygiene (Always present in preventive category)
        recommendations.append({
            "id": f"{norm_crop}-preventive-sanitation",
            "priority": "low",
            "category": "preventive",
            "title": f"Long-term preventive sanitation & crop health for {norm_crop}",
            "description": (
                f"Establish cultural practices that safeguard {norm_crop} throughout the growing cycle."
            ),
            "reason": (
                "Field sanitation and crop rotation break pathogen life cycles and reduce residual soil inoculum."
            ),
            "crop": norm_crop,
            "steps": [
                f"Rotate {norm_crop} with non-host botanical families every 2-3 seasons.",
                "Ensure seed tubers/seedlings are sourced from certified disease-free nurseries.",
                "Maintain balanced soil nutrition based on recent soil testing; avoid excessive vegetative nitrogen.",
            ],
            "organic": [
                "Organic compost application to build soil microbial diversity",
                "Intercropping with repellent aromatic plants (marigolds, alliums)",
            ],
            "chemical": [
                f"Pre-plant seed/tuber treatment with registered protectant. {CHEMICAL_DISCLAIMER}",
            ],
        })

        return recommendations


recommendation_service = RecommendationService()
