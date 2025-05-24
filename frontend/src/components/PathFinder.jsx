import { useState, useEffect } from 'react';
import { TextField, Button, Box, MenuItem, Typography } from '@mui/material';
import axios from 'axios';

function PathFinder({ nodes, onPathFound }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [result, setResult] = useState(null);

  // Reset selections if nodes are deleted
  useEffect(() => {
    if (!nodes.includes(start)) {
      setStart('');
      setResult(null);
      onPathFound(null);  // Clear the path on the map
    }
    if (!nodes.includes(end)) {
      setEnd('');
      setResult(null);
      onPathFound(null);  // Clear the path on the map
    }
  }, [nodes, start, end, onPathFound]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8000/path/', {
        start,
        end
      });
      
      const { path, distance } = response.data;
      setResult({ path, distance });
      onPathFound(path);
    } catch (error) {
      console.error('Error finding path:', error);
      setResult(null);
      onPathFound(null);
    }
  };

  return (
    <Box>
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          select
          label="Start Node"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          margin="normal"
          fullWidth
        >
          {nodes.map((node) => (
            <MenuItem key={node} value={node}>
              {node}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="End Node"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          margin="normal"
          fullWidth
        >
          {nodes.map((node) => (
            <MenuItem key={node} value={node}>
              {node}
            </MenuItem>
          ))}
        </TextField>
        <Button 
          type="submit" 
          variant="contained" 
          fullWidth
          disabled={!start || !end}
        >
          Find Path
        </Button>
      </Box>
      
      {result && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="h6">Found Path:</Typography>
          <Typography>
            {result.path.join(' → ')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Total distance: {result.distance.toFixed(2)} km
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default PathFinder; 