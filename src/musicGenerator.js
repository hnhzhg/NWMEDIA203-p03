// // src/musicGenerator.js - Enhanced with Magenta integration
// const mm = require('@magenta/music');

// class AccelerometerMusicGenerator {
//   constructor() {
//     // Parameters
//     this.minAccel = 0.5;
//     this.maxAccel = 2.0;
    
//     // Store latest data
//     this.latestData = [];
    
//     // Initialize Magenta models
//     this.initializeMagentaModels();
//   }
  
//   // Initialize Magenta ML models
//   async initializeMagentaModels() {
//     try {
//       // MusicRNN for melody continuation
//       this.musicRNN = new mm.MusicRNN(
//         'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn'
//       );
      
//       // MusicVAE for melody generation
//       this.musicVAE = new mm.MusicVAE(
//         'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_small_q2'
//       );
      
//       // Initialize models in parallel
//       await Promise.all([
//         this.musicRNN.initialize(),
//         this.musicVAE.initialize()
//       ]);
      
//       console.log('Magenta models initialized successfully');
//       this.modelsInitialized = true;
//     } catch (error) {
//       console.error('Error initializing Magenta models:', error);
//       this.modelsInitialized = false;
//     }
//   }
  
//   // Process and store accelerometer data
//   processData(accelData) {
//     if (!Array.isArray(accelData) || accelData.length === 0) {
//       throw new Error('Invalid accelerometer data');
//     }
    
//     // Calculate statistics from the data
//     const avgMagnitude = accelData.reduce((sum, val) => sum + val, 0) / accelData.length;
//     const maxMagnitude = Math.max(...accelData);
//     const variability = this.calculateVariability(accelData);
    
//     // Store processed data
//     this.latestData = {
//       data: accelData,
//       stats: {
//         average: avgMagnitude,
//         maximum: maxMagnitude,
//         variability: variability,
//         tempo: this.mapToTempo(avgMagnitude),
//         timbre: this.mapToTimbreParams(avgMagnitude),
//         dynamics: this.mapToDynamics(accelData),
//         patterns: this.detectPatterns(accelData)
//       }
//     };
    
//     return this.latestData;
//   }
  
//   // Calculate variability (standard deviation) in the data
//   calculateVariability(data) {
//     const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
//     const squaredDiffs = data.map(val => Math.pow(val - mean, 2));
//     const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / data.length;
//     return Math.sqrt(variance);
//   }
  
//   // Map accelerometer magnitude to tempo (BPM)
//   mapToTempo(magnitude) {
//     // Map 0.5-2.0 to 60-160 BPM (slow to fast)
//     return 60 + (magnitude - this.minAccel) * (100 / (this.maxAccel - this.minAccel));
//   }
  
//   // Map accelerometer magnitude to instrument/timbre parameters
//   mapToTimbreParams(magnitude) {
//     // More sophisticated mapping with multiple parameters
//     let oscillatorType, attack, release, filterCutoff, resonance;
    
//     if (magnitude < 1.0) {
//       // Low intensity: soft, warm sounds
//       oscillatorType = 'sine';
//       attack = 0.3 - (magnitude - 0.5) * 0.2; // 0.3 to 0.2
//       release = 2.0 - (magnitude - 0.5) * 1.0; // 2.0 to 1.5
//       filterCutoff = 200 + (magnitude - 0.5) * 600; // 200Hz to 500Hz
//       resonance = 0.1;
//     } else if (magnitude < 1.5) {
//       // Medium intensity: balanced sounds
//       oscillatorType = 'triangle';
//       attack = 0.2 - (magnitude - 1.0) * 0.15; // 0.2 to 0.125
//       release = 1.5 - (magnitude - 1.0) * 0.7; // 1.5 to 1.15
//       filterCutoff = 500 + (magnitude - 1.0) * 1500; // 500Hz to 1250Hz
//       resonance = 0.3;
//     } else {
//       // High intensity: bright, sharp sounds
//       oscillatorType = 'square';
//       attack = 0.125 - (magnitude - 1.5) * 0.075; // 0.125 to 0.05
//       release = 1.15 - (magnitude - 1.5) * 0.35; // 1.15 to 0.8
//       filterCutoff = 1250 + (magnitude - 1.5) * 3500; // 1250Hz to 3000Hz
//       resonance = 0.5;
//     }
    
//     return {
//       oscillatorType,
//       attack,
//       release,
//       filterCutoff,
//       resonance
//     };
//   }
  
//   // Map acceleration data to musical dynamics
//   mapToDynamics(accelData) {
//     // Calculate dynamics parameters based on data patterns
//     const variability = this.calculateVariability(accelData);
//     const trendDirection = this.calculateTrend(accelData);
//     const peakCount = this.countPeaks(accelData);
    
//     return {
//       variability,
//       trendDirection,
//       peakCount,
//       intensity: Math.min(1.0, variability * 2.5) // Normalized intensity (0.0-1.0)
//     };
//   }
  
//   // Calculate overall trend direction (-1 to 1)
//   calculateTrend(data) {
//     if (data.length < 5) return 0;
    
//     // Simple linear regression to find slope
//     const n = data.length;
//     const indices = Array.from(Array(n).keys());
    
//     const sumX = indices.reduce((sum, i) => sum + i, 0);
//     const sumY = data.reduce((sum, y) => sum + y, 0);
//     const sumXY = indices.reduce((sum, i) => sum + i * data[i], 0);
//     const sumXX = indices.reduce((sum, i) => sum + i * i, 0);
    
//     const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
//     // Normalize slope to -1 to 1 range
//     return Math.max(-1, Math.min(1, slope * 10));
//   }
  
//   // Count peaks in the data (for rhythmic patterns)
//   countPeaks(data) {
//     if (data.length < 3) return 0;
    
//     let peakCount = 0;
//     for (let i = 1; i < data.length - 1; i++) {
//       if (data[i] > data[i-1] && data[i] > data[i+1] && data[i] > 1.0) {
//         peakCount++;
//       }
//     }
    
//     return peakCount;
//   }
  
//   // Detect patterns in accelerometer data
//   detectPatterns(accelData) {
//     if (accelData.length < 10) return { type: 'insufficient-data' };
    
//     // Analyze for repeating patterns
//     const isRegular = this.detectRegularPattern(accelData);
//     const hasSuddenSpikes = this.detectSuddenSpikes(accelData);
//     const hasSustainedHigh = this.detectSustainedHigh(accelData);
    
//     // Determine primary pattern type
//     let patternType;
//     if (isRegular) {
//       patternType = 'regular';
//     } else if (hasSuddenSpikes) {
//       patternType = 'spiky';
//     } else if (hasSustainedHigh) {
//       patternType = 'sustained-high';
//     } else {
//       patternType = 'irregular';
//     }
    
//     return {
//       type: patternType,
//       isRegular,
//       hasSuddenSpikes,
//       hasSustainedHigh
//     };
//   }
  
//   // Detect if the pattern is regular/periodic
//   detectRegularPattern(data) {
//     // Simple algorithm to detect periodicity
//     const peaks = [];
//     for (let i = 1; i < data.length - 1; i++) {
//       if (data[i] > data[i-1] && data[i] > data[i+1] && data[i] > 1.0) {
//         peaks.push(i);
//       }
//     }
    
//     if (peaks.length < 3) return false;
    
//     // Calculate intervals between peaks
//     const intervals = [];
//     for (let i = 1; i < peaks.length; i++) {
//       intervals.push(peaks[i] - peaks[i-1]);
//     }
    
//     // Check if intervals are consistent (within 25% variation)
//     const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
//     const isRegular = intervals.every(interval => 
//       Math.abs(interval - avgInterval) < 0.25 * avgInterval
//     );
    
//     return isRegular;
//   }
  
//   // Detect sudden spikes in the data
//   detectSuddenSpikes(data) {
//     let spikeCount = 0;
//     for (let i = 1; i < data.length; i++) {
//       if (data[i] > 1.5 && data[i] - data[i-1] > 0.5) {
//         spikeCount++;
//       }
//     }
    
//     return spikeCount >= 2;
//   }
  
//   // Detect sustained high values
//   detectSustainedHigh(data) {
//     let consecutiveHighCount = 0;
//     let maxConsecutiveHigh = 0;
    
//     for (let i = 0; i < data.length; i++) {
//       if (data[i] > 1.5) {
//         consecutiveHighCount++;
//         maxConsecutiveHigh = Math.max(maxConsecutiveHigh, consecutiveHighCount);
//       } else {
//         consecutiveHighCount = 0;
//       }
//     }
    
//     return maxConsecutiveHigh >= 4;
//   }
  
//   // Get the latest processed data
//   getLatestData() {
//     return this.latestData;
//   }
  
//   // Generate music with Magenta based on accelerometer data
//   async generateMusic(style = 'default') {
//     if (!this.modelsInitialized) {
//       await this.initializeMagentaModels();
//     }
    
//     if (!this.latestData || !this.latestData.data || this.latestData.data.length < 10) {
//       throw new Error('Not enough data to generate music');
//     }
    
//     const { data, stats } = this.latestData;
    
//     // Create seed sequence based on accelerometer data
//     const seedSequence = this.createSeedSequence(data, stats);
    
//     // Set parameters based on movement patterns
//     const temperature = 0.8 + (stats.average - 0.5) * (0.8 / 1.5); // 0.8-1.6
//     const steps = Math.floor(16 + (stats.average - 0.5) * (32 / 1.5)); // 16-48 steps
    
//     // Choose generation method based on detected patterns
//     let generatedSequence;
    
//     if (stats.patterns.type === 'regular') {
//       // For regular patterns, use MusicRNN for continuation with lower temperature
//       generatedSequence = await this.musicRNN.continueSequence(
//         seedSequence, 
//         steps, 
//         temperature * 0.8
//       );
//     } else if (stats.patterns.type === 'spiky') {
//       // For spiky patterns, use MusicVAE with higher temperature for more variation
//       const z = await this.musicVAE.encode([seedSequence]);
//       generatedSequence = await this.musicVAE.decode(z, temperature * 1.2);
//       generatedSequence = generatedSequence[0];
//     } else {
//       // Default approach: standard continuation
//       generatedSequence = await this.musicRNN.continueSequence(
//         seedSequence, 
//         steps, 
//         temperature
//       );
//     }
    
//     // Apply style-specific adjustments
//     this.applyMusicStyle(generatedSequence, style, stats);
    
//     return {
//       sequence: generatedSequence,
//       stats: stats
//     };
//   }
  
//   // Create a seed sequence from accelerometer data
// createSeedSequence(accelData, stats) {
//   // Quantization settings
//   const qpm = stats.tempo;
//   const stepsPerQuarter = 4;
  
//   // Create a new sequence
//   const sequence = {
//     quantizationInfo: { stepsPerQuarter },
//     notes: [],
//     totalQuantizedSteps: 16
//   };
  
//   // Sample points for creating notes
//   const samplingRate = Math.floor(accelData.length / 8);
//   let step = 0;
  
//   // Create a wider pitch range for more dramatic contrast
//   for (let i = 0; i < accelData.length; i += samplingRate) {
//     const magnitude = accelData[i];
    
//     // Map magnitude to pitch with more dramatic scaling
//     // Range expanded from C2 (36) to C6 (84) for more range
//     const basePitch = 36 + Math.floor((magnitude - 0.5) * (48 / 1.5));
    
//     // Add more variation based on pattern type
//     let pitch = basePitch;
//     if (stats.patterns.type === 'spiky' && magnitude > 1.5) {
//       // For spikes, add more dramatic jumps
//       pitch += 12; // Full octave higher for more dramatic effect
//     } else if (stats.patterns.type === 'regular' && i % 2 === 0) {
//       // For regular patterns, add some melodic interest
//       pitch += 4; // Add a major third on alternating notes
//     }
    
//     // Map magnitude to note duration with more extreme differences
//     const durationSteps = magnitude < 1.0 ? 6 : // Longer notes for low movement
//                          magnitude < 1.5 ? 3 : // Medium notes for medium movement
//                          1; // Very short notes for high movement
    
//     // More dramatic velocity scaling
//     const velocity = magnitude < 1.0 ? 60 : // Softer for low movement
//                     magnitude < 1.5 ? 90 : // Medium for medium movement
//                     110; // Louder for high movement
    
//     sequence.notes.push({
//       pitch: pitch,
//       quantizedStartStep: step,
//       quantizedEndStep: step + durationSteps,
//       velocity: velocity
//     });
    
//     step += durationSteps;
//   }
  
//   sequence.totalQuantizedSteps = step;
//   return sequence;
// }
  
//   // Apply style-specific adjustments to the generated music
//   applyMusicStyle(sequence, style, stats) {
//     switch (style) {
//       case 'jazz':
//         this.applyJazzStyle(sequence, stats);
//         break;
//       case 'electronic':
//         this.applyElectronicStyle(sequence, stats);
//         break;
//       case 'ambient':
//         this.applyAmbientStyle(sequence, stats);
//         break;
//       default:
//         // No specific adjustments for default style
//         break;
//     }
    
//     return sequence;
//   }
  
//   // Apply jazz-style adjustments
//   applyJazzStyle(sequence, stats) {
//     // Add swing feel
//     for (let i = 0; i < sequence.notes.length; i++) {
//       const note = sequence.notes[i];
//       // If note starts on an even beat (0, 2, 4...), keep as is
//       // If note starts on an odd beat (1, 3, 5...), delay slightly for swing feel
//       if (note.quantizedStartStep % 2 === 1) {
//         note.quantizedStartStep += 0.5;
//         note.quantizedEndStep += 0.5;
//       }
//     }
    
//     // Add more chord tones (3rds, 7ths)
//     for (let i = 0; i < sequence.notes.length; i += 3) {
//       if (i + 1 < sequence.notes.length) {
//         const baseNote = sequence.notes[i];
//         // Add a third (4 semitones up)
//         sequence.notes.push({
//           pitch: baseNote.pitch + 4,
//           quantizedStartStep: baseNote.quantizedStartStep,
//           quantizedEndStep: baseNote.quantizedEndStep,
//           velocity: Math.max(40, baseNote.velocity - 20)
//         });
//       }
//     }
//   }
  
//   // Apply electronic music style adjustments
//   applyElectronicStyle(sequence, stats) {
//     // Add repeated notes for rhythmic emphasis
//     for (let i = 0; i < sequence.notes.length; i++) {
//       const note = sequence.notes[i];
//       const noteDuration = note.quantizedEndStep - note.quantizedStartStep;
      
//       if (noteDuration >= 3) {
//         // Split longer notes into repeated shorter notes
//         sequence.notes[i].quantizedEndStep = note.quantizedStartStep + 1;
        
//         for (let j = 1; j < noteDuration; j++) {
//           sequence.notes.push({
//             pitch: note.pitch,
//             quantizedStartStep: note.quantizedStartStep + j,
//             quantizedEndStep: note.quantizedStartStep + j + 1,
//             velocity: Math.max(40, note.velocity - 10 * j)
//           });
//         }
//       }
//     }
//   }
  
//   // Apply ambient music style adjustments
//   applyAmbientStyle(sequence, stats) {
//     // Make notes longer and more overlapping
//     for (let i = 0; i < sequence.notes.length; i++) {
//       const note = sequence.notes[i];
//       note.quantizedEndStep = note.quantizedEndStep + 4;
      
//       // Add occasional lower fifth for depth
//       if (i % 3 === 0) {
//         sequence.notes.push({
//           pitch: note.pitch - 7, // Perfect fifth down
//           quantizedStartStep: note.quantizedStartStep + 2,
//           quantizedEndStep: note.quantizedEndStep + 6,
//           velocity: Math.max(40, note.velocity - 30)
//         });
//       }
//     }
    
//     // Reduce velocity variations for smoother sound
//     for (let i = 0; i < sequence.notes.length; i++) {
//       sequence.notes[i].velocity = Math.min(
//         100, 
//         60 + (sequence.notes[i].velocity - 60) * 0.5
//       );
//     }
//   }
// }
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
  
  // Validate and fix any invalid pitches in a sequence
  validateSequence(sequence) {
    const MIN_PITCH = 21;  // A0
    const MAX_PITCH = 108; // C8
    
    if (!sequence || !sequence.notes) return sequence;
    
    let fixedNotes = 0;
    
    // Check and fix each note
    sequence.notes.forEach(note => {
      if (!note.hasOwnProperty('pitch')) return;
      
      // Store original pitch for logging
      const originalPitch = note.pitch;
      
      // Clamp pitch to safe range
      if (note.pitch < MIN_PITCH) {
        note.pitch = MIN_PITCH;
        fixedNotes++;
      } else if (note.pitch > MAX_PITCH) {
        note.pitch = MAX_PITCH;
        fixedNotes++;
      }
      
      // Log if we fixed something
      if (originalPitch !== note.pitch) {
        console.warn(`Fixed out-of-range pitch: ${originalPitch} → ${note.pitch}`);
      }
      
      // Ensure velocity is in valid MIDI range (0-127)
      if (note.velocity < 0) {
        note.velocity = 0;
      } else if (note.velocity > 127) {
        note.velocity = 127;
      }
    });
    
    if (fixedNotes > 0) {
      console.log(`Fixed ${fixedNotes} notes with invalid pitches`);
    }
    
    return sequence;
  }


// Update your generateMusic method to include validation
async generateMusic(style = 'default') {
  if (!this.modelsInitialized) {
    await this.initializeMagentaModels();
  }
  
  if (!this.latestData || !this.latestData.data || this.latestData.data.length < 10) {
    throw new Error('Not enough data to generate music');
  }
  
  const { data, stats } = this.latestData;
  
  try {
    // Create seed sequence based on accelerometer data
    const seedSequence = this.createSeedSequence(data, stats);
    
    // Validate seed sequence before using
    this.validateSequence(seedSequence);
    
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
    
    // Validate the generated sequence
    this.validateSequence(generatedSequence);
    
    // Apply style-specific adjustments
    this.applyMusicStyle(generatedSequence, style, stats);
    
    // Validate again after style adjustments
    this.validateSequence(generatedSequence);
    
    return {
      sequence: generatedSequence,
      stats: stats
    };
  } catch (error) {
    console.error('Error during music generation:', error);
    // Create a simple fallback sequence if generation fails
    return {
      sequence: this.createFallbackSequence(stats),
      stats: stats,
      error: error.message
    };
  }
}

// Create a simple fallback sequence if generation fails
createFallbackSequence(stats) {
  const MIN_PITCH = 48; // C3
  const MAX_PITCH = 72; // C5
  
  // Create a simple sequence
  const sequence = {
    quantizationInfo: { stepsPerQuarter: 4 },
    notes: [],
    totalQuantizedSteps: 32
  };
  
  // Create a simple ascending scale
  for (let i = 0; i < 8; i++) {
    const pitch = MIN_PITCH + i * 2; // Simple scale pattern
    sequence.notes.push({
      pitch: pitch,
      quantizedStartStep: i * 4,
      quantizedEndStep: i * 4 + 2,
      velocity: 80
    });
  }
  
  // Add more variation based on the average magnitude
  const avgMag = stats.average || 1.0;
  const notes = avgMag > 1.2 ? 12 : 7; // More notes for higher magnitude
  
  for (let i = 0; i < notes; i++) {
    const pitch = MIN_PITCH + Math.floor(Math.random() * (MAX_PITCH - MIN_PITCH));
    sequence.notes.push({
      pitch: pitch,
      quantizedStartStep: 32 + i * 2,
      quantizedEndStep: 32 + i * 2 + 1,
      velocity: 70
    });
  }
  
  sequence.totalQuantizedSteps = 32 + notes * 2;
  return sequence;
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
    
    // Define safe MIDI pitch range (0-127)
    // However, Magenta works best with pitches between 21 (A0) and 108 (C8)
    const MIN_PITCH = 36;  // C2
    const MAX_PITCH = 84;  // C6
    
    // Sample points for creating notes
    const samplingRate = Math.floor(accelData.length / 8);
    let step = 0;
    
    // Create a wider pitch range but with safe bounds
    for (let i = 0; i < accelData.length; i += samplingRate) {
      const magnitude = accelData[i];
      
      // Map magnitude to pitch with safe clamping
      // Safe range from C2 (36) to C6 (84)
      const normalizedMag = Math.min(1, Math.max(0, (magnitude - 0.5) / 1.5));
      const basePitch = MIN_PITCH + Math.floor(normalizedMag * (MAX_PITCH - MIN_PITCH));
      
      // Add more variation based on pattern type, but ensure it stays within safe range
      let pitch = basePitch;
      if (stats.patterns.type === 'spiky' && magnitude > 1.5) {
        // Add dramatic jumps but ensure we don't exceed MAX_PITCH
        pitch = Math.min(MAX_PITCH, pitch + 12); // Full octave higher, but capped
      } else if (stats.patterns.type === 'regular' && i % 2 === 0) {
        // For regular patterns, add some melodic interest
        pitch = Math.min(MAX_PITCH, pitch + 4); // Add a major third, but capped
      }
      
      // Map magnitude to note duration with more extreme differences
      const durationSteps = magnitude < 1.0 ? 6 : // Longer notes for low movement
                           magnitude < 1.5 ? 3 : // Medium notes for medium movement
                           1; // Very short notes for high movement
      
      // More dramatic velocity scaling, but keep within MIDI range (0-127)
      const velocity = Math.min(127, magnitude < 1.0 ? 60 : // Softer for low movement
                        magnitude < 1.5 ? 90 : // Medium for medium movement
                        110); // Louder for high movement
      
      // Final safety check to ensure pitch is in valid range
      const safePitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, pitch));
      
      // Add note to sequence
      sequence.notes.push({
        pitch: safePitch,
        quantizedStartStep: step,
        quantizedEndStep: step + durationSteps,
        velocity: velocity
      });
      
      step += durationSteps;
    }
    
    sequence.totalQuantizedSteps = step;
    return sequence;
  }
// createSeedSequence(accelData, stats) {
//   // Quantization settings
//   const qpm = stats.tempo;
//   const stepsPerQuarter = 4;
  
//   // Create a new sequence
//   const sequence = {
//     quantizationInfo: { stepsPerQuarter },
//     notes: [],
//     totalQuantizedSteps: 16
//   };
  
//   // Sample points for creating notes
//   const samplingRate = Math.floor(accelData.length / 8);
//   let step = 0;
  
//   // Create a wider pitch range for more dramatic contrast
//   for (let i = 0; i < accelData.length; i += samplingRate) {
//     const magnitude = accelData[i];
    
//     // Map magnitude to pitch with more dramatic scaling
//     // Range expanded from C2 (36) to C6 (84) for more range
//     const basePitch = 36 + Math.floor((magnitude - 0.5) * (48 / 1.5));
    
//     // Add more variation based on pattern type
//     let pitch = basePitch;
//     if (stats.patterns.type === 'spiky' && magnitude > 1.5) {
//       // For spikes, add more dramatic jumps
//       pitch += 12; // Full octave higher for more dramatic effect
//     } else if (stats.patterns.type === 'regular' && i % 2 === 0) {
//       // For regular patterns, add some melodic interest
//       pitch += 4; // Add a major third on alternating notes
//     }
    
//     // Map magnitude to note duration with more extreme differences
//     const durationSteps = magnitude < 1.0 ? 6 : // Longer notes for low movement
//                          magnitude < 1.5 ? 3 : // Medium notes for medium movement
//                          1; // Very short notes for high movement
    
//     // More dramatic velocity scaling
//     const velocity = magnitude < 1.0 ? 60 : // Softer for low movement
//                     magnitude < 1.5 ? 90 : // Medium for medium movement
//                     110; // Louder for high movement
    
//     sequence.notes.push({
//       pitch: pitch,
//       quantizedStartStep: step,
//       quantizedEndStep: step + durationSteps,
//       velocity: velocity
//     });
    
//     step += durationSteps;
//   }
  
//   sequence.totalQuantizedSteps = step;
//   return sequence;
// }
  
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
  
// Updated applyJazzStyle with pitch validation
applyJazzStyle(sequence, stats) {
  const MIN_PITCH = 21;  // A0
  const MAX_PITCH = 108; // C8
  
  // Add swing feel
  for (let i = 0; i < sequence.notes.length; i++) {
    const note = sequence.notes[i];
    // If note starts on an odd beat (1, 3, 5...), delay slightly for swing feel
    if (note.quantizedStartStep % 2 === 1) {
      note.quantizedStartStep += 0.5;
      note.quantizedEndStep += 0.5;
    }
  }
  
  // Add more chord tones (3rds, 7ths) with pitch validation
  const originalNotes = [...sequence.notes]; // Create a copy to avoid modifying during iteration
  
  for (let i = 0; i < originalNotes.length; i += 3) {
    if (i + 1 < originalNotes.length) {
      const baseNote = originalNotes[i];
      const harmonyPitch = baseNote.pitch + 4; // Third up
      
      // Only add if the harmony note is within safe range
      if (harmonyPitch <= MAX_PITCH) {
        sequence.notes.push({
          pitch: harmonyPitch,
          quantizedStartStep: baseNote.quantizedStartStep,
          quantizedEndStep: baseNote.quantizedEndStep,
          velocity: Math.max(40, baseNote.velocity - 20)
        });
      }
    }
  }
}

// Updated applyElectronicStyle with pitch validation
applyElectronicStyle(sequence, stats) {
  // Add repeated notes for rhythmic emphasis
  const originalNotes = [...sequence.notes]; // Create a copy to avoid modifying during iteration
  
  for (let i = 0; i < originalNotes.length; i++) {
    const note = originalNotes[i];
    const noteDuration = note.quantizedEndStep - note.quantizedStartStep;
    
    if (noteDuration >= 3) {
      // Modify the original note
      sequence.notes[i].quantizedEndStep = note.quantizedStartStep + 1;
      
      // Add repeated notes
      for (let j = 1; j < noteDuration; j++) {
        sequence.notes.push({
          pitch: note.pitch, // Pitch is already validated
          quantizedStartStep: note.quantizedStartStep + j,
          quantizedEndStep: note.quantizedStartStep + j + 1,
          velocity: Math.max(40, note.velocity - 10 * j)
        });
      }
    }
  }
}

// Updated applyAmbientStyle with pitch validation
applyAmbientStyle(sequence, stats) {
  const MIN_PITCH = 21;  // A0
  const originalNotes = [...sequence.notes]; // Create a copy to avoid modifying during iteration
  
  // Make notes longer and more overlapping
  for (let i = 0; i < sequence.notes.length; i++) {
    const note = sequence.notes[i];
    note.quantizedEndStep = note.quantizedEndStep + 4;
  }
  
  // Add additional notes with validation
  for (let i = 0; i < originalNotes.length; i += 3) {
    if (i < originalNotes.length) {
      const note = originalNotes[i];
      const lowerPitch = note.pitch - 7; // Perfect fifth down
      
      // Only add if the new pitch is within safe range
      if (lowerPitch >= MIN_PITCH) {
        sequence.notes.push({
          pitch: lowerPitch,
          quantizedStartStep: note.quantizedStartStep + 2,
          quantizedEndStep: note.quantizedEndStep + 6,
          velocity: Math.max(40, note.velocity - 30)
        });
      }
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