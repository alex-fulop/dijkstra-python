import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import { IconButton, Box, Typography, TextField, Button, Switch, FormControlLabel, Tooltip, CircularProgress, Slider } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

function Map({ nodes, selectedPath, onNodeDelete, onNodeAdd, isLoading }) {
  const { t } = useTranslation();
  const center = [45.9432, 24.9668]; // Center of Romania
  const [clickedPosition, setClickedPosition] = useState(null);
  const [newNodeName, setNewNodeName] = useState('');
  const [showAllEdges, setShowAllEdges] = useState(false);
  const [allEdges, setAllEdges] = useState([]);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [kValue, setKValue] = useState(3);
  const [isUpdatingK, setIsUpdatingK] = useState(false);
  const [debouncedKValue, setDebouncedKValue] = useState(3);
  const [lastUpdatedK, setLastUpdatedK] = useState(3); // Add this to track the last successfully updated K value

  // Add effect to fetch edges when nodes change
  useEffect(() => {
    console.log('Nodes changed, fetching edges...');
    fetchEdges();
  }, [nodes]);

  // Add debounce effect for K value updates
  useEffect(() => {
    console.log('K value changed to:', kValue);
    const timer = setTimeout(() => {
      if (debouncedKValue !== kValue) {
        console.log('Setting debounced value to:', kValue);
        setDebouncedKValue(kValue);
      } 
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [kValue]);

  // Handle actual K value updates
  useEffect(() => {
    console.log('Debounced K value changed to:', debouncedKValue);
    const updateKValue = async () => {
      if (debouncedKValue === lastUpdatedK) {
        console.log('Skipping update - value already updated');
        return;
      }
      
      console.log('Updating K value to:', debouncedKValue);
      setIsUpdatingK(true);
      try {
        const response = await axios.post('http://localhost:8000/update-k-value/', { k: debouncedKValue });
        console.log('K value update response:', response.data);
        setLastUpdatedK(debouncedKValue); // Update the last updated value
        setKValue(debouncedKValue);
        
        // Force a refresh of edges
        const edges = await fetchEdges();
        console.log('Edges after K update:', edges);
        
        // Force a re-render of the edges
        setAllEdges([]);
        setTimeout(() => {
          setAllEdges(edges);
        }, 100);
      } catch (error) {
        console.error('Error updating K value:', error);
        setKValue(lastUpdatedK); // Revert to last successful value
      } finally {
        setIsUpdatingK(false);
      }
    };

    updateKValue();
  }, [debouncedKValue]);

  // Add effect to log edge changes
  useEffect(() => {
    console.log('Edges updated:', allEdges);
  }, [allEdges]);

  const fetchEdges = async () => {
    try {
      const response = await axios.get('http://localhost:8000/edges/');
      console.log('Fetched edges:', response.data);
      setAllEdges(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching edges:', error);
      return null;
    }
  };

  const handleDelete = async (nodeName) => {
    try {
      await axios.delete(`http://localhost:8000/nodes/${nodeName}`);
      onNodeDelete(nodeName);
      await fetchEdges(); // Wait for edges to be fetched
    } catch (error) {
      console.error('Error deleting node:', error);
    }
  };

  const handleDeleteEdge = async (source, target) => {
    try {
      // Find the edge in the database
      const edge = allEdges.find(e => 
        (e.source === source && e.target === target) || 
        (e.source === target && e.target === source)
      );
      
      if (edge) {
        await axios.delete(`http://localhost:8000/edges/${edge.id}`);
        setSelectedEdge(null);
        await fetchEdges(); // Wait for edges to be fetched
      }
    } catch (error) {
      console.error('Error deleting edge:', error);
    }
  };

  const handleMapClick = async (latlng) => {
    try {
      // Snap coordinates to nearest road
      const response = await axios.post('http://localhost:8000/snap-to-road/', {
        latitude: latlng.lat,
        longitude: latlng.lng
      });
      
      // Update clicked position with snapped coordinates
      setClickedPosition({
        lat: response.data.latitude,
        lng: response.data.longitude
      });
      setNewNodeName('');
    } catch (error) {
      console.error('Error snapping to road:', error);
      // Fallback to original coordinates if snapping fails
      setClickedPosition(latlng);
      setNewNodeName('');
    }
  };

  const handleAddNode = async () => {
    if (!newNodeName.trim()) return;
    
    try {
      // First snap the coordinates to the nearest road
      const snapResponse = await axios.post('http://localhost:8000/snap-to-road/', {
        latitude: clickedPosition.lat,
        longitude: clickedPosition.lng
      });

      // Then add the node with snapped coordinates
      const response = await axios.post('http://localhost:8000/nodes/', {
        name: newNodeName,
        latitude: snapResponse.data.latitude,
        longitude: snapResponse.data.longitude
      });

      // Wait a bit to ensure the node is properly initialized
      await new Promise(resolve => setTimeout(resolve, 500));

      // Refresh the nodes list
      onNodeAdd();
      
      // Clear the form
      setClickedPosition(null);
      setNewNodeName('');

      // Fetch updated edges
      await fetchEdges();
    } catch (error) {
      console.error('Error adding node:', error);
      // Show error to user
      alert(error.response?.data?.detail || 'Error adding node. Please try again.');
    }
  };

  const handleNodeClick = async (nodeName, event) => {
    // Remove shift-click functionality
    return;
  };

  const getEdgeColor = (source, target) => {
    // Check if this edge is part of the selected path
    if (selectedPath && selectedPath.path && selectedPath.path.length > 0) {
      const sourceIndex = selectedPath.path.indexOf(source);
      const targetIndex = selectedPath.path.indexOf(target);
      // Only highlight if both nodes are in the path and they are consecutive
      if (sourceIndex !== -1 && targetIndex !== -1 && Math.abs(sourceIndex - targetIndex) === 1) {
        return '#FFD700'; // Bright yellow for selected path
      }
    }
    
    // Check if this is the selected edge
    if (selectedEdge && 
        ((selectedEdge.source === source && selectedEdge.target === target) ||
         (selectedEdge.source === target && selectedEdge.target === source))) {
      return '#ff6b6b'; // Highlight color for selected edge
    }
    
    return '#666666'; // Gray for other edges
  };

  const getEdgeWeight = (source, target) => {
    // Make the selected path edges thicker
    if (selectedPath && selectedPath.path) {
      const sourceIndex = selectedPath.path.indexOf(source);
      const targetIndex = selectedPath.path.indexOf(target);
      // Only make thicker if both nodes are in the path and they are consecutive
      if (sourceIndex !== -1 && targetIndex !== -1 && Math.abs(sourceIndex - targetIndex) === 1) {
        return 4; // Thicker line for selected path
      }
    }
    return 2; // Normal thickness for other edges
  };

  const handleKValueChange = (event, newValue) => {
    console.log('Slider value changed:', newValue);
    setKValue(newValue);
  };

  const handleRemoveAllNodes = async () => {
    if (!window.confirm(t('map.confirmRemoveAll'))) {
      return;
    }

    try {
      // Get all node names
      const nodeNames = Object.keys(nodes);
      
      // Delete each node
      for (const nodeName of nodeNames) {
        await axios.delete(`http://localhost:8000/nodes/${nodeName}`);
      }

      // Refresh the nodes list
      onNodeAdd();
      
      // Clear edges
      setAllEdges([]);
    } catch (error) {
      console.error('Error removing all nodes:', error);
      alert(t('map.errorRemovingAll'));
    }
  };

  return (
    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
      {/* Loading Overlay */}
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            zIndex: 2000,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              p: 3,
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 3,
            }}
          >
            <CircularProgress size={40} />
            <Typography variant="body1">
              {t('map.calculatingRoute')}
            </Typography>
          </Box>
        </Box>
      )}

      <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 1000, bgcolor: 'white', p: 2, borderRadius: 1, width: 300 }}>
        <FormControlLabel
          control={
            <Switch
              checked={showAllEdges}
              onChange={(e) => setShowAllEdges(e.target.checked)}
            />
          }
          label={t('map.showAllEdges')}
        />
        
        <Box sx={{ mt: 2 }}>
          <Typography id="k-value-slider" gutterBottom>
            {t('map.routeDensity')}: {kValue}
          </Typography>
          <Slider
            value={kValue}
            onChange={handleKValueChange}
            aria-labelledby="k-value-slider"
            valueLabelDisplay="auto"
            step={1}
            marks
            min={1}
            max={10}
            disabled={isUpdatingK}
          />
          <Typography variant="caption" color="text.secondary">
            {t('map.routeDensityDescription')}
          </Typography>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            color="error"
            onClick={handleRemoveAllNodes}
            fullWidth
            startIcon={<DeleteIcon />}
          >
            {t('map.removeAllNodes')}
          </Button>
        </Box>
      </Box>
      {selectedEdge && (
        <Box sx={{ position: 'absolute', top: 60, left: 16, zIndex: 1000, bgcolor: 'white', p: 1, borderRadius: 1 }}>
          <Typography variant="body2">
            {t('map.selectedEdge', { 
              source: selectedEdge.source, 
              target: selectedEdge.target 
            })}
          </Typography>
          <IconButton 
            size="small" 
            onClick={() => handleDeleteEdge(selectedEdge.source, selectedEdge.target)}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      )}
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
                weight={getEdgeWeight(edge.source, edge.target)}
                opacity={0.6}
                eventHandlers={{
                  click: () => setSelectedEdge(edge)
                }}
              />
            );
          }
          return null;
        })}

        {/* Draw Dijkstra's path */}
        {selectedPath && selectedPath.path && selectedPath.path.length > 1 && selectedPath.path.every(node => nodes[node]) && (
          <Polyline
            positions={selectedPath.path.map(nodeName => {
              const node = nodes[nodeName];
              return node ? [node[0], node[1]] : null;
            }).filter(Boolean)}
            color="#FFD700"
            weight={4}
            opacity={0.8}
          />
        )}

        {/* Draw OSRM path */}
        {selectedPath && selectedPath.coordinates && selectedPath.coordinates.length > 1 && (
          <Polyline
            positions={selectedPath.coordinates}
            color="#FF4500"
            weight={4}
            opacity={0.8}
            dashArray="5, 10"
          />
        )}

        {/* Draw nodes */}
        {Object.entries(nodes).map(([name, coords]) => (
          <Marker
            key={name}
            position={[coords[0], coords[1]]}
            eventHandlers={{
              click: (e) => handleNodeClick(name, e.originalEvent)
            }}
          >
            <Popup>
              <Box>
                <Typography variant="subtitle1">{name}</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(name)}
                    sx={{ color: 'error.main' }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
            </Popup>
          </Marker>
        ))}

        {/* New node marker */}
        {clickedPosition && (
          <Marker position={[clickedPosition.lat, clickedPosition.lng]}>
            <Popup>
              <Box>
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
                  onClick={handleAddNode}
                  disabled={!newNodeName.trim()}
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