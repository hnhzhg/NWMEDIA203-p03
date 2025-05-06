// server.js - Express server to receive Arduino Cloud webhooks

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(bodyParser.json());
app.use(express.static('public'));

// Store most recent data
let recentAccelData = [];

// Simple data processor (without Magenta/Tone.js dependencies)
class AccelerometerDataProcessor {
  constructor() {
    this.minAccel = 0.5;
    this.maxAccel = 2.0;
    this.latestData = {
      data: [],
      stats: {
        average: 0,
        maximum: 0,
        minimum: 0,
        variability: 0,
        tempo: 60,
        timbre: {},
        patterns: { type: 'insufficient-data' }
      }
    };
  }
  
  // Calculate magnitude from X, Y, Z components
  calculateMagnitude(x, y, z) {
    return Math.sqrt(x * x + y * y + z * z);
  }
  
  processData(accelData) {
    console.log('Processing data:', accelData);
    
    if (!Array.isArray(accelData)) {
      console.warn('Invalid data format: not an array');
      return this.latestData;
    }
    
    if (accelData.length === 0) {
      console.warn('No data to process');
      return this.latestData;
    }
    
    // Calculate statistics from the data
    const avgMagnitude = accelData.reduce((sum, val) => sum + val, 0) / accelData.length;
    const maxMagnitude = Math.max(...accelData);
    const minMagnitude = Math.min(...accelData);
    const variability = this.calculateVariability(accelData);
    
    // Store processed data
    this.latestData = {
      data: accelData,
      stats: {
        average: avgMagnitude,
        maximum: maxMagnitude,
        minimum: minMagnitude,
        variability: variability,
        tempo: this.mapToTempo(avgMagnitude),
        timbre: this.mapToTimbreParams(avgMagnitude),
        patterns: this.detectPatterns(accelData)
      }
    };
    
    console.log('Processed data:', this.latestData);
    return this.latestData;
  }
  
  calculateVariability(data) {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const squaredDiffs = data.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / data.length;
    return Math.sqrt(variance);
  }
  
  mapToTempo(magnitude) {
    // Map 0.5-2.0 to 60-160 BPM (slow to fast)
    return 60 + (magnitude - this.minAccel) * (100 / (this.maxAccel - this.minAccel));
  }
  
  mapToTimbreParams(magnitude) {
    // Enhanced mapping with more dramatic differences between levels
    let oscillatorType, attack, release, filterCutoff, resonance;
    
    // Low movement (0.5-1.0): Soft, ambient sounds
    if (magnitude < 1.0) {
      oscillatorType = 'sine';
      attack = 0.4;
      release = 3.0; // Longer release for more sustained sound
      filterCutoff = 150; // Lower cutoff for warmer sound
      resonance = 0.1;
    } else if (magnitude < 1.5) {
      // Medium movement (1.0-1.5): More defined sounds
      oscillatorType = 'triangle';
      attack = 0.08;
      release = 0.8;
      filterCutoff = 1200;
      resonance = 0.3;
    } else {
      // High movement (1.5-2.0): Sharp, bright sounds
      oscillatorType = 'sawtooth'; // Changed to sawtooth for brighter sound
      attack = 0.02; // Very fast attack
      release = 0.3;  // Short release
      filterCutoff = 3500; // Higher cutoff for brighter sound
      resonance = 0.7; // More resonance for emphasis
    }
    
    return {
      oscillatorType,
      attack,
      release,
      filterCutoff,
      resonance
    };
  }
  
  detectPatterns(accelData) {
    if (accelData.length < 10) return { type: 'insufficient-data' };
    
    // Basic pattern detection
    let peakCount = 0;
    for (let i = 1; i < accelData.length - 1; i++) {
      if (accelData[i] > accelData[i-1] && accelData[i] > accelData[i+1] && accelData[i] > 1.3) {
        peakCount++;
      }
    }
    
    const avgValue = accelData.reduce((sum, val) => sum + val, 0) / accelData.length;
    const highValueCount = accelData.filter(val => val > 1.5).length;
    
    let patternType = 'irregular';
    if (peakCount > 3) {
      patternType = 'spiky';
    } else if (highValueCount > accelData.length * 0.5) {
      patternType = 'sustained-high';
    } else if (this.calculateVariability(accelData) < 0.2) {
      patternType = 'regular';
    }
    
    return {
      type: patternType,
      peakCount,
      highValueCount,
      averageValue: avgValue
    };
  }
  
  getLatestData() {
    return this.latestData;
  }
}

// Initialize our data processor
const dataProcessor = new AccelerometerDataProcessor();

// Process initial test data
dataProcessor.processData(recentAccelData);

// Webhook endpoint for Arduino Cloud
app.post('/webhook', (req, res) => {
  console.log('Received webhook request:', req.method, req.url);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).send();
  }
  
  try {
    // Handle the Python script's data format
    if (req.body && req.body.values && Array.isArray(req.body.values)) {
      const accelValues = {};
      
      // Extract X, Y, Z values
      req.body.values.forEach(entry => {
        if (entry.name && entry.value !== undefined) {
          accelValues[entry.name] = parseFloat(entry.value);
        }
      });
      
      console.log('Extracted accelerometer values:', accelValues);
      
      // Calculate magnitude if we have all three components
      if (accelValues['Accelerometer_X'] !== undefined && 
          accelValues['Accelerometer_Y'] !== undefined && 
          accelValues['Accelerometer_Z'] !== undefined) {
        
        const magnitude = dataProcessor.calculateMagnitude(
          accelValues['Accelerometer_X'],
          accelValues['Accelerometer_Y'],
          accelValues['Accelerometer_Z']
        );
        
        console.log(`Calculated magnitude: ${magnitude}`);
        
        // Add to our data array
        recentAccelData.push(magnitude);
        
        // Keep only the most recent 100 values
        if (recentAccelData.length > 100) {
          recentAccelData.shift();
        }
        
        // Process the data
        dataProcessor.processData(recentAccelData);
        
        res.header('Access-Control-Allow-Origin', '*');
        res.status(200).json({ 
          status: 'success', 
          message: 'Data received and processed',
          magnitude: magnitude,
          components: accelValues
        });
      } else {
        console.warn('Missing accelerometer components:', accelValues);
        res.header('Access-Control-Allow-Origin', '*');
        res.status(400).json({ 
          status: 'error', 
          message: 'Missing accelerometer components',
          receivedData: req.body
        });
      }
    } else {
      console.warn('Invalid data format:', req.body);
      res.header('Access-Control-Allow-Origin', '*');
      res.status(400).json({ 
        status: 'error', 
        message: 'Invalid data format',
        receivedData: req.body
      });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.header('Access-Control-Allow-Origin', '*');
    res.status(500).json({ 
      status: 'error', 
      message: error.message,
      receivedData: req.body
    });
  }
});

// API endpoint to get the most recent accelerometer data
app.get('/api/data', (req, res) => {
  try {
    const processedData = dataProcessor.getLatestData();
    
    console.log('Sending data:', {
      rawData: recentAccelData,
      processedData: processedData
    });
    
    res.header('Access-Control-Allow-Origin', '*');
    res.json({ 
      rawData: recentAccelData,
      processedData: processedData
    });
  } catch (error) {
    console.error('Error in /api/data endpoint:', error);
    res.header('Access-Control-Allow-Origin', '*');
    res.status(500).json({ 
      status: 'error', 
      message: 'Error processing data',
      error: error.message 
    });
  }
});

// Add a simple endpoint to get data for music generation
// The actual music generation will happen in the browser
app.get('/api/musicData', (req, res) => {
  if (recentAccelData.length < 10) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Not enough accelerometer data to generate music' 
    });
  }
  
  try {
    const processedData = dataProcessor.getLatestData();
    
    // Don't generate music here, just provide the processed data
    // for the client to generate music in the browser
    res.json({ 
      status: 'success', 
      accelerometerData: recentAccelData,
      processedData: processedData
    });
  } catch (error) {
    console.error('Error preparing music data:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Add test endpoint to generate sample data
app.get('/api/testData', (req, res) => {
  // Generate some random test data
  const testData = [];
  for (let i = 0; i < 30; i++) {
    // Generate values between 0.5 and 2.0
    const randomValue = 0.5 + Math.random() * 1.5;
    testData.push(randomValue);
  }
  
  // Add to our data array
  recentAccelData = testData;
  
  // Process the data
  dataProcessor.processData(recentAccelData);
  
  res.json({ 
    status: 'success', 
    message: 'Test data generated',
    data: testData
  });
});

// Serve the main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Waiting for data...');
});
