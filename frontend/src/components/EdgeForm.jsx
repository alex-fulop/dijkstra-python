import { useState } from 'react';
import { TextField, Button, Box, MenuItem, Switch, FormControlLabel } from '@mui/material';
import axios from 'axios';

function EdgeForm({ nodes, nodesData }) {
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [useCustomWeight, setUseCustomWeight] = useState(false);
  const [weight, setWeight] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // If not using custom weight, the backend will calculate it
      await axios.post('http://localhost:8000/edges/', {
        source,
        target,
        weight: useCustomWeight ? parseFloat(weight) : null
      });
      
      setSource('');
      setTarget('');
      setWeight('');
    } catch (error) {
      console.error('Error adding edge:', error);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <TextField
        select
        label="Source Node"
        value={source}
        onChange={(e) => setSource(e.target.value)}
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
        label="Target Node"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        margin="normal"
        fullWidth
      >
        {nodes.map((node) => (
          <MenuItem key={node} value={node}>
            {node}
          </MenuItem>
        ))}
      </TextField>
      <FormControlLabel
        control={
          <Switch
            checked={useCustomWeight}
            onChange={(e) => setUseCustomWeight(e.target.checked)}
          />
        }
        label="Use custom distance"
      />
      {useCustomWeight && (
        <TextField
          label="Distance (km)"
          type="number"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          margin="normal"
          fullWidth
        />
      )}
      <Button 
        type="submit" 
        variant="contained" 
        fullWidth
        disabled={!source || !target || (useCustomWeight && !weight)}
      >
        Add Edge
      </Button>
    </Box>
  );
}

export default EdgeForm; 