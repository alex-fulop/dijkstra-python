import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { IconButton, Box, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

function Map({ nodes, selectedPath, onNodeDelete }) {
  const center = [45.9432, 24.9668]; // Center of Romania

  const handleDelete = async (nodeName) => {
    try {
      await axios.delete(`http://localhost:8000/nodes/${nodeName}`);
      onNodeDelete(nodeName);
    } catch (error) {
      console.error('Error deleting node:', error);
    }
  };

  return (
    <MapContainer 
      center={center} 
      zoom={7} 
      style={{ 
        height: '100%', 
        width: '100%',
        zIndex: 1 
      }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {Object.entries(nodes).map(([name, [lat, lng]]) => (
        <Marker key={name} position={[lat, lng]}>
          <Popup>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              minWidth: '150px',
              py: 0.5
            }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  flex: 1,
                  textAlign: 'center',
                  fontWeight: 'bold'
                }}
              >
                {name}
              </Typography>
              <IconButton 
                size="small" 
                color="error"
                onClick={() => handleDelete(name)}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </Popup>
        </Marker>
      ))}
      {selectedPath && (
        <Polyline
          positions={selectedPath.map(node => nodes[node])}
          color="red"
        />
      )}
    </MapContainer>
  );
}

export default Map; 