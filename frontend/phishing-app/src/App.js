import React, { useState, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import {
  Box, Button, Tabs, Tab, TextField, Typography, Paper,
  Alert, CircularProgress, Grid, Divider
} from '@mui/material';

const EmailInput = ({ emailText, setEmailText, handleSubmit }) => {
  const [tab, setTab] = useState(0);
  
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      setEmailText(text);
    } catch (error) {
      console.error("Failed to read file:", error);
      alert("Failed to read file. Please try another file.");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  return (
    <Box mt={2}>
      <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)}>
        <Tab label="Paste Email" />
        <Tab label="Upload .txt File" />
      </Tabs>

      {tab === 0 && (
        <Box mt={2}>
          <TextField
            label="Email Content"
            multiline
            rows={10}
            fullWidth
            variant="outlined"
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste email content here..."
          />
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
            Press Ctrl+Enter to analyze
          </Typography>
        </Box>
      )}

      {tab === 1 && (
        <Box mt={2} mb={2}>
          <Button
            variant="contained"
            component="label"
            sx={{ mr: 2 }}
          >
            Choose File
            <input
              type="file"
              accept=".txt"
              hidden
              onChange={handleFileUpload}
            />
          </Button>
          {emailText && <Typography variant="body2">File loaded</Typography>}
        </Box>
      )}

      <Button
        variant="contained"
        color="primary"
        onClick={handleSubmit}
        disabled={!emailText.trim()}
        sx={{ mt: 2 }}
      >
        Analyze Email
      </Button>
    </Box>
  );
};

// analysis result processing
const AnalysisResults = ({ analysisResult, emailText }) => {
  if (!analysisResult) return null;

  const highlightWords = (text, wordList) => {
    const words = text.split(/\s+/);
    return words.map((word, i) => {
      const cleanWord = word.toLowerCase();    

      const getClassType = (text) => {
        const REGEX_PATTERNS = {
          'currency': /[$€£¥]\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s*(?:USD|EUR|GBP|JPY|CAD|AUD|CHF)/,
          'time': /\b(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?(?:\s*[aApP][mM])?\b/,
          'day': / (sun|mon|tue(s)?|wed(nesday)?|thu(r(s)?)?|fri)(day|\.)? /i,
          'date': /\b(?:\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4}|\d{4}[-\/\.]\d{1,2}[-\/\.]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:[a-z]{2})?,?\s+\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,?\s+\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:\s?[—-]\s?\d{1,2})?)\b/i,
          'phone': /^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}$/,
          'percentage': /\b(?<!\.)(?!0+(?:\.0+)?%)(?:\d|[1-9]\d|100)(?:(?<!100)\.\d+)?%/,
          'number': /\b\d+(?:[.,]\d+)?\b/,
          'email': /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/,
          'url': /http[s]?:\/\/(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+/
        };

        // Test word against patterns
        if (REGEX_PATTERNS.currency.test(text)) return "<cur>";
        if (REGEX_PATTERNS.time.test(text)) return "<time>";
        if (REGEX_PATTERNS.day.test(text)) return "<day>";
        if (REGEX_PATTERNS.date.test(text)) return "<date>";
        if (REGEX_PATTERNS.phone.test(text)) return "<phone>";
        if (REGEX_PATTERNS.percentage.test(text)) return "<perc>";
        if (REGEX_PATTERNS.email.test(text)) return "<email>";
        if (REGEX_PATTERNS.url.test(text)) return "<url>";
        if (REGEX_PATTERNS.number.test(text)) return "<num>";

        // else
        return text;
      };

      const displayText = getClassType(cleanWord);

      const wordWeight = wordList[displayText] ? wordList[displayText] : 0;
      let backgroundColor = 'transparent';

      if (wordWeight > 0) {
        backgroundColor = `rgba(255,0,0,${Math.min(1, wordWeight/1.5)})`;
      } else if (wordWeight < 0) {
        backgroundColor = `rgba(0,0,255,${Math.min(1, Math.abs(wordWeight/1.5))})`;
      }

      return (
        <span
          key={i}
          style={{
            backgroundColor,
            padding: wordWeight !== 0 ? '2px' : '0',
            borderRadius: '3px',
            marginRight: '4px'
          }}
        >
          {displayText}
        </span>
      );
    });
  };

  // Get top influential words (positive and negative)
  const getTopWords = (wordMap, count = 10) => {
    return Object.entries(wordMap)
      .filter(([word]) => word.length > 1)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, count)
      .map(([word, weight]) => ({ word, weight }));
  };

  const topInfluentialWords = getTopWords(analysisResult.wordWeightMap);
  const suspiciousUrls = analysisResult.urlPredictions ? 
    analysisResult.urlPredictions
      .filter(url => url.predicted_class === 1)
      .sort((a, b) => b.phishing_probability - a.phishing_probability) 
    : [];

  return (
    <Box mt={4}>
      <Alert 
        severity={analysisResult.isPhishing ? 'error' : 'success'}
        sx={{ mb: 3 }}
      >
        <Typography variant="subtitle1" component="div" fontWeight="bold">
          {analysisResult.isPhishing ? 'Phishing Email Detected!' : 'This email appears safe.'}
        </Typography>
        <Typography variant="body2">
          Confidence: {(analysisResult.confidence * 100).toFixed(1)}%
        </Typography>
      </Alert>

      <Grid container spacing={3} justifyContent={'center'}>
        <Grid item xs={12} md={8}>
          <Typography variant="h6" gutterBottom align='center' sx={{ fontWeight: 'bold' }}>
            Highlighted Email Content:
          </Typography>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              whiteSpace: 'pre-wrap', 
              overflowWrap: 'break-word',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              maxHeight: '400px',
              overflow: 'auto'
            }}
          >
            {highlightWords(emailText, analysisResult.wordWeightMap)}
          </Paper>
          
          <Box mt={3}>
            <Typography variant="h6" gutterBottom align='center' sx={{ fontWeight: 'bold' }}>
              Analysis Summary:
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              {analysisResult.suspicious && analysisResult.suspicious.length > 0 ? (
                <Box>
                  <Typography variant="subtitle1" fontWeight="medium">
                    Top suspicious terms detected:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {analysisResult.suspicious.slice(0, 5).map((word) => (
                      <Box 
                        key={word} 
                        sx={{ 
                          bgcolor: 'error.light', 
                          color: 'error.contrastText', 
                          px: 1, 
                          py: 0.5, 
                          borderRadius: 1,
                          fontSize: '0.875rem'
                        }}
                      >
                        {word}
                      </Box>
                    ))}
                  </Box>
                </Box>
              ) : (
                <Typography>No highly suspicious keywords detected.</Typography>
              )}

              <Divider sx={{ my: 2 }} />
              {suspiciousUrls.length > 0 ? (
                <Box>
                  <Typography variant="subtitle1" fontWeight="medium">
                    Suspicious URLs detected:
                  </Typography>
                  <Box sx={{ mt: 1 }}>
                    {suspiciousUrls.slice(0, 3).map((urlObj, index) => (
                      <Box 
                        key={index} 
                        sx={{ 
                          bgcolor: 'error.main', 
                          color: 'error.contrastText', 
                          p: 1, 
                          my: 1,
                          borderRadius: 1,
                          fontSize: '0.875rem',
                          wordBreak: 'break-all'
                        }}
                      >
                        <Typography variant="body2" fontWeight="bold">
                          {urlObj.url}
                        </Typography>
                        <Typography variant="caption">
                          Confidence: {(urlObj.phishing_probability * 100).toFixed(2)}%
                        </Typography>
                      </Box>
                    ))}
                    {suspiciousUrls.length > 3 && (
                      <Typography variant="caption" color="error">
                        +{suspiciousUrls.length - 3} more suspicious URLs detected
                      </Typography>
                    )}
                  </Box>
                </Box>
              ) : (
                <Typography>No suspicious URLs detected.</Typography>
              )}
            </Paper>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Typography variant="h6" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
            Word Influence:
          </Typography>
          <Paper sx={{ p: 2 }}>
            <Typography variant="caption" color="textSecondary" align="center" gutterBottom>
              Red = phishing indicator, Blue = benign indicator
            </Typography>
            <BarChart
              width={280}
              height={280}
              data={topInfluentialWords}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
            >
              <XAxis type="number" domain={[-1, 1]} />
              <YAxis type="category" dataKey="word" width={80} />
              <Tooltip formatter={(value) => value.toFixed(3)} />
              <Bar dataKey="weight">
                {topInfluentialWords.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.weight > 0 ? '#f44336' : '#2196f3'}
                  />
                ))}
              </Bar>
            </BarChart>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default function PhishingEmailDetector() {
  const [emailText, setEmailText] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyzeEmail = useCallback((prediction) => {
    const lower = emailText.toLowerCase();
    const isPhishing = prediction['predicted_class'] === 1;
    const confidence = isPhishing ? prediction['phishing_probability'] : 1-prediction['phishing_probability'];
    const wordMap = prediction['list'];
    const found = Object.entries(prediction['list'])
      .filter(([word, weight]) => weight > 0.5 && lower.includes(word))
      .map(([word]) => word);

    console.log(prediction);

    setAnalysisResult({
      isPhishing,
      suspicious: found,
      confidence: confidence,
      wordWeightMap: wordMap,
      urlPredictions: prediction['url_predictions'] || []
    });
  }, [emailText]);

  const handleSubmit = useCallback(() => {
    setIsLoading(true);
    setError(null);
    
    fetch('http://localhost:8000/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subject: "Email Subject",
        body: emailText,
        num_features: 10
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(json => {
      analyzeEmail(json);
    })
    .catch(error => {
      console.error("API Error:", error);
      setError("Failed to analyze email. Please try again or check if the server is running.");
    })
    .finally(() => {
      setIsLoading(false);
    });
  }, [emailText, analyzeEmail]);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Phishing Email Detector
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Analyze email content to detect potential phishing attempts.
      </Typography>
      <Divider sx={{ mb: 3 }} />
      
      <EmailInput 
        emailText={emailText}
        setEmailText={setEmailText}
        handleSubmit={handleSubmit}
      />
      
      {isLoading && (
        <Box mt={2} display="flex" alignItems="center">
          <CircularProgress size={24} sx={{ mr: 2 }} />
          <Typography variant="body2" color="textSecondary">
            Analyzing email content...
          </Typography>
        </Box>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      
      {!isLoading && analysisResult && (
        <AnalysisResults 
          analysisResult={analysisResult} 
          emailText={emailText} 
        />
      )}
    </Box>
  );
}