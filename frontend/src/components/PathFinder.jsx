import { useState, useEffect } from 'react';
import { TextField, Button, Box, Typography, Autocomplete, CircularProgress, ButtonGroup } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

function PathFinder({ nodes, onPathFound, onError, onLoadingChange, formState, onFormStateChange }) {
  const { t } = useTranslation();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Reset selections if nodes are deleted
  useEffect(() => {
    if (!nodes.includes(formState.start)) {
      onFormStateChange(prev => ({ ...prev, start: '' }));
      setResult(null);
      onPathFound(null);
    }
    if (!nodes.includes(formState.end)) {
      onFormStateChange(prev => ({ ...prev, end: '' }));
      setResult(null);
      onPathFound(null);
    }
    // Remove any avoided nodes that no longer exist
    onFormStateChange(prev => ({
      ...prev,
      avoid: prev.avoid.filter(node => nodes.includes(node)),
      waypoints: prev.waypoints.filter(node => nodes.includes(node))
    }));
  }, [nodes, formState.start, formState.end, onPathFound, formState.avoid, formState.waypoints, onFormStateChange]);

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
        start: formState.start,
        end: formState.end,
        waypoints: formState.waypoints.length > 0 ? formState.waypoints : undefined,
        avoid: formState.avoid.length > 0 ? formState.avoid : undefined
      });
      
      const { path, distance, duration, route_info, node_sequence } = response.data;
      setResult({ path, distance, duration, route_info, node_sequence });
      onPathFound({ 
        path: node_sequence, 
        coordinates: path,
        distance: distance,
        duration: duration,
        route_info: route_info
      });
      onError(null);
    } catch (error) {
      console.error('Error finding path:', error);
      
      if (error.response?.status === 404) {
        const avoidingText = formState.avoid.length > 0 
          ? t('pathFinder.avoiding').replace('{nodes}', formState.avoid.join(', '))
          : '';
          
        const errorMessage = t('pathFinder.noPathFound')
          .replace('{start}', formState.start)
          .replace('{end}', formState.end)
          .replace('{avoidText}', avoidingText);
          
        onError(errorMessage);
      } else if (error.response?.status === 400) {
        // Handle validation errors (missing nodes, etc.)
        onError(t('pathFinder.error').replace('{detail}', error.response.data.detail));
      } else {
        // Handle other errors (500, network errors, etc.)
        const errorMessage = error.response?.data?.detail || t('pathFinder.error').replace('{detail}', 'An unexpected error occurred');
        onError(t('pathFinder.error').replace('{detail}', errorMessage));
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
          value={formState.start}
          onChange={(_, newValue) => onFormStateChange(prev => ({ ...prev, start: newValue }))}
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
          value={formState.end}
          onChange={(_, newValue) => onFormStateChange(prev => ({ ...prev, end: newValue }))}
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
          options={nodes.filter(node => node !== formState.start && node !== formState.end && !formState.avoid.includes(node))}
          value={formState.waypoints}
          onChange={(_, newValue) => onFormStateChange(prev => ({ ...prev, waypoints: newValue }))}
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
          freeSolo
          options={nodes.filter(node => node !== formState.start && node !== formState.end && !formState.waypoints.includes(node))}
          value={formState.avoid}
          onChange={(_, newValue) => onFormStateChange(prev => ({ ...prev, avoid: newValue }))}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('pathFinder.avoid')}
              margin="normal"
              fullWidth
            />
          )}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={!formState.start || !formState.end || loading}
            fullWidth
          >
            {loading ? <CircularProgress size={24} /> : t('pathFinder.find')}
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={() => {
              onFormStateChange({
                start: '',
                end: '',
                waypoints: [],
                avoid: []
              });
              setResult(null);
              onPathFound(null);
            }}
            disabled={!formState.start && !formState.end && formState.waypoints.length === 0 && formState.avoid.length === 0}
            fullWidth
          >
            <ClearIcon sx={{ mr: 1 }} />
            {t('pathFinder.delete')}
          </Button>
        </Box>
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