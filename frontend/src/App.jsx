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
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', gap: 2, p: 2 }}>
        <Box sx={{ flex: 1 }}>
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
        <Box sx={{ flex: 2 }}>
          <Paper sx={{ height: '70vh' }}>
            <Map nodes={nodes} selectedPath={selectedPath} />
          </Paper>
        </Box>
      </Box>
    </Container>
  );
}

export default App;
