import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import { IconButton, Box, Typography, TextField, Button, Switch, FormControlLabel } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect } from 'react';

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function Map({ nodes, selectedPath, onNodeDelete, onNodeAdd }) {
  const center = [45.9432, 24.9668]; // Center of Romania
  const [clickedPosition, setClickedPosition] = useState(null);
  const [newNodeName, setNewNodeName] = useState('');
  const [showAllEdges, setShowAllEdges] = useState(false);
  const [allEdges, setAllEdges] = useState([]);

  useEffect(() => {
    const fetchEdges = async () => {
      try {
        const response = await axios.get('http://localhost:8000/edges/');
        setAllEdges(response.data);
      } catch (error) {
        console.error('Error fetching edges:', error);
      }
    };
    fetchEdges();
  }, []);

  const handleDelete = async (nodeName) => {
    try {
      await axios.delete(`http://localhost:8000/nodes/${nodeName}`);
      onNodeDelete(nodeName);
    } catch (error) {
      console.error('Error deleting node:', error);
    }
  };

  const handleMapClick = (latlng) => {
    setClickedPosition(latlng);
    setNewNodeName('');
  };

  const handleAddNode = async () => {
    if (!newNodeName.trim()) return;
    
    try {
      await axios.post('http://localhost:8000/nodes/', {
        name: newNodeName,
        latitude: clickedPosition.lat,
        longitude: clickedPosition.lng
      });
      setClickedPosition(null);
      setNewNodeName('');
      onNodeAdd();
    } catch (error) {
      console.error('Error adding node:', error);
    }
  };

  const getEdgeColor = (source, target) => {
    if (selectedPath && selectedPath.includes(source) && selectedPath.includes(target)) {
      const sourceIndex = selectedPath.indexOf(source);
      const targetIndex = selectedPath.indexOf(target);
      if (Math.abs(sourceIndex - targetIndex) === 1) {
        return '#ff0000'; // Red for selected path
      }
    }
    return '#666666'; // Gray for other edges
  };

  return (
    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
      <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1000, bgcolor: 'white', p: 1, borderRadius: 1 }}>
        <FormControlLabel
          control={
            <Switch
              checked={showAllEdges}
              onChange={(e) => setShowAllEdges(e.target.checked)}
            />
          }
          label="Show All Edges"
        />
      </Box>
      <MapContainer center={center} zoom={7} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapClickHandler onMapClick={handleMapClick} />
        
        {/* Draw all edges if enabled */}
        {showAllEdges && allEdges.map((edge, index) => {
          const sourceNode = nodes[edge.source];
          const targetNode = nodes[edge.target];
          if (sourceNode && targetNode) {
            return (
              <Polyline
                key={`edge-${index}`}
                positions={[
                  [sourceNode[0], sourceNode[1]],
                  [targetNode[0], targetNode[1]]
                ]}
                color={getEdgeColor(edge.source, edge.target)}
                weight={2}
                opacity={0.6}
              />
            );
          }
          return null;
        })}

        {/* Draw selected path */}
        {selectedPath && selectedPath.length > 1 && (
          <Polyline
            positions={selectedPath.map(nodeName => {
              const node = nodes[nodeName];
              return [node[0], node[1]];
            })}
            color="#ff0000"
            weight={3}
          />
        )}

        {/* Draw nodes */}
        {Object.entries(nodes).map(([name, coords]) => (
          <Marker key={name} position={[coords[0], coords[1]]}>
            <Popup>
              <Box>
                <Typography variant="subtitle1">{name}</Typography>
                <IconButton
                  size="small"
                  onClick={() => handleDelete(name)}
                  sx={{ mt: 1 }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Popup>
          </Marker>
        ))}

        {/* New node form */}
        {clickedPosition && (
          <Marker position={[clickedPosition.lat, clickedPosition.lng]}>
            <Popup>
              <Box sx={{ p: 1 }}>
                <TextField
                  label="Node Name"
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  size="small"
                  fullWidth
                  sx={{ mb: 1 }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleAddNode}
                  fullWidth
                >
                  Add Node
                </Button>
              </Box>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </Box>
  );
}

export default Map; 