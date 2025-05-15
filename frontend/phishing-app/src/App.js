import React, { useState, useRef } from 'react';
import {
  Box, Button, Tabs, Tab, TextField, Typography,
  Paper, Input, Alert
} from '@mui/material';

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

  const highlightWords = (text, wordList) => {
    const words = text.split(/\s+/);
    return words.map((word, i) => {
      const cleanWord = word.toLowerCase();
      // const isSuspicious = analysisResult.isSuspicious;

      const wordWeight = wordList[cleanWord] ? wordList[cleanWord] : 0;
      var backgroundColor = 'transparent';

      if(wordWeight > 0){
        backgroundColor = `rgba(255,0,0,${wordWeight/1.5})`; // red highlighting
      }
      else if (wordWeight < 0){
        backgroundColor = `rgba(0,0,255,${Math.abs(wordWeight/1.5)})`; // blue highlighting
      }

      // return list of highlighted words
      return (
        <span
          key={i}
          style={{
            backgroundColor: backgroundColor,
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
  const analyzeEmail = (prediction) => {
    console.log(prediction);
    const lower = emailText.toLowerCase();
    const isPhishing = prediction['predicted_class'] === 1;
    const confidence = prediction['confidence'];
    const wordMap = prediction['list'];
    const found = Object.entries(prediction['list'])
      .filter(([word, weight]) => weight > 0.5 && lower.includes(word))
      .map(([word]) => word);

    analyzedEmailText.current = emailText;
    setAnalysisResult({
      isPhishing,
      suspicious: found,
      confidence: confidence,
      wordWeightMap: wordMap
    });
  };

  const handleSubmit = (subject, body) => {
    fetch('http://localhost:8000/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject,
          body
        })
    })
    .then(response => response.json())
    .then(json => analyzeEmail(json))
    .catch(error => console.error(error));
  }
  
  const keydownHandler = (e) => {
  console.log(`Pressed: ${e.key}`, e.ctrlKey);
  if (e.key === 'Enter' && e.ctrlKey) {
    console.log("CTRL+ENTER");
    handleSubmit("email subject", emailText);
  }
};

  React.useEffect(() => {
    document.addEventListener('keydown', keydownHandler);
    return () => {
      document.removeEventListener('keydown', keydownHandler);
    }
  }, []);


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
        onClick={() => handleSubmit("email subject", emailText)}
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
          <Paper variant="outlined" sx={{ p: 2, mt: 1, whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
            {highlightWords(analyzedEmailText.current, analysisResult.wordWeightMap)}
          </Paper>
        </Box>
      )}
    </Box>
  );
}
