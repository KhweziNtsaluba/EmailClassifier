import React, { useState, useRef } from 'react';
import {
  Box, Button, Tabs, Tab, TextField, Typography,
  Paper, Input, Alert
} from '@mui/material';

const suspiciousWords = ['urgent', 'verify', 'login', 'click', 'account', 'update', 'test'];

export default function PhishingEmailDetector() {
  const [tab, setTab] = useState(0);
  const [emailText, setEmailText] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const analyzedEmailText = useRef('');

  // set email text to file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const text = await file.text();
    setEmailText(text);
  };

  const highlightWords = (text) => {
    const words = text.split(/\s+/);
    return words.map((word, i) => {
      const cleanWord = word.toLowerCase()
      const isSuspicious = suspiciousWords.includes(cleanWord);

      // return list of highlighted words
      return (
        <span
          key={i}
          style={{
            backgroundColor: isSuspicious ? 'rgba(255,0,0,0.3)' : 'transparent',
            padding: '2px',
            borderRadius: '3px',
            marginRight: '4px'
          }}
        >
          {word}
        </span>
      );
    });
  };


  // classifies the email as phishing or benign (if suspicious word is in list)
  const analyzeEmail = () => {
    const lower = emailText.toLowerCase();
    const found = suspiciousWords.filter(w => lower.includes(w));
    const isPhishing = found.length > 1;

    analyzedEmailText.current = emailText;
    setAnalysisResult({
      isPhishing,
      suspicious: found,
    });
  };
  
  React.useEffect(() => {
    document.addEventListener('keydown', keydownHandler);
    return () => {
      document.removeEventListener('keydown', keydownHandler);
    }
  }, []);

  const keydownHandler = (e) => {
    if(e.key === 'Enter' && e.ctrlKey) analyzeEmail();
  };



  return (
    <Box p={4}>
      <Typography 
        variant="h4" 
        gutterBottom>
          Phishing Email Detector
      </Typography>

      {/* switching between tabs */}
      <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)}>
        <Tab label="Paste Email" />
        <Tab label="Upload .txt File" />
      </Tabs>

      {tab === 0 && (
        <TextField
          label="Email Content"
          multiline
          rows={10}
          fullWidth
          margin="normal"
          value={emailText}
          onChange={(e) => setEmailText(e.target.value)}
        />
      )}

      {tab === 1 && (
        <Input type="file" accept=".txt" onChange={handleFileUpload} sx={{ my: 2, mx: 2 }} />
      )}

      <Button
        variant="contained"
        color="primary"
        onClick={analyzeEmail}
        disabled={!emailText.trim()}
      >
        Analyze Email
      </Button>

      {analysisResult && (
        <Box mt={4}>
          <Alert severity={analysisResult.isPhishing ? 'error' : 'success'}>
            {analysisResult.isPhishing ? 'Phishing Email Detected!' : 'This email appears safe.'}
          </Alert>

          <Typography variant="h6" mt={3}>
            Reasoning:
          </Typography>
          <Typography variant="body1">
            {analysisResult.suspicious.length > 0
              ? `Suspicious keywords found: ${analysisResult.suspicious.join(', ')}`
              : 'No suspicious keywords detected.'}
          </Typography>

          <Typography variant="h6" mt={3}>
            Highlighted Email Content:
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, mt: 1, whiteSpace: 'pre-wrap' }}>
            {highlightWords(analyzedEmailText.current)}
          </Paper>
        </Box>
      )}
    </Box>
  );
}
