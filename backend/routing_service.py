from typing import Dict, List, Tuple, Optional
from dijkstra import DijkstraAlgorithm
from osrm_service import OSRMService


class RoutingService:
    def __init__(self, base_url: str = "http://router.project-osrm.org/route/v1"):
        self.dijkstra = DijkstraAlgorithm()
        self.osrm = OSRMService(base_url)
        self.node_coordinates: Dict[str, Tuple[float, float]] = {}

    def add_node(self, node_id: str, lat: float, lon: float):
        """Add a node with its coordinates to the service"""
        self.node_coordinates[node_id] = (lat, lon)

    def add_edge(self, source: str, target: str):
        """Add an edge between two nodes, calculating the distance using coordinates"""
        if source not in self.node_coordinates or target not in self.node_coordinates:
            raise ValueError(
                f"Both nodes must be added with coordinates first. Source: {source}, Target: {target}"
            )

        lat1, lon1 = self.node_coordinates[source]
        lat2, lon2 = self.node_coordinates[target]
        distance = self.osrm.calculate_distance(lat1, lon1, lat2, lon2)
        self.dijkstra.add_edge(source, target, distance)

    def remove_node(self, node_id: str):
        """Remove a node and its associated edges"""
        if node_id in self.node_coordinates:
            del self.node_coordinates[node_id]
            # Remove edges from dijkstra graph
            if node_id in self.dijkstra.graph:
                del self.dijkstra.graph[node_id]
                # Remove edges from other nodes that point to this node
                for node_edges in self.dijkstra.graph.values():
                    node_edges[:] = [
                        (target, weight)
                        for target, weight in node_edges
                        if target != node_id
                    ]

    def find_route(
        self,
        start: str,
        end: str,
        waypoints: Optional[List[str]] = None,
        avoid: Optional[List[str]] = None,
    ) -> Dict:
        """
        Find a route from start to end, optionally passing through waypoints.
        Returns a dictionary containing the complete route information.
        """
        if waypoints is None:
            waypoints = []

        # Validate that all nodes exist
        all_nodes = [start, end] + waypoints
        missing_nodes = [
            node for node in all_nodes if node not in self.node_coordinates
        ]
        if missing_nodes:
            raise ValueError(f"Nodes not found: {', '.join(missing_nodes)}")

        # Step 1: Use Dijkstra to find the optimal sequence of nodes
        if waypoints:
            path, _ = self.dijkstra.find_path_with_waypoints(
                start, waypoints, end, avoid
            )
        else:
            path, _ = self.dijkstra.find_shortest_path(start, end, avoid)

        if not path:
            raise ValueError("No valid path found between the specified nodes")

        # Step 2: Use OSRM to get the actual route for each segment
        try:
            coordinates = [self.node_coordinates[node] for node in path]
            route_info = self.osrm.get_route(coordinates)
            return {
                "path": route_info["path"],
                "distance": route_info["distance"],
                "duration": route_info["duration"],
                "route_info": route_info["route_info"],
                "waypoints": route_info["waypoints"],
                "node_sequence": path,  # Include the sequence of nodes used
            }
        except Exception as e:
            print(f"Error getting route from OSRM: {str(e)}")
            raise ValueError(f"Error getting route from OSRM: {str(e)}")
