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
        """
        path = []  # o variabila pentru drum
        total_distance = 0  # o variabila pentru distanta totala
        current = start  # incepem cu punctul de start
        for wp in waypoints + [
            end
        ]:  # mergem printr-o lista care contine toate waypoint-urile plus punctul de final
            # gasim cel mai scurt drum de la punctul curent la waypoint-ul urmator
            subpath, dist = self.find_shortest_path(current, wp, avoid=avoid)

            # daca nu am gasit niciun drum, returnam o lista goala si distanta infinita
            if not subpath:
                return [], float("inf")

            # daca avem deja un drum (nu e primul waypoint)
            if path:
                # adaugam subdrumul la drumul existent, dar sarim peste primul nod
                # pentru a evita duplicarea nodurilor (nodul curent apare deja in path)
                path += subpath[1:]
            else:
                # daca e primul waypoint, adaugam tot subdrumul
                path += subpath

            # adaugam distanta gasita la distanta totala
            total_distance += dist

            # actualizam punctul curent pentru urmatoarea iteratie
            current = wp

        # returnam drumul complet si distanta totala
        return path, total_distance
