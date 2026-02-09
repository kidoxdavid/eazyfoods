"""
Google Maps service for routing and ETA calculations
"""
try:
    import googlemaps
    GOOGLEMAPS_AVAILABLE = True
except ImportError:
    GOOGLEMAPS_AVAILABLE = False
    googlemaps = None

from typing import Optional, Dict, Tuple
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class MapsService:
    """Service for Google Maps API operations"""
    
    def __init__(self):
        if not GOOGLEMAPS_AVAILABLE:
            logger.warning("googlemaps package not installed. Maps features will be disabled.")
            self.client = None
            return
            
        self.api_key = getattr(settings, 'GOOGLE_MAPS_API_KEY', None)
        if self.api_key:
            try:
                self.client = googlemaps.Client(key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Google Maps client: {e}")
                self.client = None
        else:
            logger.warning("GOOGLE_MAPS_API_KEY not set. Maps features will be disabled.")
            self.client = None
    
    def is_available(self) -> bool:
        """Check if Maps service is available"""
        return self.client is not None
    
    def get_route(self, origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float) -> Optional[Dict]:
        """
        Get route between two points
        
        Returns:
            Dict with route information or None if unavailable
        """
        if not self.is_available():
            logger.warning("Google Maps client not available")
            return None
        
        try:
            directions = self.client.directions(
                (origin_lat, origin_lng),
                (dest_lat, dest_lng),
                mode="driving",
                alternatives=False
            )
            
            if directions and len(directions) > 0:
                return directions[0]
            return None
        except Exception as e:
            logger.error(f"Error getting route: {e}")
            return None
    
    def calculate_eta(self, origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float) -> Optional[int]:
        """
        Calculate ETA in minutes
        
        Returns:
            ETA in minutes or None if unavailable
        """
        route = self.get_route(origin_lat, origin_lng, dest_lat, dest_lng)
        if route and 'legs' in route and len(route['legs']) > 0:
            duration_seconds = route['legs'][0]['duration']['value']
            return duration_seconds // 60
        return None
    
    def get_distance_km(self, origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float) -> Optional[float]:
        """
        Get distance in kilometers
        
        Returns:
            Distance in km or None if unavailable
        """
        route = self.get_route(origin_lat, origin_lng, dest_lat, dest_lng)
        if route and 'legs' in route and len(route['legs']) > 0:
            distance_meters = route['legs'][0]['distance']['value']
            return distance_meters / 1000
        return None
    
    def get_route_polyline(self, origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float) -> Optional[str]:
        """
        Get encoded polyline for route visualization
        
        Returns:
            Encoded polyline string or None if unavailable
        """
        route = self.get_route(origin_lat, origin_lng, dest_lat, dest_lng)
        if route and 'overview_polyline' in route:
            return route['overview_polyline']['points']
        return None
    
    def get_route_details(self, origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float) -> Optional[Dict]:
        """
        Get complete route details including distance, duration, and polyline
        
        Returns:
            Dict with 'distance_km', 'duration_minutes', 'polyline' or None
        """
        route = self.get_route(origin_lat, origin_lng, dest_lat, dest_lng)
        if not route:
            return None
        
        try:
            leg = route['legs'][0] if route.get('legs') else None
            if not leg:
                return None
            
            return {
                'distance_km': leg['distance']['value'] / 1000,
                'duration_minutes': leg['duration']['value'] // 60,
                'duration_seconds': leg['duration']['value'],
                'polyline': route.get('overview_polyline', {}).get('points'),
                'start_address': leg.get('start_address'),
                'end_address': leg.get('end_address')
            }
        except Exception as e:
            logger.error(f"Error parsing route details: {e}")
            return None


# Singleton instance
maps_service = MapsService()

