from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional, List
from dijkstra import DijkstraAlgorithm
from ai_pathfinder import AIPathfinder

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite's default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize our components
dijkstra = DijkstraAlgorithm()
ai_pathfinder = AIPathfinder()

# Store nodes and their coordinates
nodes = {}  # Global dictionary to store nodes: {name: [lat, lon]}

# Data models
class Node(BaseModel):
    name: str
    latitude: float
    longitude: float

class Edge(BaseModel):
    source: str
    target: str
    weight: Optional[float] = None

class PathRequest(BaseModel):
    start: str
    end: str

@app.post("/nodes/")
async def add_node(node: Node):
    try:
        # Store node coordinates
        nodes[node.name] = [node.latitude, node.longitude]
        return {"message": f"Added node {node.name}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/edges/")
async def add_edge(edge: Edge):
    try:
        if edge.weight is None:
            # Now we can access the nodes dictionary
            print(f"Calculating weight for {edge.source} to {edge.target}")
            source_coords = nodes[edge.source]
            target_coords = nodes[edge.target]
            edge.weight = dijkstra.calculate_distance(
                source_coords[0], source_coords[1],
                target_coords[0], target_coords[1]
            )
            print(f"Weight calculated: {edge.weight}")
        
        dijkstra.add_edge(edge.source, edge.target, edge.weight)
        return {
            "message": f"Added edge from {edge.source} to {edge.target}",
            "distance": edge.weight
        }
    except KeyError:
        raise HTTPException(status_code=400, detail="Node not found")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/path/")
async def find_path(request: PathRequest):
    try:
        path, distance = dijkstra.find_shortest_path(request.start, request.end)
        return {"path": path, "distance": distance}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/import/json/")
async def import_json(data: Dict):
    try:
        # Update global nodes dictionary
        global nodes
        nodes = data.get("nodes", {})
        edges = data.get("edges", [])
        
        # Reset and rebuild graph
        dijkstra.graph = {}
        for source, target, weight in edges:
            dijkstra.add_edge(source, target, weight)
        
        return {"message": "Data imported successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))