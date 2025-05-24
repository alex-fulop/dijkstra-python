import { useState } from 'react';
import { TextField, Button, Box } from '@mui/material';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

function NodeForm({ onNodeAdd }) {
  const { t } = useTranslation();
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
        label={t('nodeForm.name')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        margin="normal"
        fullWidth
      />
      <TextField
        label={t('nodeForm.latitude')}
        type="number"
        value={lat}
        onChange={(e) => setLat(e.target.value)}
        margin="normal"
        fullWidth
      />
      <TextField
        label={t('nodeForm.longitude')}
        type="number"
        value={lng}
        onChange={(e) => setLng(e.target.value)}
        margin="normal"
        fullWidth
      />
      <Button type="submit" variant="contained" fullWidth>
        {t('nodeForm.add')}
      </Button>
    </Box>
  );
}

export default NodeForm; 