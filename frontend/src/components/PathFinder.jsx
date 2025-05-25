import { useState, useEffect } from 'react';
import { TextField, Button, Box, Typography, Autocomplete } from '@mui/material';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

function PathFinder({ nodes, onPathFound, onError }) {
  const { t } = useTranslation();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [avoid, setAvoid] = useState([]);
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
    // Remove any avoided nodes that no longer exist
    setAvoid(avoid.filter(node => nodes.includes(node)));
  }, [nodes, start, end, onPathFound, avoid]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8000/path/', {
        start,
        end,
        avoid
      });
      
      const { path, distance } = response.data;
      setResult({ path, distance });
      onPathFound(path);
      onError(null);
    } catch (error) {
      console.error('Error finding path:', error);
      
      // Check if it's a "no path found" error
      if (error.response?.status === 404) {
        // Pass all parameters to the translation function
        onError(t('pathFinder.noPathFound', { 
          start, 
          end, 
          avoidText: avoid.length > 0 ? t('pathFinder.avoiding', { nodes: avoid.join(', ') }) : ''
        }));
      } else {
        onError(t('pathFinder.error'));
      }
      
      setResult(null);
      onPathFound(null);
    }
  };

  return (
    <Box>
      <Box component="form" onSubmit={handleSubmit}>
        <Autocomplete
          value={start}
          onChange={(_, newValue) => setStart(newValue)}
          options={nodes}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('pathFinder.start')}
              margin="normal"
              fullWidth
            />
          )}
        />
        <Autocomplete
          value={end}
          onChange={(_, newValue) => setEnd(newValue)}
          options={nodes}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('pathFinder.end')}
              margin="normal"
              fullWidth
            />
          )}
        />
        <Autocomplete
          multiple
          freeSolo
          options={nodes.filter(node => node !== start && node !== end)}
          value={avoid}
          onChange={(_, newValue) => setAvoid(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('pathFinder.avoid')}
              margin="normal"
              fullWidth
            />
          )}
        />
        <Button 
          type="submit" 
          variant="contained" 
          fullWidth
          disabled={!start || !end}
          sx={{ mt: 2 }}
        >
          {t('pathFinder.find')}
        </Button>
      </Box>
      
      {result && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="h6">{t('routeInfo.title')}:</Typography>
          <Typography>
            {result.path.join(' → ')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('routeInfo.distance')}: {result.distance.toFixed(2)} km
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default PathFinder; 