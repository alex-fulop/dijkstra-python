import { useState } from 'react';
import { TextField, Button, Box } from '@mui/material';
import axios from 'axios';

function NodeForm({ onNodeAdd }) {
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/nodes/', {
        name,
        latitude: parseFloat(lat),
        longitude: parseFloat(lng)
      });
      onNodeAdd({ name, latitude: parseFloat(lat), longitude: parseFloat(lng) });
      setName('');
      setLat('');
      setLng('');
    } catch (error) {
      console.error('Error adding node:', error);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <TextField
        label="Node Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        margin="normal"
        fullWidth
      />
      <TextField
        label="Latitude"
        type="number"
        value={lat}
        onChange={(e) => setLat(e.target.value)}
        margin="normal"
        fullWidth
      />
      <TextField
        label="Longitude"
        type="number"
        value={lng}
        onChange={(e) => setLng(e.target.value)}
        margin="normal"
        fullWidth
      />
      <Button type="submit" variant="contained" fullWidth>
        Add Node
      </Button>
    </Box>
  );
}

export default NodeForm; 