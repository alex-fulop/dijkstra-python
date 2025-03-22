import json
import csv
from typing import Dict, List, Tuple

class DataManager:
    @staticmethod
    def import_json(file_path: str) -> Tuple[Dict[str, List[float]], List[Tuple[str, str, float]]]:
        """Import nodes and edges from a JSON file"""
        try:
            with open(file_path, 'r') as file:
                data = json.load(file)
                nodes = data.get('nodes', {})
                edges = data.get('edges', [])
                return nodes, edges
        except Exception as e:
            raise Exception(f"Error importing JSON: {str(e)}")

    @staticmethod
    def import_csv(nodes_file: str, edges_file: str) -> Tuple[Dict[str, List[float]], List[Tuple[str, str, float]]]:
        """Import nodes and edges from CSV files"""
        nodes = {}
        edges = []
        
        try:
            # Read nodes
            with open(nodes_file, 'r') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    nodes[row['city']] = [float(row['latitude']), float(row['longitude'])]
            
            # Read edges
            with open(edges_file, 'r') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    edges.append((
                        row['source'],
                        row['target'],
                        float(row['distance'])
                    ))
            
            return nodes, edges
        except Exception as e:
            raise Exception(f"Error importing CSV: {str(e)}")

    @staticmethod
    def export_json(nodes: Dict[str, List[float]], 
                    edges: List[Tuple[str, str, float]], 
                    file_path: str):
        """Export nodes and edges to a JSON file"""
        data = {
            'nodes': nodes,
            'edges': edges
        }
        with open(file_path, 'w') as file:
            json.dump(data, file, indent=4) 