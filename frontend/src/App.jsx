import { useState } from 'react';
import { Container, Box, Paper } from '@mui/material';
import Map from './components/Map';
import NodeForm from './components/NodeForm';
import EdgeForm from './components/EdgeForm';
import PathFinder from './components/PathFinder';
import DataManager from './components/DataManager';

function App() {
  const [nodes, setNodes] = useState({});
  const [selectedPath, setSelectedPath] = useState(null);

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      overflow: 'hidden' 
    }}>
      {/* Left Panel - Scrollable Forms */}
      <Box sx={{ 
        width: '400px',
        height: '100%',
        overflowY: 'auto',
        p: 2,
        borderRight: 1,
        borderColor: 'divider',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#f1f1f1',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#888',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: '#555',
        },
      }}>
        {/* Wrapper for forms with padding */}
        <Box sx={{ pt: 4, pb: 8 }}> {/* Add padding top and extra padding bottom */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <NodeForm onNodeAdd={(node) => {
              setNodes({ ...nodes, [node.name]: [node.latitude, node.longitude] });
            }} />
          </Paper>
          <Paper sx={{ p: 2, mb: 2 }}>
            <EdgeForm nodes={Object.keys(nodes)} />
          </Paper>
          <Paper sx={{ p: 2, mb: 2 }}>
            <PathFinder 
              nodes={Object.keys(nodes)} 
              onPathFound={setSelectedPath} 
            />
          </Paper>
          <Paper sx={{ p: 2 }}>
            <DataManager 
              onDataImported={(data) => {
                setNodes(data.nodes);
              }} 
            />
          </Paper>
        </Box>
      </Box>

      {/* Right Panel - Full Height Map */}
      <Box sx={{ 
        flex: 1,
        height: '100%',
      }}>
        <Map nodes={nodes} selectedPath={selectedPath} />
      </Box>
    </Box>
  );
}

export default App;
