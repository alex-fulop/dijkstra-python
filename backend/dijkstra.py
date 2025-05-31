from typing import Dict, List, Set, Tuple
import heapq
from math import radians, sin, cos, sqrt, atan2


class DijkstraAlgorithm:
    # un constructor pentru a putea crea instante din clasa asta
    def __init__(self):
        self.graph = {}

    # float = numere cu virgula
    # metoda de calculat distanta dintre 2 puncte
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

        return distance  # Returns distance in kilometers

    # metoda pentru adauga o linie intre doua puncte pe harta
    def add_edge(self, source: str, target: str, weight: float):
        """Add an edge to the graph"""
        if source not in self.graph:
            self.graph[source] = []
        if target not in self.graph:
            self.graph[target] = []

        self.graph[source].append((target, weight))
        self.graph[target].append((source, weight))  # For undirected graph

    # metoda pentru a gasi cel mai scurt drum
    def find_shortest_path(
        self, start: str, end: str, avoid=None
    ) -> Tuple[List[str], float]:
        """
        Find the shortest path from start to end, optionally avoiding nodes.
        """
        if avoid is None:
            avoid = set()
        else:
            avoid = set(avoid)

        # Initialize distances and previous nodes
        distances = {node: float("infinity") for node in self.graph}
        distances[start] = 0
        previous = {node: None for node in self.graph}

        # Initialize priority queue with start node
        pq = [(0, start)]

        while pq:
            current_distance, current_node = heapq.heappop(pq)

            # Skip if we've found a better path to this node
            if current_distance > distances[current_node]:
                continue

            # If we've reached the end, we're done
            if current_node == end:
                break

            # Skip if this node is in the avoid list
            if current_node in avoid:
                continue

            # Check all neighbors
            for neighbor, weight in self.graph[current_node]:
                # Skip neighbors that are in the avoid list
                if neighbor in avoid:
                    continue

                # Calculate new distance
                distance = current_distance + weight

                # If we found a better path, update it
                if distance < distances[neighbor]:
                    distances[neighbor] = distance
                    previous[neighbor] = current_node
                    heapq.heappush(pq, (distance, neighbor))

        # Reconstruct path
        path = []
        current_node = end

        # If we couldn't reach the end node, return empty path and infinite distance
        if distances[end] == float("infinity"):
            return [], float("infinity")

        # Reconstruct the path from end to start
        while current_node is not None:
            path.append(current_node)
            current_node = previous[current_node]

        # Reverse to get path from start to end
        path.reverse()

        return path, distances[end]

    # metoda pentru a gasi un drum pe harta, trecand prin toate punctele (waypoints) selectate
    def find_path_with_waypoints(
        self, start: str, waypoints: List[str], end: str, avoid=None
    ) -> Tuple[List[str], float]:
        """
        Find a path from start to end, passing through all waypoints in order.
        This method prevents backtracking by checking for common nodes between segments.
        """
        if not waypoints:
            return self.find_shortest_path(start, end, avoid=avoid)

        # Create the full sequence of nodes to visit
        full_sequence = [start] + waypoints + [end]
        complete_path = []
        total_distance = 0

        # Calculate path between each consecutive pair
        for i in range(len(full_sequence) - 1):
            current_start = full_sequence[i]
            current_end = full_sequence[i + 1]

            # Find path between current pair
            subpath, dist = self.find_shortest_path(
                current_start, current_end, avoid=avoid
            )

            if not subpath:
                return [], float("inf")

            # For the first segment, add the entire path
            if i == 0:
                complete_path = subpath[:]
            else:
                # For subsequent segments, check for overlap with the current path
                # Find where the new subpath should connect
                if subpath[0] == complete_path[-1]:
                    # Perfect connection - just add the rest
                    complete_path.extend(subpath[1:])
                else:
                    # Check if any node in the new subpath already exists in our complete path
                    # We'll connect at the last occurrence to avoid backtracking
                    connection_point = -1
                    for j in range(len(complete_path) - 1, -1, -1):
                        if complete_path[j] in subpath:
                            connection_point = j
                            subpath_start = subpath.index(complete_path[j])
                            break

                    if connection_point >= 0:
                        # Trim the complete path to the connection point and add the new segment
                        complete_path = complete_path[: connection_point + 1]
                        complete_path.extend(subpath[subpath_start + 1 :])
                    else:
                        # No connection found, just append (shouldn't happen in a connected graph)
                        complete_path.extend(subpath[1:])

            total_distance += dist

        return complete_path, total_distance
