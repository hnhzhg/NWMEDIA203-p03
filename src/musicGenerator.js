// Enhanced musicGenerator.js with more dramatic musical differences

const mm = require('@magenta/music');

class AccelerometerMusicGenerator {
  constructor() {
    // Parameters with wider range for more dramatic differences
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
      
      // Drum RNN for percussion patterns
      this.drumRNN = new mm.MusicRNN(
        'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/drum_kit_rnn'
      );
      
      // Multi-instrument VAE for richer patterns
      this.multiVAE = new mm.MusicVAE(
        'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/multitrack_chords'
      );
      
      // Initialize models in parallel
      await Promise.all([
        this.musicRNN.initialize(),
        this.musicVAE.initialize(),
        this.drumRNN.initialize(),
        this.multiVAE.initialize()
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
        patterns: this.detectPatterns(accelData),
        // Add instrumentation complexity mapping
        instrumentComplexity: this.mapToInstrumentComplexity(avgMagnitude)
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
  
  // Map accelerometer magnitude to tempo (BPM) - MORE DRAMATIC DIFFERENCES
  mapToTempo(magnitude) {
    // Expanded range: 40-180 BPM (slower to faster) for more dramatic difference
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
    // Much more differentiated mapping with multiple parameters
    let oscillatorTypes, attack, release, filterCutoff, resonance, effects;
    
    if (magnitude < 1.0) {
      // Low intensity: soft, warm, mellow sounds
      oscillatorTypes = ['sine', 'triangle'];
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
      oscillatorTypes = ['triangle', 'square'];
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
      oscillatorTypes = ['square', 'sawtooth'];
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
      oscillatorTypes,
      attack,
      release,
      filterCutoff,
      resonance,
      effects
    };
  }
  
  // Map acceleration data to musical dynamics - ENHANCED VERSION
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
      intensityCurve: this.createIntensityCurve(accelData, baseDynamics),
      articulation: avgMagnitude < 1.0 ? 'legato' : 
                   avgMagnitude < 1.5 ? 'normal' : 'staccato'
    };
  }
  
  // Create a dynamics intensity curve based on movement data
  createIntensityCurve(data, baseLevel) {
    // Generate a 16-step intensity curve from the data
    const curve = [];
    const samplePoints = 16;
    
    // Normalize to 16 points regardless of data length
    for (let i = 0; i < samplePoints; i++) {
      const dataIndex = Math.floor(i * data.length / samplePoints);
      const magnitude = data[dataIndex];
      
      // Normalize to 0-1 range around the base level
      const intensityVariation = (magnitude - 0.5) / 1.5 * 0.5; // +/- 0.5 max variation
      const intensity = Math.max(0, Math.min(1, baseLevel + intensityVariation));
      
      curve.push(intensity);
    }
    
    return curve;
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
  
  // Get the latest processed data
  getLatestData() {
    return this.latestData;
  }
  
  // Generate music with Magenta based on accelerometer data - MULTI-INSTRUMENT VERSION
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
    
    // Generate separate parts for different instruments based on magnitude
    const parts = {};
    
    // Set parameters based on movement patterns
    const temperature = 0.8 + (stats.average - 0.5) * (0.8 / 1.5); // 0.8-1.6
    const steps = Math.floor(16 + (stats.average - 0.5) * (32 / 1.5)); // 16-48 steps
    
    // Generate lead melody
    parts.melody = await this.generateMelody(seedSequence, steps, temperature, stats);
    
    // For multiple instruments based on complexity
    const instruments = stats.instrumentComplexity.instruments;
    
    // Add bass if complexity allows
    if (instruments.includes('bass')) {
      parts.bass = await this.generateBass(seedSequence, steps, temperature, stats);
    }
    
    // Add drums if complexity allows
    if (instruments.includes('drums')) {
      parts.drums = await this.generateDrums(seedSequence, steps, temperature, stats);
    }
    
    // Add additional instruments for high complexity
    if (instruments.includes('strings')) {
      parts.strings = await this.generateStrings(seedSequence, steps, temperature, stats);
    }
    
    if (instruments.includes('brass')) {
      parts.brass = await this.generateBrass(seedSequence, steps, temperature, stats);
    }
    
    // Combine all parts into a cohesive multi-track sequence
    const multiTrackSequence = this.combineMultiTrackSequence(parts, stats);
    
    // Apply style-specific adjustments
    this.applyMusicStyle(multiTrackSequence, style, stats);
    
    return {
      sequence: multiTrackSequence,
      parts: parts,
      stats: stats
    };
  }
  
  // Generate lead melody
  async generateMelody(seedSequence, steps, temperature, stats) {
    // Choose generation method based on detected patterns
    let melody;
    
    if (stats.patterns.type === 'calm') {
      // For calm patterns, use MusicVAE with low temperature for smooth melodies
      const z = await this.musicVAE.encode([seedSequence]);
      melody = await this.musicVAE.decode(z, temperature * 0.7);
      melody = melody[0];
    } else if (stats.patterns.type === 'regular') {
      // For regular patterns, use MusicRNN for continuation with lower temperature
      melody = await this.musicRNN.continueSequence(
        seedSequence, 
        steps, 
        temperature * 0.8
      );
    } else if (stats.patterns.type === 'energetic' || stats.patterns.type === 'spiky') {
      // For energetic patterns, use MusicVAE with higher temperature for more variation
      const z = await this.musicVAE.encode([seedSequence]);
      melody = await this.musicVAE.decode(z, temperature * 1.2);
      melody = melody[0];
    } else {
      // Default approach: standard continuation
      melody = await this.musicRNN.continueSequence(
        seedSequence, 
        steps, 
        temperature
      );
    }
    
    // Make melody notes more pronounced for lead instrument
    for (const note of melody.notes) {
      note.velocity = Math.min(127, note.velocity + 15);
    }
    
    return melody;
  }
  
  // Generate bass line
  async generateBass(seedSequence, steps, temperature, stats) {
    // Simplify and transpose the seed for bass
    const bassSeed = this.createBassLineFromSeed(seedSequence);
    
    // Generate bass line
    let bassLine;
    
    if (stats.patterns.type === 'calm') {
      // Simple, smooth bass line for calm patterns
      bassLine = await this.musicRNN.continueSequence(
        bassSeed,
        steps,
        temperature * 0.6
      );
    } else if (stats.patterns.type === 'energetic') {
      // More active bass line for energetic patterns
      bassLine = await this.musicRNN.continueSequence(
        bassSeed,
        steps,
        temperature * 1.1
      );
    } else {
      // Standard bass line
      bassLine = await this.musicRNN.continueSequence(
        bassSeed,
        steps,
        temperature * 0.8
      );
    }
    
    // Adjust velocity for bass
    for (const note of bassLine.notes) {
      note.velocity = Math.min(100, Math.max(60, note.velocity - 10));
    }
    
    return bassLine;
  }
  
  // Generate drums
  async generateDrums(seedSequence, steps, temperature, stats) {
    // Create a drum seed pattern based on the movement pattern
    const drumSeed = this.createDrumPatternFromSeed(seedSequence, stats);
    
    // Generate drum pattern
    let drums;
    
    if (stats.patterns.type === 'calm') {
      // Minimal drums for calm patterns
      drums = await this.drumRNN.continueSequence(
        drumSeed,
        steps / 2,
        temperature * 0.5
      );
    } else if (stats.patterns.type === 'energetic' || stats.patterns.type === 'spiky') {
      // Complex drums for energetic patterns
      drums = await this.drumRNN.continueSequence(
        drumSeed,
        steps,
        temperature * 1.3
      );
    } else {
      // Standard drums
      drums = await this.drumRNN.continueSequence(
        drumSeed,
        steps,
        temperature
      );
    }
    
    return drums;
  }
  
  // Generate strings part
  async generateStrings(seedSequence, steps, temperature, stats) {
    // Create a chord progression based on the seed
    const stringsSeed = this.createStringsFromSeed(seedSequence);
    
    // Generate strings part
    let strings;
    
    if (stats.average < 1.0) {
      // Slow, sustained strings for low intensity
      strings = await this.musicRNN.continueSequence(
        stringsSeed,
        steps / 2,
        temperature * 0.6
      );
      
      // Make notes longer for pad-like effect
      for (let i = 0; i < strings.notes.length; i++) {
        strings.notes[i].quantizedEndStep += 4;
      }
    } else {
      // More rhythmic strings for higher intensity
      strings = await this.musicRNN.continueSequence(
        stringsSeed,
        steps,
        temperature * 0.9
      );
    }
    
    // Adjust velocity for strings
    for (const note of strings.notes) {
      note.velocity = Math.min(90, Math.max(50, note.velocity - 15));
    }
    
    return strings;
  }
  
  // Generate brass part
  async generateBrass(seedSequence, steps, temperature, stats) {
    // Create a brass pattern based on the seed
    const brassSeed = this.createBrassFromSeed(seedSequence);
    
    // Generate brass part - only for high intensity
    let brass;
    
    if (stats.average > 1.5) {
      // Bold, pronounced brass for high intensity
      brass = await this.musicRNN.continueSequence(
        brassSeed,
        steps,
        temperature * 1.1
      );
      
      // Add staccato effect
      for (let i = 0; i < brass.notes.length; i++) {
        const note = brass.notes[i];
        const duration = note.quantizedEndStep - note.quantizedStartStep;
        if (duration > 2) {
          note.quantizedEndStep = note.quantizedStartStep + 2;
        }
      }
    } else {
      // Subtle brass accents for medium intensity
      brass = await this.musicRNN.continueSequence(
        brassSeed,
        steps / 2,
        temperature * 0.8
      );
    }
    
    // Adjust velocity for brass - make it stand out
    for (const note of brass.notes) {
      note.velocity = Math.min(115, Math.max(80, note.velocity + 10));
    }
    
    return brass;
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
    
    const scale = this.selectScaleBasedOnMagnitude(stats.average);
    
    for (let i = 0; i < accelData.length; i += samplingRate) {
      const magnitude = accelData[i];
      
      // Map magnitude to pitch using the selected scale
      const scaleIndex = Math.floor((magnitude - 0.5) * (scale.length / 1.5));
      const pitch = scale[Math.min(scale.length - 1, Math.max(0, scaleIndex))];
      
      // Map magnitude to note duration (higher magnitude = shorter notes)
      const durationSteps = stats.average < 1.0 ? 
                          Math.floor(4 - (magnitude - 0.5) * 1) : // Longer notes for low intensity
                          Math.max(1, Math.floor(3 - (magnitude - 0.5) * 2)); // Shorter notes for high intensity
      
      // Map magnitude to velocity (higher magnitude = louder)
      const velocity = 70 + Math.floor((magnitude - 0.5) * (57 / 1.5)); // 70-127
      
      sequence.notes.push({
        pitch: pitch,
        quantizedStartStep: step,
        quantizedEndStep: step + durationSteps,
        velocity: velocity
      });
      
      step += durationSteps;
    }
    
    sequence.totalQuantizedSteps = step;
    return sequence;
  }
  
  // Select a scale based on magnitude (more dramatic contrasts)
  selectScaleBasedOnMagnitude(magnitude) {
    if (magnitude < 1.0) {
      // Low intensity: minor scale or pentatonic minor (mellow, introspective)
      return magnitude < 0.75 ? 
        [48, 51, 53, 55, 58, 60, 63, 65, 67, 70, 72] : // A minor (A, B, C, D, E, F, G)
        [48, 51, 53, 58, 60, 63, 65, 70, 72];          // A minor pentatonic
    } else if (magnitude < 1.5) {
      // Medium intensity: major scale (balanced, pleasant)
      return [48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72]; // C major
    } else {
      // High intensity: mixolydian or lydian mode (energetic, bright)
      return magnitude < 1.75 ?
        [48, 50, 52, 53, 55, 57, 58, 60, 62, 64, 65, 67, 69, 70, 72] : // G mixolydian
        [48, 50, 52, 54, 55, 57, 59, 60, 62, 64, 66, 67, 69, 71, 72];  // F lydian
    }
  }
  
  // Create a bass line from the seed sequence
  createBassLineFromSeed(seedSequence) {
    const bassSequence = {
      quantizationInfo: seedSequence.quantizationInfo,
      notes: [],
      totalQuantizedSteps: seedSequence.totalQuantizedSteps
    };
    
    // Extract root notes for bass by taking main notes and transposing down
    const rootNotes = [];
    let lastStep = -4; // To avoid consecutive bass notes too close together
    
    for (let i = 0; i < seedSequence.notes.length; i++) {
      const note = seedSequence.notes[i];
      if (note.quantizedStartStep - lastStep >= 4) { // Space out bass notes
        // Transpose down 12 or 24 semitones (1 or 2 octaves)
        rootNotes.push({
          pitch: note.pitch - 24,
          quantizedStartStep: note.quantizedStartStep,
          quantizedEndStep: note.quantizedStartStep + 4, // Consistent duration for bass
          velocity: 80 // Consistent velocity for bass
        });
        lastStep = note.quantizedStartStep;
      }
    }
    
    bassSequence.notes = rootNotes;
    return bassSequence;
  }
  
  // Create a drum pattern from the seed sequence
  createDrumPatternFromSeed(seedSequence, stats) {
    const drumSequence = {
      quantizationInfo: seedSequence.quantizationInfo,
      notes: [],
      totalQuantizedSteps: seedSequence.totalQuantizedSteps
    };
    
    // Define drum pitches (MIDI drum mapping)
    const DRUMS = {
      KICK: 36,
      SNARE: 38,
      HI_HAT_CLOSED: 42,
      HI_HAT_OPEN: 46,
      TOM_LOW: 41,
      TOM_MID: 47,
      TOM_HIGH: 50,
      CRASH: 49,
      RIDE: 51
    };
    
    // Pattern complexity and density based on magnitude
    let pattern;
    
    if (stats.average < 1.0) {
      // Low intensity: minimal drums, mostly hi-hat and occasional kick
      pattern = [
        { pitch: DRUMS.HI_HAT_CLOSED, steps: [0, 4, 8, 12] },
        { pitch: DRUMS.KICK, steps: [0, 8] }
      ];
    } else if (stats.average < 1.5) {
      // Medium intensity: basic rock pattern
      pattern = [
        { pitch: DRUMS.HI_HAT_CLOSED, steps: [0, 2, 4, 6, 8, 10, 12, 14] },
        { pitch: DRUMS.KICK, steps: [0, 4, 8, 14] },
        { pitch: DRUMS.SNARE, steps: [4, 12] }
      ];
    } else {
      // High intensity: complex pattern with more elements
      pattern = [
        { pitch: DRUMS.HI_HAT_CLOSED, steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
        { pitch: DRUMS.KICK, steps: [0, 3, 7, 8, 10, 14] },
        { pitch: DRUMS.SNARE, steps: [4, 12, 14] },
        { pitch: DRUMS.CRASH, steps: [0] },
        { pitch: DRUMS.TOM_HIGH, steps: [9] },
        { pitch: DRUMS.TOM_MID, steps: [10] },
        { pitch: DRUMS.TOM_LOW, steps: [11] }
      ];
    }
    
    // Create notes from pattern
    pattern.forEach(drum => {
      drum.steps.forEach(step => {
        // Add some velocity variation based on step importance
        let velocity = 80;
        if (step === 0) velocity = 95; // Accented downbeat
        if (drum.pitch === DRUMS.KICK || drum.pitch === DRUMS.SNARE) velocity += 10;
        if (drum.pitch === DRUMS.CRASH) velocity += 15;
        
        drumSequence.notes.push({
          pitch: drum.pitch,
          quantizedStartStep: step,
          quantizedEndStep: step + 1,
          velocity: Math.min(127, velocity),
          isDrum: true
        });
      });
    });
    
    return drumSequence;
  }
  
  // Create strings part from seed
  createStringsFromSeed(seedSequence) {
    const stringsSequence = {
      quantizationInfo: seedSequence.quantizationInfo,
      notes: [],
      totalQuantizedSteps: seedSequence.totalQuantizedSteps
    };
    
    // Extract chord notes by analyzing the seed melody
    const allPitches = seedSequence.notes.map(note => note.pitch);
    const uniquePitches = [...new Set(allPitches)].sort((a, b) => a - b);
    
    // Create chords from the most common pitches
    const chords = [];
    if (uniquePitches.length >= 3) {
      // Take every other note to form chord tones
      for (let i = 0; i < uniquePitches.length - 2; i += 2) {
        chords.push([
          uniquePitches[i],
          uniquePitches[i+1],
          uniquePitches[i+2]
        ]);
      }
    } else {
      // If not enough unique pitches, create a basic triad
      chords.push([uniquePitches[0], uniquePitches[0] + 4, uniquePitches[0] + 7]);
    }
    
    // Place chords at regular intervals
    let chordIndex = 0;
    for (let step = 0; step < seedSequence.totalQuantizedSteps; step += 8) {
      const chord = chords[chordIndex % chords.length];
      
      // Add each note in the chord
      chord.forEach(pitch => {
        stringsSequence.notes.push({
          pitch: pitch,
          quantizedStartStep: step,
          quantizedEndStep: step + 8, // Full duration for sustained strings
          velocity: 70
        });
      });
      
      chordIndex++;
    }
    
    return stringsSequence;
  }
  
  // Create brass part from seed
  createBrassFromSeed(seedSequence) {
    const brassSequence = {
      quantizationInfo: seedSequence.quantizationInfo,
      notes: [],
      totalQuantizedSteps: seedSequence.totalQuantizedSteps
    };
    
    // Analyze seed for important melodic moments
    const highestNotes = [...seedSequence.notes]
      .sort((a, b) => b.pitch - a.pitch)
      .slice(0, 3);
    
    // Place brass stabs at climactic moments
    highestNotes.forEach(note => {
      // Create a brass chord based on the high note
      const chord = [
        note.pitch,
        note.pitch - 4,
        note.pitch - 7
      ];
      
      // Add each note in the chord as a stab
      chord.forEach(pitch => {
        brassSequence.notes.push({
          pitch: pitch,
          quantizedStartStep: note.quantizedStartStep,
          quantizedEndStep: note.quantizedStartStep + 2, // Short stab
          velocity: 100
        });
      });
    });
    
    return brassSequence;
  }
  
  // Combine all instrument parts into a cohesive sequence
  combineMultiTrackSequence(parts, stats) {
    // Start with the melody as the base sequence
    const combinedSequence = {
      quantizationInfo: parts.melody.quantizationInfo,
      notes: [...parts.melody.notes],
      totalQuantizedSteps: parts.melody.totalQuantizedSteps,
      tempos: [{
        qpm: stats.tempo,
        time: 0
      }]
    };
    
    // Add instrument metadata for each note
    combinedSequence.notes.forEach(note => {
      note.instrument = 0; // Piano for melody
      note.program = 0;    // Piano program
    });
    
    // Add all other instrument parts
    let instrumentIndex = 1;
    
    // Add bass
    if (parts.bass) {
      parts.bass.notes.forEach(note => {
        note.instrument = instrumentIndex;
        note.program = 32; // Acoustic bass
        combinedSequence.notes.push(note);
      });
      instrumentIndex++;
    }
    
    // Add drums
    if (parts.drums) {
      parts.drums.notes.forEach(note => {
        note.instrument = instrumentIndex;
        // Drums don't need program number, but do need isDrum flag
        note.isDrum = true;
        combinedSequence.notes.push(note);
      });
      instrumentIndex++;
    }
    
    // Add strings
    if (parts.strings) {
      parts.strings.notes.forEach(note => {
        note.instrument = instrumentIndex;
        note.program = 48; // String ensemble
        combinedSequence.notes.push(note);
      });
      instrumentIndex++;
    }
    
    // Add brass
    if (parts.brass) {
      parts.brass.notes.forEach(note => {
        note.instrument = instrumentIndex;
        note.program = 61; // Brass section
        combinedSequence.notes.push(note);
      });
      instrumentIndex++;
    }
    
    return combinedSequence;
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
      case 'orchestral':
        this.applyOrchestralStyle(sequence, stats);
        break;
      case 'pop':
        this.applyPopStyle(sequence, stats);
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
    
    // Add more chord tones (3rds, 7ths) for melody and piano parts
    const melodyNotes = sequence.notes.filter(n => n.instrument === 0);
    for (let i = 0; i < melodyNotes.length; i += 3) {
      if (i + 1 < melodyNotes.length) {
        const baseNote = melodyNotes[i];
        // Add a third (4 semitones up)
        sequence.notes.push({
          pitch: baseNote.pitch + 4,
          quantizedStartStep: baseNote.quantizedStartStep,
          quantizedEndStep: baseNote.quantizedEndStep,
          velocity: Math.max(40, baseNote.velocity - 20),
          instrument: baseNote.instrument,
          program: baseNote.program
        });
      }
    }
    
    // Adjust tempo based on magnitude (slower for low, moderate swing for high)
    if (stats.average < 1.0) {
      sequence.tempos[0].qpm = Math.max(40, sequence.tempos[0].qpm - 20);
    }
  }
  
  // Apply electronic music style adjustments
  applyElectronicStyle(sequence, stats) {
    // Add repeated notes for rhythmic emphasis
    for (let i = 0; i < sequence.notes.length; i++) {
      const note = sequence.notes[i];
      // Skip drums for this effect
      if (note.isDrum) continue;
      
      const noteDuration = note.quantizedEndStep - note.quantizedStartStep;
      
      if (noteDuration >= 3) {
        // Split longer notes into repeated shorter notes
        sequence.notes[i].quantizedEndStep = note.quantizedStartStep + 1;
        
        for (let j = 1; j < noteDuration; j++) {
          sequence.notes.push({
            pitch: note.pitch,
            quantizedStartStep: note.quantizedStartStep + j,
            quantizedEndStep: note.quantizedStartStep + j + 1,
            velocity: Math.max(40, note.velocity - 10 * j),
            instrument: note.instrument,
            program: note.program
          });
        }
      }
    }
    
    // For high intensity, dramatically increase the tempo
    if (stats.average > 1.5) {
      sequence.tempos[0].qpm = Math.min(180, sequence.tempos[0].qpm + 30);
    }
  }
  
  // Apply ambient music style adjustments
  applyAmbientStyle(sequence, stats) {
    // Make notes longer and more overlapping
    for (let i = 0; i < sequence.notes.length; i++) {
      const note = sequence.notes[i];
      if (!note.isDrum) { // Don't extend drum notes
        note.quantizedEndStep = note.quantizedEndStep + 4;
        
        // Add occasional lower fifth for depth
        if (i % 3 === 0) {
          sequence.notes.push({
            pitch: note.pitch - 7, // Perfect fifth down
            quantizedStartStep: note.quantizedStartStep + 2,
            quantizedEndStep: note.quantizedEndStep + 6,
            velocity: Math.max(40, note.velocity - 30),
            instrument: note.instrument,
            program: note.program
          });
        }
      }
    }
    
    // Reduce velocity variations for smoother sound
    for (let i = 0; i < sequence.notes.length; i++) {
      if (!sequence.notes[i].isDrum) { // Keep drums dynamic
        sequence.notes[i].velocity = Math.min(
          100, 
          60 + (sequence.notes[i].velocity - 60) * 0.5
        );
      }
    }
    
    // Slow down the tempo considerably for ambient style
    sequence.tempos[0].qpm = Math.max(40, sequence.tempos[0].qpm - 40);
  }
  
  // Apply orchestral style adjustments
  applyOrchestralStyle(sequence, stats) {
    // Add dynamic swells (crescendos and diminuendos)
    let dynamicCurve = [];
    
    // Create dynamic curve based on pattern
    if (stats.patterns.type === 'calm') {
      // Gentle rise and fall
      dynamicCurve = [0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.65, 0.7, 0.65];
    } else if (stats.patterns.type === 'spiky') {
      // Dramatic swells
      dynamicCurve = [0.7, 0.6, 0.9, 0.7, 0.6, 0.8, 1.0, 0.9, 0.7, 0.6, 0.7, 0.9, 1.0, 0.8, 0.7, 0.6];
    } else {
      // Building intensity
      dynamicCurve = [0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 0.95, 0.9, 0.95, 1.0, 0.95, 0.9, 0.85];
    }
    
    // Apply dynamic curve to note velocities
    for (let i = 0; i < sequence.notes.length; i++) {
      const note = sequence.notes[i];
      
      // Determine where in the curve this note falls
      const curvePosition = Math.floor((note.quantizedStartStep / sequence.totalQuantizedSteps) * dynamicCurve.length);
      const dynamicMultiplier = dynamicCurve[Math.min(dynamicCurve.length - 1, Math.max(0, curvePosition))];
      
      // Apply to velocity, with different scaling based on instrument
      if (note.isDrum) {
        // Less dynamic variation for drums
        note.velocity = Math.min(127, Math.max(30, note.velocity * (0.8 + dynamicMultiplier * 0.2)));
      } else if (note.program === 48) { // Strings
        // More dynamic variation for strings
        note.velocity = Math.min(127, Math.max(20, note.velocity * dynamicMultiplier));
      } else {
        // Standard dynamic variation for other instruments
        note.velocity = Math.min(127, Math.max(30, note.velocity * dynamicMultiplier));
      }
    }
    
    // Adjust tempo slightly for more rubato feel
    sequence.tempos[0].qpm = Math.max(60, sequence.tempos[0].qpm - 10);
  }
  
  // Apply pop style adjustments
  applyPopStyle(sequence, stats) {
    // Emphasize strong beats (1 and 3 in 4/4)
    for (let i = 0; i < sequence.notes.length; i++) {
      const note = sequence.notes[i];
      
      // Boost velocity on strong beats
      if (note.quantizedStartStep % 4 === 0) { // Beat 1
        note.velocity = Math.min(127, note.velocity + 15);
      } else if (note.quantizedStartStep % 4 === 2) { // Beat 3
        note.velocity = Math.min(127, note.velocity + 10);
      }
    }
    
    // Add repeating patterns for pop catchiness
    const melodyNotes = sequence.notes.filter(n => n.instrument === 0);
    if (melodyNotes.length >= 8) {
      const patternToRepeat = melodyNotes.slice(0, 4);
      
      // Repeat this pattern later in the sequence with slight variation
      patternToRepeat.forEach(originalNote => {
        const repetitionStart = sequence.totalQuantizedSteps - 16; // Repeat near the end
        
        if (repetitionStart > originalNote.quantizedStartStep) {
          // Create slightly varied repeat
          sequence.notes.push({
            pitch: originalNote.pitch + (Math.random() > 0.7 ? 2 : 0), // Occasional variation
            quantizedStartStep: repetitionStart + (originalNote.quantizedStartStep % 16),
            quantizedEndStep: repetitionStart + (originalNote.quantizedEndStep % 16),
            velocity: originalNote.velocity,
            instrument: originalNote.instrument,
            program: originalNote.program
          });
        }
      });
    }
    
    // Set tempo to a steady pop tempo based on magnitude
    if (stats.average < 1.0) {
      sequence.tempos[0].qpm = 90; // Slow pop
    } else if (stats.average < 1.5) {
      sequence.tempos[0].qpm = 110; // Medium pop
    } else {
      sequence.tempos[0].qpm = 128; // Fast pop/dance
    }
  }
}

module.exports = { AccelerometerMusicGenerator };