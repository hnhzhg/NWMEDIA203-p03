// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = 3000;

// Initialize accelerometer data array
let accelerometerData = [];

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
  // Return both legacy format and 3D format
  res.json({
    status: 'success',
    timestamp: new Date().toISOString(),
    rawData: accelerometerData.map(d => d.magnitude), // For backward compatibility
    rawData3D: {  // New 3D format
      x: accelerometerData.map(d => d.x),
      y: accelerometerData.map(d => d.y),
      z: accelerometerData.map(d => d.z)
    },
    processedData: processAccelerometerData(accelerometerData)
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


// Server-side code (Node.js) to support 3D accelerometer data

// Add this to your existing server.js or index.js file

// Sample 3D accelerometer data endpoint
app.get('/api/data', (req, res) => {
  // Return both legacy format and 3D format
  res.json({
    status: 'success',
    timestamp: new Date().toISOString(),
    rawData: accelerometerData.map(d => d.magnitude), // For backward compatibility
    rawData3D: {  // New 3D format
      x: accelerometerData.map(d => d.x),
      y: accelerometerData.map(d => d.y),
      z: accelerometerData.map(d => d.z)
    },
    processedData: processAccelerometerData(accelerometerData)
  });
});

// Enhanced test data endpoint with 3D support
app.get('/api/testData', (req, res) => {
  const intensity = parseFloat(req.query.intensity || 1.0);
  
  // Generate test data for all three axes
  const dataLength = 50;
  const dataX = [];
  const dataY = [];
  const dataZ = [];
  const magnitude = [];
  
  // Generate pattern based on intensity
  for (let i = 0; i < dataLength; i++) {
    // Different patterns for each axis
    const xVal = generatePatternValue(i, intensity, 0);
    const yVal = generatePatternValue(i, intensity, 1);
    const zVal = generatePatternValue(i, intensity, 2);
    
    // Calculate combined magnitude
    const mag = Math.sqrt(xVal*xVal + yVal*yVal + zVal*zVal);
    
    dataX.push(xVal);
    dataY.push(yVal);
    dataZ.push(zVal);
    magnitude.push(mag);
  }
  
  // Update stored data (for future fetches)
  accelerometerData = {
    x: dataX,
    y: dataY, 
    z: dataZ,
    magnitude: magnitude,
    timestamp: new Date().toISOString()
  };
  
  // Return the generated test data
  res.json({
    status: 'success',
    timestamp: accelerometerData.timestamp,
    data: magnitude, // For backward compatibility
    data3D: {
      x: dataX,
      y: dataY,
      z: dataZ
    }
  });
});

// Helper function to generate patterned values for test data
function generatePatternValue(index, intensity, axisType) {
  // Base value - different for each axis
  let value;
  
  // Each axis uses a different pattern
  switch (axisType) {
    case 0: // X axis - sine wave
      value = Math.sin(index / 5) * intensity * 0.5 + intensity * 0.5;
      break;
    case 1: // Y axis - sawtooth pattern
      value = ((index % 10) / 10) * intensity * 0.8 + intensity * 0.3;
      break;
    case 2: // Z axis - spiky pattern
      value = ((index % 4 === 0) ? intensity * 1.2 : intensity * 0.4) + (Math.random() * 0.3);
      break;
    default:
      value = intensity;
  }
  
  // Add some randomness
  value += (Math.random() - 0.5) * 0.2 * intensity;
  
  // Ensure value is within reasonable range
  return Math.max(0.1, Math.min(2.0, value));
}

// Process accelerometer data to extract additional information
function processAccelerometerData(data) {
  // Calculate statistics
  // const stats = calculateStats(data);
  
  // Calculate feature patterns
  const patterns = detectPatterns(data);

  
  return {
    // stats,
    // patterns,
    axisData: {
      x: calculateAxisStats(data.x),
      y: calculateAxisStats(data.y),
      z: calculateAxisStats(data.z)
    }
  };
}

function detectPatterns(data) {
  return {
    note: 'Pattern detection not implemented yet',
    dataPointsAnalyzed: data.length
  };
}

// Calculate statistics for a single axis
function calculateAxisStats(axisData) {
  if (!axisData || axisData.length === 0) {
    return {
      average: 0,
      max: 0,
      min: 0,
      variability: 0
    };
  }
  
  const average = axisData.reduce((sum, val) => sum + val, 0) / axisData.length;
  const max = Math.max(...axisData);
  const min = Math.min(...axisData);
  
  // Calculate variability (standard deviation)
  const squaredDiffs = axisData.map(val => Math.pow(val - average, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / axisData.length;
  const variability = Math.sqrt(variance);
  
  return {
    average,
    max,
    min,
    variability
  };
}

// Example endpoint for devices to send accelerometer data
app.post('/api/accelerometer', (req, res) => {
  const { x, y, z } = req.body;
  
  // Validate data
  if (!Array.isArray(x) || !Array.isArray(y) || !Array.isArray(z) ||
      x.length === 0 || y.length === 0 || z.length === 0) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Invalid accelerometer data format. Expected arrays for x, y, and z values.' 
    });
  }
  
  // Calculate magnitude
  const magnitude = [];
  const minLength = Math.min(x.length, y.length, z.length);
  
  for (let i = 0; i < minLength; i++) {
    magnitude.push(Math.sqrt(x[i]*x[i] + y[i]*y[i] + z[i]*z[i]));
  }
  
  // Store the data
  accelerometerData = {
    x,
    y,
    z,
    magnitude,
    timestamp: new Date().toISOString()
  };
  
  // Return success response
  res.json({
    status: 'success',
    message: 'Accelerometer data received',
    dataPoints: minLength
  });
});

// Add these API endpoints to your server.js file to support music generation

// API endpoint to provide data for music generation
app.get('/api/musicData', (req, res) => {
  // If there's no accelerometer data, return an error
  if (!accelerometerData || accelerometerData.length === 0) {
    return res.json({
      status: 'error',
      message: 'No accelerometer data available'
    });
  }
  
  // Calculate average magnitude
  let avgMagnitude = 0;
  let magnitudeArray = [];
  
  // Handle both array and object formats of accelerometerData
  if (Array.isArray(accelerometerData)) {
    // Handle array format
    magnitudeArray = accelerometerData.map(point => point.magnitude);
    avgMagnitude = magnitudeArray.reduce((sum, val) => sum + val, 0) / magnitudeArray.length;
  } else if (accelerometerData.magnitude && Array.isArray(accelerometerData.magnitude)) {
    // Handle object format with magnitude array
    magnitudeArray = accelerometerData.magnitude;
    avgMagnitude = magnitudeArray.reduce((sum, val) => sum + val, 0) / magnitudeArray.length;
  } else {
    // Default values if data format is unexpected
    magnitudeArray = [1.0, 1.1, 1.2, 1.3, 1.2, 1.1, 1.0];
    avgMagnitude = 1.1;
  }
  
  // Calculate variability
  const squaredDiffs = magnitudeArray.map(val => Math.pow(val - avgMagnitude, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / magnitudeArray.length;
  const variability = Math.sqrt(variance);
  
  // Count peaks
  let peakCount = 0;
  for (let i = 1; i < magnitudeArray.length - 1; i++) {
    if (magnitudeArray[i] > magnitudeArray[i-1] && 
        magnitudeArray[i] > magnitudeArray[i+1] && 
        magnitudeArray[i] > 1.3) {
      peakCount++;
    }
  }
  
  // Determine pattern type
  let patternType;
  if (peakCount > 3) {
    patternType = 'spiky';
  } else if (magnitudeArray.filter(val => val > 1.5).length > magnitudeArray.length * 0.5) {
    patternType = 'sustained-high';
  } else if (variability < 0.2) {
    patternType = 'regular';
  } else {
    patternType = 'irregular';
  }
  
  // Calculate tempo (60-160 BPM based on magnitude)
  const tempo = 60 + (avgMagnitude - 0.5) * (100 / 1.5);
  
  // Return the processed data for music generation
  res.json({
    status: 'success',
    accelerometerData: magnitudeArray,
    processedData: {
      stats: {
        average: avgMagnitude,
        max: Math.max(...magnitudeArray),
        min: Math.min(...magnitudeArray),
        variability: variability,
        peakCount: peakCount,
        tempo: tempo,
        patterns: {
          type: patternType
        }
      }
    }
  });
});