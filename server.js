// server.js - Express server to receive Arduino Cloud webhooks

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { AccelerometerMusicGenerator } = require('./src/musicGenerator');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize our music generator
const musicGenerator = new AccelerometerMusicGenerator();

// Store most recent data for client access
let recentAccelData = [];
let isGenerating = false;

// Webhook endpoint for Arduino Cloud
app.post('/webhook', (req, res) => {
  try {
    console.log('Received webhook data:', req.body);
    
    // Extract accelerometer data from webhook payload
    // NOTE: Adjust this based on your actual Arduino Cloud data format
    let accelMagnitude;
    
    if (req.body.data && req.body.data.length > 0) {
      // Example extraction - modify according to your actual data format
      accelMagnitude = req.body.data[0].value;
    } else if (req.body.value !== undefined) {
      accelMagnitude = req.body.value;
    }
    
    // Validate and normalize magnitude
    if (accelMagnitude !== undefined) {
      // Make sure it's in our expected range (0.5 to 2.0)
      accelMagnitude = Math.max(0.5, Math.min(2.0, accelMagnitude));
      
      // Add to our data array
      recentAccelData.push(accelMagnitude);
      
      // Keep only the most recent 100 values
      if (recentAccelData.length > 100) {
        recentAccelData.shift();
      }
      
      // Process the data if we're not already generating music
      if (!isGenerating && recentAccelData.length >= 10) {
        isGenerating = true;
        
        // In a real server environment, we can't directly play audio,
        // but we can prepare the sequences for clients to fetch
        musicGenerator.generateFromData(recentAccelData)
          .then(sequence => {
            console.log('Generated sequence with', sequence.notes.length, 'notes');
            isGenerating = false;
          })
          .catch(err => {
            console.error('Error generating music:', err);
            isGenerating = false;
          });
      }
    }
    
    res.status(200).json({ status: 'success', message: 'Data received' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// API endpoint to get the most recent accelerometer data
app.get('/api/data', (req, res) => {
  res.json({ data: recentAccelData });
});

// API endpoint to get music generated from recent data
app.get('/api/music', async (req, res) => {
  try {
    if (recentAccelData.length === 0) {
      return res.status(404).json({ status: 'error', message: 'No data available' });
    }
    
    const sequence = await musicGenerator.generateFromData(recentAccelData);
    res.json({ 
      status: 'success', 
      sequence: sequence,
      avgMagnitude: recentAccelData.reduce((sum, val) => sum + val, 0) / recentAccelData.length,
      maxMagnitude: Math.max(...recentAccelData)
    });
  } catch (error) {
    console.error('Error generating music from data:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Serve the main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Initialize the music generator models
  try {
    await musicGenerator.loadModels();
    console.log('Music generator models loaded successfully');
  } catch (error) {
    console.error('Failed to load music generator models:', error);
  }
});