// src/musicGenerator.js - Module for generating music from accelerometer data

const mm = require('@magenta/music');
const Tone = require('tone');

class AccelerometerMusicGenerator {
  constructor() {
    // Initialize Magenta music models
    this.musicRNN = new mm.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn');
    this.musicVAE = new mm.MusicVAE('https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_small_q2');
    
    // Parameters
    this.minAccel = 0.5;
    this.maxAccel = 2.0;
    
    // Track if models are loaded
    this.modelsLoaded = false;
    
    // Store generated sequences
    this.latestSequence = null;
  }
  
  async loadModels() {
    try {
      await this.musicRNN.initialize();
      await this.musicVAE.initialize();
      this.modelsLoaded = true;
      console.log('Models loaded successfully');
    } catch (error) {
      console.error('Error loading models:', error);
      throw error;
    }
  }
  
  // Map accelerometer magnitude to tempo (BPM)
  mapToTempo(magnitude) {
    // Map 0.5-2.0 to 60-160 BPM (slow to fast)
    return 60 + (magnitude - this.minAccel) * (100 / (this.maxAccel - this.minAccel));
  }
  
  // Map accelerometer magnitude to note density
  mapToNoteDensity(magnitude) {
    // Higher magnitude = more notes
    return (magnitude - this.minAccel) / (this.maxAccel - this.minAccel);
  }
  
  // Map accelerometer magnitude to instrument/timbre parameters
  mapToTimbreParams(magnitude) {
    // Simple mapping: lower values use softer sounds, higher values use brighter sounds
    const oscillatorType = magnitude < 1.0 ? 'sine' : 
                          magnitude < 1.5 ? 'triangle' : 'square';
                          
    const attack = magnitude < 1.2 ? 0.2 : 0.05; // Faster attack for higher magnitudes
    const release = magnitude < 1.2 ? 1.5 : 0.8;  // Longer release for lower magnitudes
    
    return {
      oscillatorType,
      attack,
      release
    };
  }
  
  // Generate music based on accelerometer data
  async generateFromData(accelData) {
    if (!this.modelsLoaded) {
      try {
        await this.loadModels();
      } catch (error) {
        throw new Error('Models not loaded and failed to load: ' + error.message);
      }
    }
    
    if (!Array.isArray(accelData) || accelData.length === 0) {
      throw new Error('Invalid accelerometer data');
    }
    
    // Calculate statistics from the data
    const avgMagnitude = accelData.reduce((sum, val) => sum + val, 0) / accelData.length;
    const maxMagnitude = Math.max(...accelData);
    
    // Set the tempo based on average magnitude
    const tempo = this.mapToTempo(avgMagnitude);
    
    // Generate a seed sequence
    const seed = {
      notes: [
        { pitch: 60, quantizedStartStep: 0, quantizedEndStep: 4 }
      ],
      totalQuantizedSteps: 4,
      quantizationInfo: { stepsPerQuarter: 4 }
    };
    
    // Generate a continuation with the RNN model
    // Temperature affects randomness (higher = more random)
    // Map max magnitude to temperature (more sudden moves = more variation)
    const temperature = 0.5 + maxMagnitude - this.minAccel;
    
    try {
      // Generate a sequence from the model
      const result = await this.musicRNN.continueSequence(
        seed, 
        16, // Number of steps to generate
        temperature
      );
      
      // Add the tempo and timbre parameters to the result
      result.tempo = tempo;
      result.timbreParams = this.mapToTimbreParams(avgMagnitude);
      
      // Store the latest sequence
      this.latestSequence = result;
      
      return result;
    } catch (error) {
      console.error('Error generating music:', error);
      throw error;
    }
  }
  
  // Get the latest generated sequence
  getLatestSequence() {
    return this.latestSequence;
  }
}

module.exports = { AccelerometerMusicGenerator };