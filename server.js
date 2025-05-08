// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = 3000;

// Configure CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Add explicit CORS headers middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Store accelerometer data
let accelerometerData = [];

// Webhook endpoint
app.post('/webhook', (req, res) => {
  console.log('Received webhook request');
  console.log('Headers:', req.headers);
  console.log('Body:', JSON.stringify(req.body, null, 2));

  try {
    // Handle the webhook.site data format
    if (req.body && req.body.values && Array.isArray(req.body.values)) {
      const accelValues = {};
      
      // Extract X, Y, Z values
      req.body.values.forEach(entry => {
        if (entry.name && entry.value !== undefined) {
          // Handle both accel_X and Accelerometer_X formats
          const normalizedName = entry.name.toLowerCase().replace('accel_', 'accelerometer_');
          accelValues[normalizedName] = parseFloat(entry.value);
        }
      });
      
      console.log('Extracted accelerometer values:', accelValues);
      
      // Calculate magnitude if we have all three components
      if (accelValues['accelerometer_x'] !== undefined && 
          accelValues['accelerometer_y'] !== undefined && 
          accelValues['accelerometer_z'] !== undefined) {
        
        const magnitude = Math.sqrt(
          Math.pow(accelValues['accelerometer_x'], 2) +
          Math.pow(accelValues['accelerometer_y'], 2) +
          Math.pow(accelValues['accelerometer_z'], 2)
        );
        
        // Store the data with timestamp
        const dataPoint = {
          timestamp: new Date().toISOString(),
          x: accelValues['accelerometer_x'],
          y: accelValues['accelerometer_y'],
          z: accelValues['accelerometer_z'],
          magnitude: magnitude
        };
        
        accelerometerData.push(dataPoint);
        
        // Keep only the most recent 1000 data points
        if (accelerometerData.length > 1000) {
          accelerometerData = accelerometerData.slice(-1000);
        }
        
        console.log(`Stored data point: ${JSON.stringify(dataPoint)}`);
        
        res.status(200).json({ 
          status: 'success', 
          message: 'Data received and stored',
          dataPoint: dataPoint
        });
      } else {
        console.warn('Missing accelerometer components:', accelValues);
        res.status(400).json({ 
          status: 'error', 
          message: 'Missing accelerometer components',
          receivedData: req.body
        });
      }
    } else {
      console.warn('Invalid data format:', req.body);
      res.status(400).json({ 
        status: 'error', 
        message: 'Invalid data format',
        receivedData: req.body
      });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message,
      receivedData: req.body
    });
  }
});

// API endpoint to get all stored accelerometer data
app.get('/api/data', (req, res) => {
  res.json({ 
    data: accelerometerData,
    count: accelerometerData.length
  });
});

// API endpoint to get the most recent data point
app.get('/api/latest', (req, res) => {
  const latest = accelerometerData[accelerometerData.length - 1];
  res.json({ 
    latest: latest || null
  });
});

// API endpoint to clear stored data
app.post('/api/clear', (req, res) => {
  accelerometerData = [];
  res.json({ 
    status: 'success',
    message: 'Data cleared',
    count: 0
  });
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Waiting for data...');
});

