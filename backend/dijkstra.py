from typing import Dict, List, Set, Tuple
import heapq
from math import radians, sin, cos, sqrt, atan2

class DijkstraAlgorithm:
    def __init__(self):
        self.graph = {}
        
    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points using Haversine formula"""
        R = 6371  # Earth's radius in kilometers

        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        distance = R * c
        
        return distance  # Returns distance in kilometers
    
    def add_edge(self, source: str, target: str, weight: float):
        """Add an edge to the graph"""
        if source not in self.graph:
            self.graph[source] = []
        if target not in self.graph:
            self.graph[target] = []
            
        self.graph[source].append((target, weight))
        self.graph[target].append((source, weight))  # For undirected graph
        
    def find_shortest_path(self, start: str, end: str) -> Tuple[List[str], float]:
        """Find the shortest path between start and end nodes"""
        distances = {node: float('infinity') for node in self.graph}
        distances[start] = 0
        pq = [(0, start)]
        previous = {node: None for node in self.graph}
        
        while pq:
            current_distance, current_node = heapq.heappop(pq)
            
            if current_node == end:
                break
                
            if current_distance > distances[current_node]:
                continue
                
            for neighbor, weight in self.graph[current_node]:
                distance = current_distance + weight
                
                if distance < distances[neighbor]:
                    distances[neighbor] = distance
                    previous[neighbor] = current_node
                    heapq.heappush(pq, (distance, neighbor))
        
        # Reconstruct path
        path = []
        current_node = end
        while current_node is not None:
            path.append(current_node)
            current_node = previous[current_node]
        path.reverse()
        
        return path, distances[end]