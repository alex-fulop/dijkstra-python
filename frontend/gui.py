import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import folium
import webbrowser
import os
from backend.dijkstra import DijkstraAlgorithm
from backend.ai_pathfinder import AIPathfinder
from backend.data_manager import DataManager
import json

class PathfinderGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Pathfinder with Map")
        self.dijkstra = DijkstraAlgorithm()
        self.ai_pathfinder = AIPathfinder()
        self.nodes = {}  # Store node coordinates {node_name: (lat, lon)}
        self.map = None
        self.initialize_map()
        
        # Create GUI elements
        self.create_widgets()
    
    def initialize_map(self):
        # Initialize map centered on a default location (e.g., New York City)
        self.map = folium.Map(
            location=[40.7128, -74.0060],
            zoom_start=13
        )
        
    def create_widgets(self):
        # Create main frames
        left_frame = ttk.Frame(self.root)
        left_frame.grid(row=0, column=0, padx=10, pady=5, sticky="nsew")
        
        # Node addition frame
        node_frame = ttk.LabelFrame(left_frame, text="Add Node", padding="10")
        node_frame.grid(row=0, column=0, padx=5, pady=5, sticky="ew")
        
        ttk.Label(node_frame, text="Node Name:").grid(row=0, column=0, padx=5)
        self.node_name_entry = ttk.Entry(node_frame)
        self.node_name_entry.grid(row=0, column=1, padx=5)
        
        ttk.Label(node_frame, text="Latitude:").grid(row=0, column=2, padx=5)
        self.lat_entry = ttk.Entry(node_frame)
        self.lat_entry.grid(row=0, column=3, padx=5)
        
        ttk.Label(node_frame, text="Longitude:").grid(row=0, column=4, padx=5)
        self.lon_entry = ttk.Entry(node_frame)
        self.lon_entry.grid(row=0, column=5, padx=5)
        
        ttk.Button(node_frame, text="Add Node", 
                  command=self.add_node).grid(row=0, column=6, padx=5)
        
        # Edge addition frame
        edge_frame = ttk.LabelFrame(left_frame, text="Add Edge", padding="10")
        edge_frame.grid(row=1, column=0, padx=5, pady=5, sticky="ew")
        
        ttk.Label(edge_frame, text="Source:").grid(row=0, column=0, padx=5)
        self.source_entry = ttk.Entry(edge_frame)
        self.source_entry.grid(row=0, column=1, padx=5)
        
        ttk.Label(edge_frame, text="Target:").grid(row=0, column=2, padx=5)
        self.target_entry = ttk.Entry(edge_frame)
        self.target_entry.grid(row=0, column=3, padx=5)
        
        ttk.Button(edge_frame, text="Add Edge", 
                  command=self.add_edge).grid(row=0, column=4, padx=5)
        
        # Path finding frame
        path_frame = ttk.LabelFrame(left_frame, text="Find Path", padding="10")
        path_frame.grid(row=2, column=0, padx=5, pady=5, sticky="ew")
        
        ttk.Label(path_frame, text="Start:").grid(row=0, column=0, padx=5)
        self.start_entry = ttk.Entry(path_frame)
        self.start_entry.grid(row=0, column=1, padx=5)
        
        ttk.Label(path_frame, text="End:").grid(row=0, column=2, padx=5)
        self.end_entry = ttk.Entry(path_frame)
        self.end_entry.grid(row=0, column=3, padx=5)
        
        ttk.Button(path_frame, text="Find Path", 
                  command=self.find_path).grid(row=0, column=4, padx=5)
        
        # Map control frame
        map_frame = ttk.LabelFrame(left_frame, text="Map Controls", padding="10")
        map_frame.grid(row=3, column=0, padx=5, pady=5, sticky="ew")
        
        ttk.Button(map_frame, text="Show Map", 
                  command=self.show_map).grid(row=0, column=0, padx=5)
        ttk.Button(map_frame, text="Clear Map", 
                  command=self.clear_map).grid(row=0, column=1, padx=5)
        
        # Result display
        self.result_text = tk.Text(left_frame, height=10, width=50)
        self.result_text.grid(row=4, column=0, padx=5, pady=5)
        
        # Add Import/Export frame
        data_frame = ttk.LabelFrame(left_frame, text="Data Management", padding="10")
        data_frame.grid(row=5, column=0, padx=5, pady=5, sticky="ew")
        
        ttk.Button(data_frame, text="Import JSON", 
                  command=self.import_json_data).grid(row=0, column=0, padx=5)
        ttk.Button(data_frame, text="Import CSV", 
                  command=self.import_csv_data).grid(row=0, column=1, padx=5)
        ttk.Button(data_frame, text="Export JSON", 
                  command=self.export_json_data).grid(row=0, column=2, padx=5)
        ttk.Button(data_frame, text="Load Romania Dataset", 
                  command=self.load_romania_dataset).grid(row=0, column=3, padx=5)
        
    def add_node(self):
        try:
            name = self.node_name_entry.get()
            lat = float(self.lat_entry.get())
            lon = float(self.lon_entry.get())
            
            self.nodes[name] = (lat, lon)
            
            # Add marker to map
            folium.Marker(
                [lat, lon],
                popup=name,
                icon=folium.Icon(color='red', icon='info-sign')
            ).add_to(self.map)
            
            self.result_text.insert(tk.END, 
                f"Added node: {name} at ({lat}, {lon})\n")
            
        except ValueError:
            messagebox.showerror("Error", "Please enter valid coordinates")
    
    def add_edge(self):
        try:
            source = self.source_entry.get()
            target = self.target_entry.get()
            
            if source not in self.nodes or target not in self.nodes:
                raise ValueError("Both nodes must exist")
            
            # Calculate distance between nodes
            source_coords = self.nodes[source]
            target_coords = self.nodes[target]
            
            # Add edge to graph
            self.dijkstra.add_edge(source, target, 1.0)  # Using simple weight for now
            
            # Draw line on map
            folium.PolyLine(
                locations=[source_coords, target_coords],
                weight=2,
                color='blue',
                opacity=0.8
            ).add_to(self.map)
            
            self.result_text.insert(tk.END, 
                f"Added edge: {source} -> {target}\n")
            
        except ValueError as e:
            messagebox.showerror("Error", str(e))
    
    def find_path(self):
        try:
            start = self.start_entry.get()
            end = self.end_entry.get()
            
            path, distance = self.dijkstra.find_shortest_path(start, end)
            
            # Draw path on map
            path_coords = [self.nodes[node] for node in path]
            folium.PolyLine(
                locations=path_coords,
                weight=4,
                color='red',
                opacity=0.8
            ).add_to(self.map)
            
            self.result_text.insert(tk.END, 
                f"\nShortest path: {' -> '.join(path)}\n")
            self.result_text.insert(tk.END, f"Total distance: {distance}\n")
            
            # Show updated map
            self.show_map()
            
        except Exception as e:
            messagebox.showerror("Error", str(e))
    
    def show_map(self):
        # Save map to HTML file and open in browser
        map_file = "map.html"
        self.map.save(map_file)
        webbrowser.open('file://' + os.path.realpath(map_file))
    
    def clear_map(self):
        self.initialize_map()
        for name, (lat, lon) in self.nodes.items():
            folium.Marker(
                [lat, lon],
                popup=name,
                icon=folium.Icon(color='red', icon='info-sign')
            ).add_to(self.map)

    def import_json_data(self):
        try:
            file_path = filedialog.askopenfilename(
                filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
            )
            if file_path:
                nodes, edges = DataManager.import_json(file_path)
                self.clear_map()
                self.nodes = {}
                self.dijkstra = DijkstraAlgorithm()
                
                # Add nodes
                for name, coords in nodes.items():
                    self.nodes[name] = coords
                    folium.Marker(
                        coords,
                        popup=name,
                        icon=folium.Icon(color='red', icon='info-sign')
                    ).add_to(self.map)
                
                # Add edges
                for source, target, distance in edges:
                    self.dijkstra.add_edge(source, target, distance)
                    source_coords = self.nodes[source]
                    target_coords = self.nodes[target]
                    folium.PolyLine(
                        locations=[source_coords, target_coords],
                        weight=2,
                        color='blue',
                        opacity=0.8
                    ).add_to(self.map)
                
                self.result_text.insert(tk.END, 
                    f"Imported {len(nodes)} nodes and {len(edges)} edges\n")
                self.show_map()
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def import_csv_data(self):
        try:
            nodes_file = filedialog.askopenfilename(
                title="Select nodes CSV file",
                filetypes=[("CSV files", "*.csv"), ("All files", "*.*")]
            )
            edges_file = filedialog.askopenfilename(
                title="Select edges CSV file",
                filetypes=[("CSV files", "*.csv"), ("All files", "*.*")]
            )
            
            if nodes_file and edges_file:
                nodes, edges = DataManager.import_csv(nodes_file, edges_file)
                # Same processing as in import_json_data
                # ... (implementation similar to import_json_data)

        except Exception as e:
            messagebox.showerror("Error", str(e))

    def export_json_data(self):
        try:
            file_path = filedialog.asksaveasfilename(
                defaultextension=".json",
                filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
            )
            if file_path:
                # Collect edges from dijkstra graph
                edges = []
                for source in self.dijkstra.graph:
                    for target, weight in self.dijkstra.graph[source]:
                        if (target, source, weight) not in edges:  # Avoid duplicates
                            edges.append((source, target, weight))
                
                DataManager.export_json(self.nodes, edges, file_path)
                self.result_text.insert(tk.END, "Data exported successfully\n")
        except Exception as e:
            messagebox.showerror("Error", str(e))

    def load_romania_dataset(self):
        romania_data = {
            "nodes": {
                "Oradea": [47.0722, 21.9217],
                "Zerind": [46.6225, 21.5175],
                # ... (add all Romania nodes from previous example)
            },
            "edges": [
                ["Oradea", "Zerind", 71],
                ["Oradea", "Sibiu", 151],
                # ... (add all Romania edges from previous example)
            ]
        }
        
        try:
            self.clear_map()
            self.nodes = {}
            self.dijkstra = DijkstraAlgorithm()
            
            # Process nodes and edges similar to import_json_data
            for name, coords in romania_data["nodes"].items():
                self.nodes[name] = coords
                folium.Marker(
                    coords,
                    popup=name,
                    icon=folium.Icon(color='red', icon='info-sign')
                ).add_to(self.map)
            
            for source, target, distance in romania_data["edges"]:
                self.dijkstra.add_edge(source, target, distance)
                source_coords = self.nodes[source]
                target_coords = self.nodes[target]
                folium.PolyLine(
                    locations=[source_coords, target_coords],
                    weight=2,
                    color='blue',
                    opacity=0.8
                ).add_to(self.map)
            
            self.result_text.insert(tk.END, "Romania dataset loaded successfully\n")
            self.show_map()
        except Exception as e:
            messagebox.showerror("Error", str(e))