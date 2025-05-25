from fastapi import FastAPI, HTTPException, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Optional, List
from dijkstra import DijkstraAlgorithm
from ai_pathfinder import AIPathfinder
from osrm_service import OSRMService
from routing_service import RoutingService
import openai
import os
from dotenv import load_dotenv
import google.generativeai as genai
import re
import json
from rapidfuzz import process
from sqlalchemy.orm import Session
from database import get_db, Node, Edge

# Load environment variables
load_dotenv()

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize our components
dijkstra = DijkstraAlgorithm()
ai_pathfinder = AIPathfinder()
osrm = OSRMService()
routing_service = RoutingService()

# Set your OpenAI API key
openai.api_key = os.getenv("OPENAI_API_KEY")

# Load your API key from environment variable
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))


def initialize_routing_service(db: Session):
    """Initialize the routing service with all existing nodes and edges from the database"""
    try:
        # Get all nodes
        nodes = db.query(Node).all()
        for node in nodes:
            routing_service.add_node(node.name, node.latitude, node.longitude)
            print(f"Added node to routing service: {node.name}")

        # Get all edges
        edges = db.query(Edge).all()
        for edge in edges:
            source = db.query(Node).filter(Node.id == edge.source_id).first()
            target = db.query(Node).filter(Node.id == edge.target_id).first()
            if source and target:
                routing_service.add_edge(source.name, target.name)
                print(f"Added edge to routing service: {source.name} -> {target.name}")

    except Exception as e:
        print(f"Error initializing routing service: {str(e)}")


@app.on_event("startup")
async def startup_event():
    """Initialize services when the application starts"""
    db = next(get_db())
    try:
        initialize_routing_service(db)
    finally:
        db.close()


# Data models
class NodeCreate(BaseModel):
    name: str
    latitude: float
    longitude: float


class EdgeCreate(BaseModel):
    source: str
    target: str
    weight: Optional[float] = None


class PathRequest(BaseModel):
    start: str
    end: str
    waypoints: Optional[List[str]] = None
    avoid: Optional[List[str]] = None


@app.post("/nodes/")
async def add_node(node: NodeCreate, db: Session = Depends(get_db)):
    try:
        # Check if node already exists
        db_node = db.query(Node).filter(Node.name == node.name).first()
        if db_node:
            raise HTTPException(status_code=400, detail="Node already exists")

        # Create new node
        db_node = Node(name=node.name, latitude=node.latitude, longitude=node.longitude)
        db.add(db_node)
        db.commit()
        db.refresh(db_node)

        # Update in-memory graph
        dijkstra.graph[node.name] = []

        # Add node to routing service
        routing_service.add_node(node.name, node.latitude, node.longitude)

        # Find nearby nodes and create edges
        MAX_DISTANCE = (
            100  # Maximum distance in kilometers to consider nodes as neighbors
        )
        nearby_nodes = []

        # Get all existing nodes
        existing_nodes = db.query(Node).filter(Node.name != node.name).all()

        for existing_node in existing_nodes:
            distance = dijkstra.calculate_distance(
                node.latitude,
                node.longitude,
                existing_node.latitude,
                existing_node.longitude,
            )

            if distance <= MAX_DISTANCE:
                nearby_nodes.append((existing_node, distance))

        # Create edges to nearby nodes
        created_edges = []
        for nearby_node, distance in nearby_nodes:
            # Create edge in database
            db_edge = Edge(
                source_id=db_node.id, target_id=nearby_node.id, weight=distance
            )
            db.add(db_edge)
            created_edges.append((nearby_node.name, distance))

            # Update in-memory graph
            dijkstra.add_edge(node.name, nearby_node.name, distance)

            # Add edge to routing service
            routing_service.add_edge(node.name, nearby_node.name)

        db.commit()

        return {
            "message": f"Added node {node.name}",
            "connected_to": [
                {"node": name, "distance": dist} for name, dist in created_edges
            ],
        }
    except Exception as e:
        db.rollback()
        print(f"Error adding node: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/edges/")
async def add_edge(edge: EdgeCreate, db: Session = Depends(get_db)):
    try:
        # Get source and target nodes
        source_node = db.query(Node).filter(Node.name == edge.source).first()
        target_node = db.query(Node).filter(Node.name == edge.target).first()

        if not source_node or not target_node:
            raise HTTPException(
                status_code=400, detail="Source or target node not found"
            )

        # Calculate weight if not provided
        if edge.weight is None:
            edge.weight = dijkstra.calculate_distance(
                source_node.latitude,
                source_node.longitude,
                target_node.latitude,
                target_node.longitude,
            )

        # Create edge in database
        db_edge = Edge(
            source_id=source_node.id, target_id=target_node.id, weight=edge.weight
        )
        db.add(db_edge)
        db.commit()

        # Update in-memory graph
        dijkstra.add_edge(edge.source, edge.target, edge.weight)

        routing_service.add_edge(edge.source, edge.target)

        return {
            "message": f"Added edge from {edge.source} to {edge.target}",
            "distance": edge.weight,
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/import/json/")
async def import_json(data: Dict, db: Session = Depends(get_db)):
    try:
        print("Received data:", data)
        nodes_data = data.get("nodes", {})
        edges_data = data.get("edges", [])

        print(f"Processing {len(nodes_data)} nodes and {len(edges_data)} edges")

        # Add new nodes
        print("Adding nodes...")
        for name, coords in nodes_data.items():
            try:
                # Check if node already exists
                existing_node = db.query(Node).filter(Node.name == name).first()
                if not existing_node:
                    db_node = Node(name=name, latitude=coords[0], longitude=coords[1])
                    db.add(db_node)
                    print(f"Added node: {name} with coordinates {coords}")
            except Exception as node_error:
                print(f"Error adding node {name}: {str(node_error)}")
                raise
        db.commit()
        print("Nodes added successfully")

        # Add new edges
        print("Adding edges...")
        for source, target, weight in edges_data:
            try:
                source_node = db.query(Node).filter(Node.name == source).first()
                target_node = db.query(Node).filter(Node.name == target).first()

                if not source_node:
                    raise ValueError(f"Source node '{source}' not found")
                if not target_node:
                    raise ValueError(f"Target node '{target}' not found")

                # Check if edge already exists
                existing_edge = (
                    db.query(Edge)
                    .filter(
                        Edge.source_id == source_node.id,
                        Edge.target_id == target_node.id,
                    )
                    .first()
                )

                if not existing_edge:
                    db_edge = Edge(
                        source_id=source_node.id,
                        target_id=target_node.id,
                        weight=weight,
                    )
                    db.add(db_edge)
                    print(f"Added edge: {source} -> {target} with weight {weight}")
            except Exception as edge_error:
                print(f"Error adding edge {source} -> {target}: {str(edge_error)}")
                raise
        db.commit()
        print("Edges added successfully")

        # Update in-memory graph
        print("Updating in-memory graph...")
        dijkstra.graph = {}
        for node in db.query(Node).all():
            dijkstra.graph[node.name] = []

        for edge in db.query(Edge).all():
            source = db.query(Node).filter(Node.id == edge.source_id).first()
            target = db.query(Node).filter(Node.id == edge.target_id).first()
            dijkstra.add_edge(source.name, target.name, edge.weight)
        print("In-memory graph updated successfully")

        return {"message": "Data imported successfully"}
    except Exception as e:
        print(f"Error in import_json: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/export/")
async def export_data(db: Session = Depends(get_db)):
    try:
        nodes = {}
        edges = []

        # Get all nodes
        db_nodes = db.query(Node).all()
        for node in db_nodes:
            nodes[node.name] = [node.latitude, node.longitude]

        # Get all edges
        db_edges = db.query(Edge).all()
        for edge in db_edges:
            source = db.query(Node).filter(Node.id == edge.source_id).first()
            target = db.query(Node).filter(Node.id == edge.target_id).first()
            edges.append([source.name, target.name, edge.weight])

        return {"nodes": nodes, "edges": edges}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/path/")
async def find_path(request: PathRequest):
    try:
        print(f"Finding path from {request.start} to {request.end}")
        print(f"Waypoints: {request.waypoints}")
        print(f"Avoid: {request.avoid}")

        route = routing_service.find_route(
            request.start, request.end, request.waypoints, request.avoid
        )
        return route
    except ValueError as e:
        print(f"ValueError in find_path: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"Unexpected error in find_path: {str(e)}")
        import traceback

        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/nlp-path/")
async def nlp_path_query(query: dict = Body(...), db: Session = Depends(get_db)):
    user_query = query.get("query")
    current_route = query.get("current_route")

    if not user_query:
        raise HTTPException(status_code=400, detail="No query provided.")

    # Get all nodes from database
    db_nodes = db.query(Node).all()
    node_names = [node.name for node in db_nodes]
    node_list_str = ", ".join(node_names)

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")

        if current_route:
            # Handle follow-up questions about the current route
            prompt = (
                f"Current route: {current_route['path']}\n"
                f"Total distance: {current_route['distance']} km\n\n"
                f"User question: {user_query}\n\n"
                "Provide a helpful response about the route, focusing on:\n"
                "- Tourist attractions and activities\n"
                "- Local cuisine and restaurants\n"
                "- Cultural events and festivals\n"
                "- Travel tips and recommendations\n"
                "Make the response conversational and engaging."
            )
            response = model.generate_content(prompt)
            return {"response": response.text.strip()}
        else:
            # Initial route calculation
            prompt = (
                f"Available locations: {node_list_str}\n\n"
                "The user wants travel recommendations. If they haven't specified a route, ask them to provide a starting point and destination from the available locations.\n"
                "If they have specified a route, extract the following:\n"
                "- start: the starting city (must be from the available locations)\n"
                "- end: the destination city (must be from the available locations)\n"
                "- waypoints: a list of cities or regions to pass through or stop at (must be from the available locations, can be empty)\n"
                "- avoid: a list of cities or regions to avoid (must be from the available locations, can be empty)\n"
                "- preferences: a list of route preferences (e.g., 'scenic', 'fastest', 'avoid highways', etc.)\n\n"
                "If no route is specified, respond with a JSON containing only a 'message' key with a friendly prompt asking for a route.\n"
                "If a route is specified, respond with a JSON containing: start, end, waypoints, avoid, preferences.\n"
                "Only use the available locations for start, end, waypoints, and avoid.\n\n"
                f'Query: "{user_query}"'
            )
            response = model.generate_content(prompt)
            content = response.text.strip()
            json_str = extract_json_from_text(content)
            if not json_str:
                raise ValueError("No JSON found in model response.")
            parsed = json.loads(json_str)

            # If no route was specified, return a friendly message
            if "message" in parsed:
                return {
                    "path": [],
                    "distance": 0,
                    "preferences": [],
                    "tourist_info": {},
                    "message": parsed["message"],
                }

            # Validate locations
            for key in ["start", "end"]:
                if parsed.get(key) not in node_names:
                    raise ValueError(
                        f"Location '{parsed.get(key)}' is not in the available nodes."
                    )
            for key in ["waypoints", "avoid"]:
                for loc in parsed.get(key, []):
                    if loc not in node_names:
                        raise ValueError(
                            f"Location '{loc}' is not in the available nodes."
                        )

            start = find_node_fuzzy(parsed.get("start"), node_names)
            end = find_node_fuzzy(parsed.get("end"), node_names)
            waypoints = [
                find_node_fuzzy(wp, node_names)
                for wp in parsed.get("waypoints", [])
                if find_node_fuzzy(wp, node_names)
            ]
            avoid = [
                find_node_fuzzy(av, node_names)
                for av in parsed.get("avoid", [])
                if find_node_fuzzy(av, node_names)
            ]

            if not start or not end:
                raise ValueError("Start or end location not found in available nodes.")

            # Use waypoints if provided, else classic Dijkstra
            if waypoints:
                path, distance = dijkstra.find_path_with_waypoints(
                    start, waypoints, end, avoid=avoid
                )
            else:
                path, distance = dijkstra.find_shortest_path(start, end, avoid=avoid)

            # Get tourist information for each node in the path
            tourist_info = {}
            for node in path:
                prompt = f"Provide tourist information for {node} including:\n- Top 3 attractions to visit\n- 2 recommended restaurants\n- Any special events or festivals\n- Best time to visit\nFormat the response as a JSON with these keys: attractions, restaurants, events, best_time"
                response = model.generate_content(prompt)
                content = response.text.strip()
                json_str = extract_json_from_text(content)
                if json_str:
                    tourist_info[node] = json.loads(json_str)

            return {
                "path": path,
                "distance": distance,
                "preferences": parsed.get("preferences", []),
                "tourist_info": tourist_info,
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/tourist-info/")
async def get_tourist_info(route: dict = Body(...)):
    """Get tourist information for a list of locations"""
    locations = route.get("locations", [])
    if not locations:
        raise HTTPException(status_code=400, detail="No locations provided.")

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        tourist_info = {}

        for location in locations:
            prompt = f"Provide tourist information for {location} including:\n- Top 3 attractions to visit\n- 2 recommended restaurants\n- Any special events or festivals\n- Best time to visit\nFormat the response as a JSON with these keys: attractions, restaurants, events, best_time"
            response = model.generate_content(prompt)
            content = response.text.strip()
            json_str = extract_json_from_text(content)
            if json_str:
                tourist_info[location] = json.loads(json_str)

        return {"tourist_info": tourist_info}
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


def extract_json_from_text(text):
    # Find JSON-like content in the text
    json_pattern = r"\{[\s\S]*\}"
    match = re.search(json_pattern, text)
    if match:
        return match.group(0)
    return None


@app.get("/nodes/")
async def get_nodes(db: Session = Depends(get_db)):
    try:
        nodes = {}
        db_nodes = db.query(Node).all()
        for node in db_nodes:
            nodes[node.name] = [node.latitude, node.longitude]
        return nodes
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/nodes/{node_name}")
async def delete_node(node_name: str, db: Session = Depends(get_db)):
    try:
        # Find the node
        node = db.query(Node).filter(Node.name == node_name).first()
        if not node:
            raise HTTPException(status_code=404, detail="Node not found")

        # Delete all edges connected to this node
        db.query(Edge).filter(
            (Edge.source_id == node.id) | (Edge.target_id == node.id)
        ).delete()

        # Delete the node
        db.delete(node)
        db.commit()

        # Update in-memory graph
        if node_name in dijkstra.graph:
            del dijkstra.graph[node_name]
            # Remove edges from other nodes that point to this node
            for node_edges in dijkstra.graph.values():
                node_edges[:] = [
                    (target, weight)
                    for target, weight in node_edges
                    if target != node_name
                ]

        routing_service.remove_node(node_name)

        return {"message": f"Node {node_name} deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/edges/")
async def get_edges(db: Session = Depends(get_db)):
    try:
        edges = []
        db_edges = db.query(Edge).all()
        for edge in db_edges:
            source = db.query(Node).filter(Node.id == edge.source_id).first()
            target = db.query(Node).filter(Node.id == edge.target_id).first()
            edges.append(
                {"source": source.name, "target": target.name, "weight": edge.weight}
            )
        return edges
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
