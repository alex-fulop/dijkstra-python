import { useState, useEffect } from 'react';
import { Box, Paper, IconButton, Drawer, Tabs, Tab, Button, ButtonGroup } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import Map from './components/Map';
import NodeForm from './components/NodeForm';
import PathFinder from './components/PathFinder';
import NLPPathFinder from './components/NLPPathFinder';
import DataManager from './components/DataManager';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import './i18n';

function App() {
  const { t, i18n } = useTranslation();
  const [nodes, setNodes] = useState({});
  const [selectedPath, setSelectedPath] = useState(null);
  const [nlpInfo, setNlpInfo] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState(0);

  // Fetch nodes when the app starts
  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const response = await axios.get('http://localhost:8000/nodes/');
        setNodes(response.data);
      } catch (error) {
        console.error('Error fetching nodes:', error);
      }
    };
    fetchNodes();
  }, []);

  const handleNodeDelete = (nodeName) => {
    setNodes(prevNodes => {
      const newNodes = { ...prevNodes };
      delete newNodes[nodeName];
      return newNodes;
    });

    // Clear selected path if it contains the deleted node
    if (selectedPath && selectedPath.includes(nodeName)) {
      setSelectedPath(null);
    }
  };

  const handleNodeAdd = async () => {
    try {
      const response = await axios.get('http://localhost:8000/nodes/');
      setNodes(response.data);
    } catch (error) {
      console.error('Error fetching nodes:', error);
    }
  };

  //TODO: ADD MORE NODES FOR THE ROUTE (5 de ex)
  return (
    <Box sx={{ height: '100vh', display: 'flex', overflow: 'hidden' }}>
      {/* Language Switcher */}
      <ButtonGroup
        sx={{
          position: 'absolute',
          top: 80,
          right: 16,
          zIndex: 1300,
          bgcolor: 'background.paper',
          boxShadow: 1,
        }}
      >
        <Button
          onClick={() => i18n.changeLanguage('en')}
          variant={i18n.language === 'en' ? 'contained' : 'outlined'}
        >
          EN
        </Button>
        <Button
          onClick={() => i18n.changeLanguage('ro')}
          variant={i18n.language === 'ro' ? 'contained' : 'outlined'}
        >
          RO
        </Button>
      </ButtonGroup>

      {/* Sidebar Drawer */}
      {sidebarOpen && (
        <Drawer
          variant="persistent"
          anchor="left"
          open={sidebarOpen}
          sx={{
            width: 400,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 400,
              boxSizing: 'border-box',
              pt: 2,
              pb: 4,
              overflowY: 'auto',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', pl: 1, pb: 2 }}>
            <IconButton onClick={() => setSidebarOpen(false)}>
              <ChevronLeftIcon />
            </IconButton>
          </Box>
          <Box sx={{ px: 2 }}>
            {/* Tabs */}
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ mb: 2 }}>
              <Tab label={t('tabs.shortestRoute')} />
              <Tab label={t('tabs.personalizedNLP')} />
            </Tabs>
            {/* Tab Panels */}
            {tab === 0 && (
              <>
                <Paper sx={{ p: 2, mb: 2 }}>
                  <NodeForm onNodeAdd={(node) => {
                    setNodes({ ...nodes, [node.name]: [node.latitude, node.longitude] });
                  }} />
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
              </>
            )}
            {tab === 1 && (
              <>
                <Paper sx={{ p: 2, mb: 2 }}>
                  <NLPPathFinder 
                    nodes={nodes}
                    onPathFound={(path, info) => {
                      setSelectedPath(path);
                      setNlpInfo(info);
                    }}
                  />
                </Paper>
                <Paper sx={{ p: 2 }}>
                  <DataManager 
                    onDataImported={(data) => {
                      setNodes(data.nodes);
                    }} 
                  />
                </Paper>
                {/* NLP response info box */}
                {nlpInfo && (
                  <Paper sx={{ p: 2, mt: 2, bgcolor: '#f5f5f5' }}>
                    <strong>{t('routeInfo.title')}:</strong>
                    <div>
                      {nlpInfo.text && <div style={{ marginBottom: 8 }}>{nlpInfo.text}</div>}
                      {nlpInfo.distance && <div>{t('routeInfo.distance')}: {nlpInfo.distance} km</div>}
                      {nlpInfo.recommendations && (
                        <div style={{ marginTop: 8 }}>
                          <strong>{t('routeInfo.recommendations')}:</strong>
                          <ul>
                            {nlpInfo.recommendations.map((rec, i) => (
                              <li key={i}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </Paper>
                )}
              </>
            )}
          </Box>
        </Drawer>
      )}

      {/* Sidebar open button */}
      {!sidebarOpen && (
        <IconButton
          onClick={() => setSidebarOpen(true)}
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 1300,
            bgcolor: 'background.paper',
            boxShadow: 1,
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Map Panel */}
      <Box
        sx={{
          flex: 1,
          height: '100vh',
          width: '100vw',
          transition: 'all 0.3s',
          bgcolor: '#eaeaea',
        }}
      >
        <Map 
          nodes={nodes} 
          selectedPath={selectedPath} 
          onNodeDelete={handleNodeDelete}
          onNodeAdd={handleNodeAdd}
        />
      </Box>
    </Box>
  );
}

export default App;
