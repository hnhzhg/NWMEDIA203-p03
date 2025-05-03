// src/musicGenerator.js - Module for processing accelerometer data

class AccelerometerMusicGenerator {
  constructor() {
    // Parameters
    this.minAccel = 0.5;
    this.maxAccel = 2.0;
    
    // Store latest data
    this.latestData = [];
  }
  
  // Process and store accelerometer data
  processData(accelData) {
    if (!Array.isArray(accelData) || accelData.length === 0) {
      throw new Error('Invalid accelerometer data');
    }
    
    // Calculate statistics from the data
    const avgMagnitude = accelData.reduce((sum, val) => sum + val, 0) / accelData.length;
    const maxMagnitude = Math.max(...accelData);
    
    // Store processed data
    this.latestData = {
      data: accelData,
      stats: {
        average: avgMagnitude,
        maximum: maxMagnitude,
        tempo: this.mapToTempo(avgMagnitude),
        timbre: this.mapToTimbreParams(avgMagnitude)
      }
    };
    
    return this.latestData;
  }
  
  // Map accelerometer magnitude to tempo (BPM)
  mapToTempo(magnitude) {
    // Map 0.5-2.0 to 60-160 BPM (slow to fast)
    return 60 + (magnitude - this.minAccel) * (100 / (this.maxAccel - this.minAccel));
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
  
  // Get the latest processed data
  getLatestData() {
    return this.latestData;
  }
}

module.exports = { AccelerometerMusicGenerator };