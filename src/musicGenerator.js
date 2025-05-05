// src/musicGenerator.js - Enhanced with Magenta integration
const mm = require('@magenta/music');

class AccelerometerMusicGenerator {
  constructor() {
    // Parameters
    this.minAccel = 0.5;
    this.maxAccel = 2.0;
    
    // Store latest data
    this.latestData = [];
    
    // Initialize Magenta models
    this.initializeMagentaModels();
  }
  
  // Initialize Magenta ML models
  async initializeMagentaModels() {
    try {
      // MusicRNN for melody continuation
      this.musicRNN = new mm.MusicRNN(
        'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn'
      );
      
      // MusicVAE for melody generation
      this.musicVAE = new mm.MusicVAE(
        'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_small_q2'
      );
      
      // Initialize models in parallel
      await Promise.all([
        this.musicRNN.initialize(),
        this.musicVAE.initialize()
      ]);
      
      console.log('Magenta models initialized successfully');
      this.modelsInitialized = true;
    } catch (error) {
      console.error('Error initializing Magenta models:', error);
      this.modelsInitialized = false;
    }
  }
  
  // Process and store accelerometer data
  processData(accelData) {
    if (!Array.isArray(accelData) || accelData.length === 0) {
      throw new Error('Invalid accelerometer data');
    }
    
    // Calculate statistics from the data
    const avgMagnitude = accelData.reduce((sum, val) => sum + val, 0) / accelData.length;
    const maxMagnitude = Math.max(...accelData);
    const variability = this.calculateVariability(accelData);
    
    // Store processed data
    this.latestData = {
      data: accelData,
      stats: {
        average: avgMagnitude,
        maximum: maxMagnitude,
        variability: variability,
        tempo: this.mapToTempo(avgMagnitude),
        timbre: this.mapToTimbreParams(avgMagnitude),
        dynamics: this.mapToDynamics(accelData),
        patterns: this.detectPatterns(accelData)
      }
    };
    
    return this.latestData;
  }
  
  // Calculate variability (standard deviation) in the data
  calculateVariability(data) {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const squaredDiffs = data.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / data.length;
    return Math.sqrt(variance);
  }
  
  // Map accelerometer magnitude to tempo (BPM)
  mapToTempo(magnitude) {
    // Map 0.5-2.0 to 60-160 BPM (slow to fast)
    return 60 + (magnitude - this.minAccel) * (100 / (this.maxAccel - this.minAccel));
  }
  
  // Map accelerometer magnitude to instrument/timbre parameters
  mapToTimbreParams(magnitude) {
    // More sophisticated mapping with multiple parameters
    let oscillatorType, attack, release, filterCutoff, resonance;
    
    if (magnitude < 1.0) {
      // Low intensity: soft, warm sounds
      oscillatorType = 'sine';
      attack = 0.3 - (magnitude - 0.5) * 0.2; // 0.3 to 0.2
      release = 2.0 - (magnitude - 0.5) * 1.0; // 2.0 to 1.5
      filterCutoff = 200 + (magnitude - 0.5) * 600; // 200Hz to 500Hz
      resonance = 0.1;
    } else if (magnitude < 1.5) {
      // Medium intensity: balanced sounds
      oscillatorType = 'triangle';
      attack = 0.2 - (magnitude - 1.0) * 0.15; // 0.2 to 0.125
      release = 1.5 - (magnitude - 1.0) * 0.7; // 1.5 to 1.15
      filterCutoff = 500 + (magnitude - 1.0) * 1500; // 500Hz to 1250Hz
      resonance = 0.3;
    } else {
      // High intensity: bright, sharp sounds
      oscillatorType = 'square';
      attack = 0.125 - (magnitude - 1.5) * 0.075; // 0.125 to 0.05
      release = 1.15 - (magnitude - 1.5) * 0.35; // 1.15 to 0.8
      filterCutoff = 1250 + (magnitude - 1.5) * 3500; // 1250Hz to 3000Hz
      resonance = 0.5;
    }
    
    return {
      oscillatorType,
      attack,
      release,
      filterCutoff,
      resonance
    };
  }
  
  // Map acceleration data to musical dynamics
  mapToDynamics(accelData) {
    // Calculate dynamics parameters based on data patterns
    const variability = this.calculateVariability(accelData);
    const trendDirection = this.calculateTrend(accelData);
    const peakCount = this.countPeaks(accelData);
    
    return {
      variability,
      trendDirection,
      peakCount,
      intensity: Math.min(1.0, variability * 2.5) // Normalized intensity (0.0-1.0)
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
    
    // Determine primary pattern type
    let patternType;
    if (isRegular) {
      patternType = 'regular';
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
      hasSustainedHigh
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
  
  // Get the latest processed data
  getLatestData() {
    return this.latestData;
  }
  
  // Generate music with Magenta based on accelerometer data
  async generateMusic(style = 'default') {
    if (!this.modelsInitialized) {
      await this.initializeMagentaModels();
    }
    
    if (!this.latestData || !this.latestData.data || this.latestData.data.length < 10) {
      throw new Error('Not enough data to generate music');
    }
    
    const { data, stats } = this.latestData;
    
    // Create seed sequence based on accelerometer data
    const seedSequence = this.createSeedSequence(data, stats);
    
    // Set parameters based on movement patterns
    const temperature = 0.8 + (stats.average - 0.5) * (0.8 / 1.5); // 0.8-1.6
    const steps = Math.floor(16 + (stats.average - 0.5) * (32 / 1.5)); // 16-48 steps
    
    // Choose generation method based on detected patterns
    let generatedSequence;
    
    if (stats.patterns.type === 'regular') {
      // For regular patterns, use MusicRNN for continuation with lower temperature
      generatedSequence = await this.musicRNN.continueSequence(
        seedSequence, 
        steps, 
        temperature * 0.8
      );
    } else if (stats.patterns.type === 'spiky') {
      // For spiky patterns, use MusicVAE with higher temperature for more variation
      const z = await this.musicVAE.encode([seedSequence]);
      generatedSequence = await this.musicVAE.decode(z, temperature * 1.2);
      generatedSequence = generatedSequence[0];
    } else {
      // Default approach: standard continuation
      generatedSequence = await this.musicRNN.continueSequence(
        seedSequence, 
        steps, 
        temperature
      );
    }
    
    // Apply style-specific adjustments
    this.applyMusicStyle(generatedSequence, style, stats);
    
    return {
      sequence: generatedSequence,
      stats: stats
    };
  }
  
  // Create a seed sequence from accelerometer data
  createSeedSequence(accelData, stats) {
    // Quantization settings
    const qpm = stats.tempo;
    const stepsPerQuarter = 4;
    
    // Create a new sequence
    const sequence = {
      quantizationInfo: { stepsPerQuarter },
      notes: [],
      totalQuantizedSteps: 16
    };
    
    // Sample points for creating notes
    const samplingRate = Math.floor(accelData.length / 8);
    let step = 0;
    
    for (let i = 0; i < accelData.length; i += samplingRate) {
      const magnitude = accelData[i];
      
      // Map magnitude to pitch (higher magnitude = higher pitch)
      // Range from C3 (48) to C5 (72)
      const basePitch = 48 + Math.floor((magnitude - 0.5) * (24 / 1.5));
      
      // Add some variation based on pattern type
      let pitch = basePitch;
      if (stats.patterns.type === 'spiky' && magnitude > 1.5) {
        // For spikes, add occasional higher notes
        pitch += 7; // Perfect fifth higher
      }
      
      // Map magnitude to note duration (higher magnitude = shorter notes)
      const durationSteps = Math.max(1, Math.floor(4 - (magnitude - 0.5) * 2));
      
      sequence.notes.push({
        pitch: pitch,
        quantizedStartStep: step,
        quantizedEndStep: step + durationSteps,
        velocity: 80 + Math.floor((magnitude - 0.5) * (47 / 1.5)) // 80-127
      });
      
      step += durationSteps;
    }
    
    sequence.totalQuantizedSteps = step;
    return sequence;
  }
  
  // Apply style-specific adjustments to the generated music
  applyMusicStyle(sequence, style, stats) {
    switch (style) {
      case 'jazz':
        this.applyJazzStyle(sequence, stats);
        break;
      case 'electronic':
        this.applyElectronicStyle(sequence, stats);
        break;
      case 'ambient':
        this.applyAmbientStyle(sequence, stats);
        break;
      default:
        // No specific adjustments for default style
        break;
    }
    
    return sequence;
  }
  
  // Apply jazz-style adjustments
  applyJazzStyle(sequence, stats) {
    // Add swing feel
    for (let i = 0; i < sequence.notes.length; i++) {
      const note = sequence.notes[i];
      // If note starts on an even beat (0, 2, 4...), keep as is
      // If note starts on an odd beat (1, 3, 5...), delay slightly for swing feel
      if (note.quantizedStartStep % 2 === 1) {
        note.quantizedStartStep += 0.5;
        note.quantizedEndStep += 0.5;
      }
    }
    
    // Add more chord tones (3rds, 7ths)
    for (let i = 0; i < sequence.notes.length; i += 3) {
      if (i + 1 < sequence.notes.length) {
        const baseNote = sequence.notes[i];
        // Add a third (4 semitones up)
        sequence.notes.push({
          pitch: baseNote.pitch + 4,
          quantizedStartStep: baseNote.quantizedStartStep,
          quantizedEndStep: baseNote.quantizedEndStep,
          velocity: Math.max(40, baseNote.velocity - 20)
        });
      }
    }
  }
  
  // Apply electronic music style adjustments
  applyElectronicStyle(sequence, stats) {
    // Add repeated notes for rhythmic emphasis
    for (let i = 0; i < sequence.notes.length; i++) {
      const note = sequence.notes[i];
      const noteDuration = note.quantizedEndStep - note.quantizedStartStep;
      
      if (noteDuration >= 3) {
        // Split longer notes into repeated shorter notes
        sequence.notes[i].quantizedEndStep = note.quantizedStartStep + 1;
        
        for (let j = 1; j < noteDuration; j++) {
          sequence.notes.push({
            pitch: note.pitch,
            quantizedStartStep: note.quantizedStartStep + j,
            quantizedEndStep: note.quantizedStartStep + j + 1,
            velocity: Math.max(40, note.velocity - 10 * j)
          });
        }
      }
    }
  }
  
  // Apply ambient music style adjustments
  applyAmbientStyle(sequence, stats) {
    // Make notes longer and more overlapping
    for (let i = 0; i < sequence.notes.length; i++) {
      const note = sequence.notes[i];
      note.quantizedEndStep = note.quantizedEndStep + 4;
      
      // Add occasional lower fifth for depth
      if (i % 3 === 0) {
        sequence.notes.push({
          pitch: note.pitch - 7, // Perfect fifth down
          quantizedStartStep: note.quantizedStartStep + 2,
          quantizedEndStep: note.quantizedEndStep + 6,
          velocity: Math.max(40, note.velocity - 30)
        });
      }
    }
    
    // Reduce velocity variations for smoother sound
    for (let i = 0; i < sequence.notes.length; i++) {
      sequence.notes[i].velocity = Math.min(
        100, 
        60 + (sequence.notes[i].velocity - 60) * 0.5
      );
    }
  }
}