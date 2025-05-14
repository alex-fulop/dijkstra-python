from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional
from dijkstra import DijkstraAlgorithm
from ai_pathfinder import AIPathfinder
import openai
import os
from dotenv import load_dotenv
import google.generativeai as genai
import re
import json
from rapidfuzz import process

# am apelat aceasta metoda pentru a incarca fisierul .env
load_dotenv()

# FastAPI => o librarie, folosita pentru a putea crea endpoint-uri (metode, apelate de frontend care ii transmite date)
app = FastAPI()

# Enable CORS
# adaugare configurari, CORSMiddleware = chestia asta este folosita pentru a trece de siguranta CORS (pentru ca frontendul sa comunice cu backendul)
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

# Set your OpenAI API key (use environment variable in production)
openai.api_key = os.getenv("OPENAI_API_KEY")

# Load your API key from environment variable
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

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

def extract_json_from_text(text):
    # Try to find a JSON object in the text
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        return match.group(0)
    return None

@app.post("/nlp-path/")
async def nlp_path_query(query: dict = Body(...)):
    user_query = query.get("query")
    if not user_query:
        raise HTTPException(status_code=400, detail="No query provided.")

    node_names = list(nodes.keys())
    node_list_str = ", ".join(node_names)
    prompt = (
        f"Available locations: {node_list_str}\n"
        "Extract the following from this route query:\n"
        "- start: the starting city (must be from the available locations)\n"
        "- end: the destination city (must be from the available locations)\n"
        "- waypoints: a list of cities or regions to pass through or stop at (must be from the available locations, can be empty)\n"
        "- avoid: a list of cities or regions to avoid (must be from the available locations, can be empty)\n"
        "- preferences: a list of route preferences (e.g., 'scenic', 'fastest', 'avoid highways', etc.)\n"
        "Respond as JSON with keys: start, end, waypoints, avoid, preferences. "
        "Only use the available locations for start, end, waypoints, and avoid.\n\n"
        f"Query: \"{user_query}\""
    )

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        content = response.text.strip()
        json_str = extract_json_from_text(content)
        if not json_str:
            raise ValueError("No JSON found in model response.")
        parsed = json.loads(json_str)

        print("content:" , content)
        print("Parsed json", parsed)
        print("node names", nodes)
        # Validate locations
        for key in ["start", "end"]:
            if parsed.get(key) not in node_names:
                raise ValueError(f"Location '{parsed.get(key)}' is not in the available nodes.")
        for key in ["waypoints", "avoid"]:
            for loc in parsed.get(key, []):
                if loc not in node_names:
                    raise ValueError(f"Location '{loc}' is not in the available nodes.")

        start = find_node_fuzzy(parsed.get("start"), node_names)
        end = find_node_fuzzy(parsed.get("end"), node_names)
        waypoints = [find_node_fuzzy(wp, node_names) for wp in parsed.get("waypoints", []) if find_node_fuzzy(wp, node_names)]
        avoid = [find_node_fuzzy(av, node_names) for av in parsed.get("avoid", []) if find_node_fuzzy(av, node_names)]

        if not start or not end:
            raise ValueError("Start or end location not found in available nodes.")

        # Use waypoints if provided, else classic Dijkstra
        if waypoints:
            path, distance = dijkstra.find_path_with_waypoints(start, waypoints, end, avoid=avoid)
        else:
            path, distance = dijkstra.find_shortest_path(start, end, avoid=avoid)
        return {"path": path, "distance": distance, "preferences": parsed.get("preferences", [])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def find_node(name, node_names):
    name_norm = name.strip().lower()
    for n in node_names:
        if n.strip().lower() == name_norm:
            return n
    return None

def find_node_fuzzy(name, node_names, threshold=80):
    match, score, _ = process.extractOne(name, node_names, score_cutoff=threshold)
    return match if score >= threshold else None