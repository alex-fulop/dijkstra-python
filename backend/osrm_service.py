import requests
from typing import List, Tuple, Dict
import polyline
from math import radians, sin, cos, sqrt, atan2


class OSRMService:
    def __init__(self, base_url: str = "http://router.project-osrm.org/route/v1"):
        self.base_url = base_url
        self.nearest_url = "http://router.project-osrm.org/nearest/v1/driving"

    def calculate_distance(
        self, lat1: float, lon1: float, lat2: float, lon2: float
    ) -> float:
        """Calculate distance between two points using Haversine formula"""
        R = 6371  # Earth's radius in kilometers

        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        distance = R * c

        return distance

    def find_nearest_road_point(self, lat: float, lon: float) -> Tuple[float, float]:
        """
        Find the nearest point on a road to the given coordinates.
        Uses OSRM's nearest service to snap coordinates to the road network.
        """
        url = f"{self.nearest_url}/{lon},{lat}"
        try:
            response = requests.get(url)
            response.raise_for_status()
            data = response.json()
            if data["code"] == "Ok":
                # OSRM returns coordinates in [lon, lat] format
                return (
                    data["waypoints"][0]["location"][1],
                    data["waypoints"][0]["location"][0],
                )
            return lat, lon  # Fallback to original coordinates if nearest service fails
        except Exception as e:
            print(f"Error finding nearest road point: {str(e)}")
            return lat, lon  # Fallback to original coordinates

    def get_route(
        self,
        coordinates: List[Tuple[float, float]],
        avoid_coordinates: List[Tuple[float, float]] = None,
    ) -> Dict:
        """
        Get a route between coordinates using OSRM, ensuring the route follows the graph nodes
        while staying on valid roads.

        Args:
            coordinates: List of (latitude, longitude) tuples representing graph nodes
            avoid_coordinates: List of (latitude, longitude) tuples to avoid (for future use)

        Returns:
            Dict containing:
            - path: List of coordinates forming the route
            - distance: Total distance in kilometers
            - duration: Estimated duration in seconds
            - route_info: List of street names and directions
        """
        if not coordinates or len(coordinates) < 2:
            raise ValueError("At least two coordinates are required")

        if avoid_coordinates is None:
            avoid_coordinates = []

        # Snap each coordinate to the nearest road
        snapped_coordinates = [
            self.find_nearest_road_point(lat, lon) for lat, lon in coordinates
        ]

        # Initialize variables to store the complete route
        complete_path = []
        total_distance = 0
        total_duration = 0
        route_info = []

        # Process each consecutive pair of coordinates
        for i in range(len(snapped_coordinates) - 1):
            start = snapped_coordinates[i]
            end = snapped_coordinates[i + 1]

            # Format coordinates for OSRM API (OSRM expects [lon, lat] format)
            coords_str = f"{start[1]},{start[0]};{end[1]},{end[0]}"

            # Make request to OSRM
            url = f"{self.base_url}/driving/{coords_str}"
            params = {
                "overview": "full",  # Get full route geometry
                "geometries": "polyline",  # Use polyline encoding for efficiency
                "alternatives": "false",  # Don't get alternative routes
                "continue_straight": "false",  # Allow the route to make turns at waypoints
                "steps": "true",  # Get detailed steps to ensure we follow the waypoints
                "annotations": "true",  # Get additional annotations including street names
            }

            # Note: The public OSRM server doesn't support exclude parameters
            # The avoid functionality is handled at the Dijkstra level for node avoidance

            try:
                response = requests.get(url, params=params)
                response.raise_for_status()
                data = response.json()

                if data["code"] != "Ok":
                    raise Exception(f"OSRM API error: {data['message']}")

                route = data["routes"][0]

                # Decode the polyline to get the actual coordinates
                segment_coordinates = polyline.decode(route["geometry"])

                # Convert to (lat, lon) format and add to complete path
                # Skip the first point if it's not the first segment to avoid duplicates
                if i > 0:
                    segment_coordinates = segment_coordinates[1:]
                complete_path.extend([(lat, lon) for lat, lon in segment_coordinates])

                # Add to total distance and duration
                total_distance += (
                    route["distance"] / 1000
                )  # Convert meters to kilometers
                total_duration += route["duration"]

                # Extract route information from steps
                for leg in route["legs"]:
                    for step in leg["steps"]:
                        if "name" in step and step["name"]:
                            street_name = step["name"]
                            if street_name != "unnamed road":
                                route_info.append(street_name)

            except requests.exceptions.RequestException as e:
                raise Exception(f"Error calling OSRM API: {str(e)}")
            except Exception as e:
                raise Exception(f"Error processing OSRM response: {str(e)}")

        return {
            "path": complete_path,
            "distance": total_distance,  # Total distance in kilometers
            "duration": total_duration,  # Duration in seconds
            "route_info": route_info,  # List of street names
            "waypoints": snapped_coordinates,  # Include the snapped waypoints
        }
