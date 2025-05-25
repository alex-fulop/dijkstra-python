import { useState, useRef, useEffect } from 'react';
import { 
  TextField, 
  Button, 
  Box, 
  Typography, 
  CircularProgress, 
  Paper,
  List,
  ListItem,
  IconButton,
  Tabs,
  Tab
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

function TypingIndicator() {
  return (
    <Box sx={{ display: 'flex', gap: 0.5, p: 1 }}>
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: 'text.secondary',
          animation: 'bounce 1.4s infinite ease-in-out',
          animationDelay: '0s',
        }}
      />
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: 'text.secondary',
          animation: 'bounce 1.4s infinite ease-in-out',
          animationDelay: '0.2s',
        }}
      />
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: 'text.secondary',
          animation: 'bounce 1.4s infinite ease-in-out',
          animationDelay: '0.4s',
        }}
      />
      <style>
        {`
          @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1); }
          }
        `}
      </style>
    </Box>
  );
}

function NLPPathFinder({ nodes, selectedPath, onPathFound, onLoadingChange }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const [tab, setTab] = useState(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (selectedPath && selectedPath.path && selectedPath.distance) {
      const { path, distance } = selectedPath;
      setMessages([
        {
          type: 'assistant',
          content: `I see you've calculated a route: ${path.join(' → ')}\nTotal distance: ${distance.toFixed(2)} km\n\nFeel free to ask me about:\n* Cool places to visit along your route\n* Local attractions and hidden gems\n* Restaurant recommendations\n* Best times to visit each location\n* Or any other travel tips you'd like to know!`
        }
      ]);
    }
  }, [selectedPath]);

  const handleGetRecommendations = async () => {
    if (!selectedPath) {
      setMessages([{
        type: 'assistant',
        content: 'Please calculate a route first using the "Shortest Route" tab. Once you have a route, I can provide personalized travel recommendations for your journey.'
      }]);
      return;
    }

    setLoading(true);
    setMessages([]);
    
    try {
      const response = await axios.post('http://localhost:8000/nlp-path/', { 
        query: "Give me travel recommendations for my route",
        current_route: selectedPath
      });
      
      const { path, distance, tourist_info, message } = response.data;
      
      if (!path || path.length === 0 || !distance) {
        setMessages([{
          type: 'assistant',
          content: message || 'Please calculate a route first using the "Shortest Route" tab. Once you have a route, I can provide personalized travel recommendations for your journey.'
        }]);
        return;
      }
      
      onPathFound({ path, distance, tourist_info }, {
        text: `Route: ${path.join(' → ')}`,
        distance: distance
      });
    } catch (error) {
      setMessages([{
        type: 'assistant',
        content: error.response?.data?.detail || 'Error getting recommendations'
      }]);
    }
    setLoading(false);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (!selectedPath) {
      setMessages([{
        type: 'assistant',
        content: 'Please calculate a route first using the "Shortest Route" tab. Once you have a route, I can provide personalized travel recommendations for your journey.'
      }]);
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setLoading(true);
    setMessages(prev => [...prev, { type: 'typing' }]);

    try {
      const response = await axios.post('http://localhost:8000/nlp-path/', {
        query: userMessage,
        current_route: selectedPath
      });

      const { path, distance, tourist_info, response: aiResponse } = response.data;

      // If we got a new route, update it
      if (path && path.length > 0 && distance) {
        onPathFound({ path, distance, tourist_info }, {
          text: `Route: ${path.join(' → ')}`,
          distance: distance
        });
      }

      setMessages(prev => prev.filter(msg => msg.type !== 'typing').concat({
        type: 'assistant',
        content: aiResponse || response.data.message || 'I understand your request.'
      }));
    } catch (error) {
      setMessages(prev => prev.filter(msg => msg.type !== 'typing').concat({
        type: 'assistant',
        content: error.response?.data?.detail || 'Error processing your request'
      }));
    }
    setLoading(false);
  };

  const renderMessage = (message, index) => {
    if (message.type === 'typing') {
      return (
        <ListItem
          key={index}
          sx={{
            flexDirection: 'column',
            alignItems: 'flex-start',
            mb: 2
          }}
        >
          <Paper
            elevation={1}
            sx={{
              p: 1,
              maxWidth: '80%',
              bgcolor: 'background.paper',
            }}
          >
            <TypingIndicator />
          </Paper>
        </ListItem>
      );
    }

    const formatContent = (content) => {
      // Replace markdown-style formatting with HTML
      let formattedContent = content
        // Bold text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic text
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Lists
        .replace(/\n\* (.*?)(?=\n|$)/g, '<li>$1</li>')
        // Headers
        .replace(/\*\*(.*?):\*\*/g, '<h4>$1</h4>')
        // Line breaks
        .replace(/\n/g, '<br />');

      // Wrap lists in ul tags
      if (formattedContent.includes('<li>')) {
        formattedContent = formattedContent.replace(/(<li>.*?<\/li>)/g, '<ul>$1</ul>');
      }

      return formattedContent;
    };

    return (
      <ListItem
        key={index}
        sx={{
          flexDirection: 'column',
          alignItems: message.type === 'user' ? 'flex-end' : 'flex-start',
          mb: 2
        }}
      >
        <Paper
          elevation={1}
          sx={{
            p: 2,
            maxWidth: '80%',
            bgcolor: message.type === 'user' ? 'primary.light' : 'background.paper',
            color: message.type === 'user' ? 'white' : 'text.primary',
            '& h4': {
              mt: 2,
              mb: 1,
              color: 'primary.main',
              fontSize: '1.1rem',
              fontWeight: 'bold'
            },
            '& ul': {
              pl: 2,
              mb: 1
            },
            '& li': {
              mb: 0.5
            },
            '& strong': {
              fontWeight: 'bold'
            },
            '& em': {
              fontStyle: 'italic'
            }
          }}
        >
          <Typography 
            variant="body1" 
            sx={{ 
              whiteSpace: 'pre-line',
              '& br': {
                display: 'block',
                content: '""',
                mb: 1
              }
            }}
            dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
          />
        </Paper>
      </ListItem>
    );
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* Middle Section - Scrollable Chat */}
      <Box sx={{ 
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0 // This is crucial for proper scrolling
      }}>
        {messages.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            height: '100%',
            gap: 2
          }}>
            <Typography variant="h6" align="center" color="text.secondary">
              {selectedPath ? t('nlpPathFinder.getStarted') : 'Please calculate a route first using the "Shortest Route" tab'}
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={handleGetRecommendations}
              disabled={loading || !selectedPath}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {t('nlpPathFinder.getRecommendations')}
            </Button>
          </Box>
        ) : (
          <List sx={{ 
            flex: 1,
            p: 2
          }}>
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </List>
        )}
      </Box>

      {/* Bottom Section - Input */}
      <Box
        component="form"
        onSubmit={handleSendMessage}
        sx={{
          flexShrink: 0,
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          gap: 1,
          bgcolor: 'background.paper',
          position: 'sticky',
          bottom: 0,
          zIndex: 1
        }}
      >
        <TextField
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={selectedPath ? t('nlpPathFinder.askQuestion') : 'Please calculate a route first'}
          disabled={loading || !selectedPath}
          size="small"
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
        />
        <IconButton 
          type="submit" 
          color="primary" 
          disabled={loading || !input.trim() || !selectedPath}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
}

export default NLPPathFinder; 