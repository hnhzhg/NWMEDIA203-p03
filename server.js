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

// Initialize our data processor
const dataProcessor = new AccelerometerMusicGenerator();

// Store most recent data
let recentAccelData = [];

// Webhook endpoint for Arduino Cloud
app.post('/webhook', (req, res) => {
  try {
    console.log('Received webhook data:', req.body);
    
    // Extract accelerometer data from webhook payload
    let accelMagnitude;
    
    if (req.body.data && req.body.data.length > 0) {
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
      
      // Process the data
      if (recentAccelData.length >= 10) {
        dataProcessor.processData(recentAccelData);
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
  const processedData = dataProcessor.getLatestData();
  res.json({ 
    rawData: recentAccelData,
    processedData: processedData
  });
});

// Serve the main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});