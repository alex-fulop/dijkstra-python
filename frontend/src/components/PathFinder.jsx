import { useState, useEffect } from 'react';
import { TextField, Button, Box, Typography, Autocomplete, CircularProgress } from '@mui/material';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

function PathFinder({ nodes, onPathFound, onError, onLoadingChange }) {
  const { t } = useTranslation();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [waypoints, setWaypoints] = useState([]);
  const [avoid, setAvoid] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Reset selections if nodes are deleted
  useEffect(() => {
    if (!nodes.includes(start)) {
      setStart('');
      setResult(null);
      onPathFound(null);
    }
    if (!nodes.includes(end)) {
      setEnd('');
      setResult(null);
      onPathFound(null);
    }
    // Remove any avoided nodes that no longer exist
    setAvoid(avoid.filter(node => nodes.includes(node)));
    // Remove any waypoints that no longer exist
    setWaypoints(waypoints.filter(node => nodes.includes(node)));
  }, [nodes, start, end, onPathFound, avoid, waypoints]);

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} ore ${minutes} min`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    onLoadingChange(true);
    try {
      const response = await axios.post('http://localhost:8000/path/', {
        start,
        end,
        waypoints: waypoints.length > 0 ? waypoints : undefined,
        avoid: avoid.length > 0 ? avoid : undefined
      });
      
      const { path, distance, duration, route_info, node_sequence } = response.data;
      setResult({ path, distance, duration, route_info, node_sequence });
      onPathFound({ path: node_sequence, coordinates: path });
      onError(null);
    } catch (error) {
      console.error('Error finding path:', error);
      
      if (error.response?.status === 404) {
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
    } finally {
      setLoading(false);
      onLoadingChange(false);
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
          options={nodes.filter(node => node !== start && node !== end && !avoid.includes(node))}
          value={waypoints}
          onChange={(_, newValue) => setWaypoints(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('pathFinder.waypoints')}
              margin="normal"
              fullWidth
            />
          )}
        />
        <Autocomplete
          multiple
          options={nodes.filter(node => node !== start && node !== end && !waypoints.includes(node))}
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
          disabled={!start || !end || loading}
          sx={{ mt: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : t('pathFinder.find')}
        </Button>
      </Box>
      
      {result && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="h6">{t('routeInfo.title')}:</Typography>
          <Box sx={{ mt: 1, mb: 2 }}>
            {result.route_info && result.route_info.length > 0 ? (
              Array.from(new Set(result.route_info)).map((street, index) => (
                <Typography key={index} sx={{ mb: 0.5 }}>
                  {street}
                </Typography>
              ))
            ) : (
              result.node_sequence.map((node, index) => (
                <Typography key={index} sx={{ mb: 0.5 }}>
                  {node}
                </Typography>
              ))
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {t('routeInfo.distance')}: {result.distance.toFixed(2)} km
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('routeInfo.duration')}: {formatDuration(result.duration)}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default PathFinder; 