import { useRef } from 'react';
import { Button, Box } from '@mui/material';
import axios from 'axios';

function DataManager({ onDataImported }) {
  const fileInputRef = useRef();

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = JSON.parse(e.target.result);
        await axios.post('http://localhost:8000/import/json/', data);
        onDataImported(data);
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Error importing data:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get('http://localhost:8000/export/');
      const dataStr = JSON.stringify(response.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'graph_data.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const handleLoadRomania = async () => {
    try {
      const response = await axios.get('http://localhost:8000/romania-dataset/');
      onDataImported(response.data);
    } catch (error) {
      console.error('Error loading Romania dataset:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
      <input
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        ref={fileInputRef}
        onChange={handleImport}
      />
      <Button 
        variant="outlined" 
        fullWidth
        onClick={() => fileInputRef.current.click()}
      >
        Import JSON
      </Button>
      <Button 
        variant="outlined" 
        fullWidth
        onClick={handleExport}
      >
        Export JSON
      </Button>
      <Button 
        variant="contained" 
        fullWidth
        onClick={handleLoadRomania}
      >
        Load Romania Dataset
      </Button>
    </Box>
  );
}

export default DataManager; 