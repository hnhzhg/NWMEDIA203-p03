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
        patterns: { type: 'insufficient-data' },
        instrumentComplexity: { count: 1, instruments: ['piano'] }
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
        dynamics: this.mapToDynamics(accelData),
        patterns: this.detectPatterns(accelData),
        // Add instrumentation complexity mapping
        instrumentComplexity: this.mapToInstrumentComplexity(avgMagnitude)
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
  
  // Map accelerometer magnitude to tempo (BPM) - MORE DRAMATIC RANGE
  mapToTempo(magnitude) {
    // Map 0.5-2.0 to 40-180 BPM (slower to faster) for more dramatic difference
    return 40 + (magnitude - this.minAccel) * (140 / (this.maxAccel - this.minAccel));
  }
  
  // Map accelerometer magnitude to instrumentation complexity
  mapToInstrumentComplexity(magnitude) {
    // Low magnitude: 1-2 instruments, high magnitude: 3-5 instruments
    const numInstruments = Math.max(1, Math.min(5, Math.floor(1 + (magnitude - 0.5) * 4)));
    
    // Define different instrument combinations based on complexity
    const instrumentCombinations = {
      1: ['piano'],
      2: ['piano', 'bass'],
      3: ['piano', 'bass', 'drums'],
      4: ['piano', 'bass', 'drums', 'strings'],
      5: ['piano', 'bass', 'drums', 'strings', 'brass']
    };
    
    return {
      count: numInstruments,
      instruments: instrumentCombinations[numInstruments]
    };
  }
  
  // Map accelerometer magnitude to instrument/timbre parameters - ENHANCED CONTRAST
  mapToTimbreParams(magnitude) {
    let oscillatorType, attack, release, filterCutoff, resonance, effects;
    
    if (magnitude < 1.0) {
      // Low intensity: soft, warm, mellow sounds
      oscillatorType = 'sine';
      attack = 0.4 - (magnitude - 0.5) * 0.2; // 0.4 to 0.3
      release = 3.0 - (magnitude - 0.5) * 1.0; // 3.0 to 2.5
      filterCutoff = 150 + (magnitude - 0.5) * 450; // 150Hz to 375Hz
      resonance = 0.05;
      effects = {
        reverb: {
          wet: 0.7 - (magnitude - 0.5) * 0.2, // 0.7 to 0.6
          decay: 5.0 - (magnitude - 0.5) * 1.0 // 5.0 to 4.5
        },
        chorus: {
          wet: 0.3,
          frequency: 0.5,
          depth: 0.7
        }
      };
    } else if (magnitude < 1.5) {
      // Medium intensity: balanced sounds
      oscillatorType = 'triangle';
      attack = 0.3 - (magnitude - 1.0) * 0.25; // 0.3 to 0.175
      release = 2.5 - (magnitude - 1.0) * 1.7; // 2.5 to 1.65
      filterCutoff = 375 + (magnitude - 1.0) * 1625; // 375Hz to 1187.5Hz
      resonance = 0.2;
      effects = {
        reverb: {
          wet: 0.6 - (magnitude - 1.0) * 0.3, // 0.6 to 0.45
          decay: 4.5 - (magnitude - 1.0) * 2.5 // 4.5 to 3.25
        },
        delay: {
          wet: 0.2 + (magnitude - 1.0) * 0.1, // 0.2 to 0.25
          time: 0.3,
          feedback: 0.2
        }
      };
    } else {
      // High intensity: bright, sharp, energetic sounds
      oscillatorType = 'sawtooth';
      attack = 0.175 - (magnitude - 1.5) * 0.155; // 0.175 to 0.02
      release = 1.65 - (magnitude - 1.5) * 1.35; // 1.65 to 0.3
      filterCutoff = 1187.5 + (magnitude - 1.5) * 3812.5; // 1187Hz to 5000Hz
      resonance = 0.4 + (magnitude - 1.5) * 0.6; // 0.4 to 1.0
      effects = {
        distortion: {
          wet: 0.0 + (magnitude - 1.5) * 0.6, // 0 to 0.6
          amount: 0.2 + (magnitude - 1.5) * 0.5 // 0.2 to 0.7
        },
        delay: {
          wet: 0.25 + (magnitude - 1.5) * 0.15, // 0.25 to 0.4
          time: 0.16,
          feedback: 0.3 + (magnitude - 1.5) * 0.3 // 0.3 to 0.6
        }
      };
    }
    
    return {
      oscillatorType,
      attack,
      release,
      filterCutoff,
      resonance,
      effects
    };
  }
  
  // Map acceleration data to musical dynamics
  mapToDynamics(accelData) {
    // Calculate dynamics parameters based on data patterns
    const variability = this.calculateVariability(accelData);
    const trendDirection = this.calculateTrend(accelData);
    const peakCount = this.countPeaks(accelData);
    
    // Add more nuanced dynamics mapping
    const avgMagnitude = accelData.reduce((sum, val) => sum + val, 0) / accelData.length;
    
    // Dynamics curve (0-1.0 scale)
    let baseDynamics;
    if (avgMagnitude < 1.0) {
      // Soft with subtle variations (0.3-0.5)
      baseDynamics = 0.3 + (avgMagnitude - 0.5) * 0.4;
    } else if (avgMagnitude < 1.5) {
      // Medium with moderate variations (0.5-0.7)
      baseDynamics = 0.5 + (avgMagnitude - 1.0) * 0.4;
    } else {
      // Loud with dramatic variations (0.7-0.95)
      baseDynamics = 0.7 + (avgMagnitude - 1.5) * 0.5;
    }
    
    return {
      variability,
      trendDirection,
      peakCount,
      baseDynamics,
      articulation: avgMagnitude < 1.0 ? 'legato' : 
                    avgMagnitude < 1.5 ? 'normal' : 'staccato'
    };
  }
  
  // Calculate overall trend direction (-1 to 1)
  calculateTrend(data) {
    if (data.length < 5) return 0;
    
    // Simple linear regression to find slope
    const n = data.length;
    const indices = Array.from(Array(n).keys());
    
    const sumX = indices.reduce((sum, i) => sum + i, 0);
    const sumY = data.reduce((sum, y) => sum + y, 0);
    const sumXY = indices.reduce((sum, i) => sum + i * data[i], 0);
    const sumXX = indices.reduce((sum, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Normalize slope to -1 to 1 range
    return Math.max(-1, Math.min(1, slope * 10));
  }
  
  // Count peaks in the data (for rhythmic patterns)
  countPeaks(data) {
    if (data.length < 3) return 0;
    
    let peakCount = 0;
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] > data[i-1] && data[i] > data[i+1] && data[i] > 1.0) {
        peakCount++;
      }
    }
    
    return peakCount;
  }
  
  // Detect patterns in accelerometer data
  detectPatterns(accelData) {
    if (accelData.length < 10) return { type: 'insufficient-data' };
    
    // Analyze for repeating patterns
    const isRegular = this.detectRegularPattern(accelData);
    const hasSuddenSpikes = this.detectSuddenSpikes(accelData);
    const hasSustainedHigh = this.detectSustainedHigh(accelData);
    const hasSustainedLow = this.detectSustainedLow(accelData);
    
    // Determine primary pattern type with more categories
    let patternType;
    if (hasSustainedLow) {
      patternType = 'calm';
    } else if (isRegular) {
      patternType = 'regular';
    } else if (hasSuddenSpikes && hasSustainedHigh) {
      patternType = 'energetic';
    } else if (hasSuddenSpikes) {
      patternType = 'spiky';
    } else if (hasSustainedHigh) {
      patternType = 'sustained-high';
    } else {
      patternType = 'irregular';
    }
    
    return {
      type: patternType,
      isRegular,
      hasSuddenSpikes,
      hasSustainedHigh,
      hasSustainedLow
    };
  }
  
  // Detect if the pattern is regular/periodic
  detectRegularPattern(data) {
    // Simple algorithm to detect periodicity
    const peaks = [];
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] > data[i-1] && data[i] > data[i+1] && data[i] > 1.0) {
        peaks.push(i);
      }
    }
    
    if (peaks.length < 3) return false;
    
    // Calculate intervals between peaks
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i-1]);
    }
    
    // Check if intervals are consistent (within 25% variation)
    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const isRegular = intervals.every(interval => 
      Math.abs(interval - avgInterval) < 0.25 * avgInterval
    );
    
    return isRegular;
  }
  
  // Detect sudden spikes in the data
  detectSuddenSpikes(data) {
    let spikeCount = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i] > 1.5 && data[i] - data[i-1] > 0.5) {
        spikeCount++;
      }
    }
    
    return spikeCount >= 2;
  }
  
  // Detect sustained high values
  detectSustainedHigh(data) {
    let consecutiveHighCount = 0;
    let maxConsecutiveHigh = 0;
    
    for (let i = 0; i < data.length; i++) {
      if (data[i] > 1.5) {
        consecutiveHighCount++;
        maxConsecutiveHigh = Math.max(maxConsecutiveHigh, consecutiveHighCount);
      } else {
        consecutiveHighCount = 0;
      }
    }
    
    return maxConsecutiveHigh >= 4;
  }
  
  // Detect sustained low values
  detectSustainedLow(data) {
    let consecutiveLowCount = 0;
    let maxConsecutiveLow = 0;
    
    for (let i = 0; i < data.length; i++) {
      if (data[i] < 0.8) {
        consecutiveLowCount++;
        maxConsecutiveLow = Math.max(maxConsecutiveLow, consecutiveLowCount);
      } else {
        consecutiveLowCount = 0;
      }
    }
    
    return maxConsecutiveLow >= 6; // Longer sequence required for low
  }
  
  // Generate test data with a target magnitude (enhanced version)
  generateTestData(targetMagnitude = 1.0, variation = 0.2, count = 30) {
    // Clamp the target magnitude to valid range
    targetMagnitude = Math.max(this.minAccel, Math.min(this.maxAccel, targetMagnitude));
    
    // Generate data points around the target magnitude
    const data = [];
    
    // Create some patterns based on the target magnitude
    if (targetMagnitude < 1.0) {
      // Low magnitude: smooth, gradual changes (calm pattern)
      let currentValue = targetMagnitude - variation/2;
      for (let i = 0; i < count; i++) {
        // Gentle sine wave pattern
        currentValue = targetMagnitude + Math.sin(i / 5) * variation/2;
        data.push(Math.max(this.minAccel, currentValue));
      }
    } else if (targetMagnitude < 1.5) {
      // Medium magnitude: moderate variations (regular pattern)
      for (let i = 0; i < count; i++) {
        // Alternating pattern with medium variation
        const patternOffset = i % 4 === 0 ? variation/2 : 
                             i % 4 === 2 ? -variation/2 : 0;
        data.push(targetMagnitude + patternOffset);
      }
    } else {
      // High magnitude: sharper variations with spikes (energetic pattern)
      for (let i = 0; i < count; i++) {
        // Base value with occasional spikes
        let value = targetMagnitude - variation/2;
        if (i % 5 === 0) {
          value = Math.min(this.maxAccel, targetMagnitude + variation);
        } else if (i % 7 === 0) {
          value = Math.min(this.maxAccel, targetMagnitude + variation/2);
        }
        data.push(value);
      }
    }
    
    return data;
  }
  
  getLatestData() {
    return this.latestData;
  }
}

// Initialize our data processor
const dataProcessor = new AccelerometerDataProcessor();

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

// Add enhanced test endpoint to generate sample data with specific magnitude
app.get('/api/testData', (req, res) => {
  // Get the target magnitude from the query parameter, default to 1.0
  const targetMagnitude = parseFloat(req.query.magnitude || 1.0);
  
  // Generate targeted test data
  const testData = dataProcessor.generateTestData(targetMagnitude);
  
  // Replace the current data with the test data
  recentAccelData = testData;
  
  // Process the data
  dataProcessor.processData(recentAccelData);
  
  res.json({ 
    status: 'success', 
    message: 'Test data generated',
    targetMagnitude: targetMagnitude,
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