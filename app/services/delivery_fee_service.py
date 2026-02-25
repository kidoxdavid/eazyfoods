"""
Dynamic delivery fee calculation. Used by delivery-estimate and order creation.
Admin configures: base_fee, distance_tiers, traffic/demand multipliers, small order rules.
"""
from typing import Any, Optional


def calculate_dynamic_delivery_fee(
    distance_km: float,
    order_value: float,
    traffic_level: str,
    demand_level: str,
    settings: dict,
) -> float:
    """
    Calculate delivery fee using admin-configured dynamic logic.
    settings: dict with keys base_fee, distance_tiers, traffic_multipliers, demand_multipliers,
              small_order_threshold, small_order_fee.
    """
    base_fee = float(settings.get("dynamic_base_fee", 3.0))
    tiers = settings.get("dynamic_distance_tiers") or [
        {"max_km": 3, "rate_per_km": 0.80},
        {"max_km": 8, "rate_per_km": 0.55},
        {"rate_per_km": 0.40},
    ]
    traffic_multipliers = settings.get("dynamic_traffic_multipliers") or {
        "normal": 1.0,
        "moderate": 1.2,
        "heavy": 1.5,
    }
    demand_multipliers = settings.get("dynamic_demand_multipliers") or {
        "low": 1.0,
        "busy": 1.15,
        "peak": 1.35,
    }
    small_order_threshold = float(settings.get("dynamic_small_order_threshold", 15.0))
    small_order_fee = float(settings.get("dynamic_small_order_fee", 2.0))

    # Distance rate by tier
    distance_rate = None
    for tier in tiers:
        max_km = tier.get("max_km")
        rate = float(tier.get("rate_per_km", 0))
        if max_km is None:
            distance_rate = rate
            break
        if distance_km <= max_km:
            distance_rate = rate
            break
    if distance_rate is None:
        distance_rate = float(tiers[-1].get("rate_per_km", 0.4)) if tiers else 0.4

    distance_fee = distance_km * distance_rate

    # Traffic adjustment
    time_multiplier = float(traffic_multipliers.get(traffic_level, 1.0))
    adjusted_distance_fee = distance_fee * time_multiplier

    # Demand adjustment
    demand_multiplier = float(demand_multipliers.get(demand_level, 1.0))
    adjusted_distance_fee *= demand_multiplier

    # Small order fee
    small_fee = small_order_fee if order_value < small_order_threshold else 0.0

    total = base_fee + adjusted_distance_fee + small_fee
    return round(total, 2)
