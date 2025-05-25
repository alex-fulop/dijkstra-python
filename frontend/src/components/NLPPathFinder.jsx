import { useState } from 'react';
import { TextField, Button, Box, Typography, CircularProgress } from '@mui/material';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

function NLPPathFinder({ nodes, onPathFound }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    onPathFound([], null); // Clear previous path/info
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:8000/nlp-path/', { query });
      // Example: response.data = { path, distance, preferences, ... }
      onPathFound(
        response.data.path || [],
        {
          text: `Route: ${response.data.path?.join(' → ')}`,
          distance: response.data.distance,
          recommendations: response.data.recommendations || [
            ...(response.data.preferences ? [`Preferences: ${response.data.preferences.join(', ')}`] : [])
          ]
        }
      );
    } catch (error) {
      onPathFound([], { text: error.response?.data?.detail || 'Error' });
    }
    setLoading(false);
  };

  return (
    <Box>
      <form onSubmit={handleSubmit}>
        <TextField
          label={t('nlpPathFinder.description')}
          value={query}
          onChange={e => setQuery(e.target.value)}
          fullWidth
          margin="normal"
          multiline
          minRows={4}
          maxRows={8}
          InputProps={{ style: { fontSize: 18 } }}
        />
        <Button type="submit" variant="contained" fullWidth disabled={loading || !query}>
          {loading ? <CircularProgress size={24} /> : t('nlpPathFinder.getRoute')}
        </Button>
      </form>
    </Box>
  );
}

export default NLPPathFinder; 