// public/app.js - Frontend JavaScript with Magenta in browser

// UI Elements
const statusElement = document.getElementById('status');
const dataStatsElement = document.getElementById('dataStats');
const visualizationElement = document.getElementById('dataVisualization');
const playMusicButton = document.getElementById('playMusic');
const fetchDataButton = document.getElementById('fetchData');
const stopMusicButton = document.getElementById('stopMusic');
const testDataButton = document.getElementById('testData');
const musicPlayerElement = document.getElementById('musicPlayer');
const musicStyleSelect = document.getElementById('musicStyle');
const patternDisplayElement = document.getElementById('patternDisplay');

// Global variables
let accelData = [];
let processedData = {};
let currentPlayer = null;
let visualBars = [];
let autoRefreshInterval = null;
let magentaModels = {
  musicRNN: null,
  musicVAE: null,
  drumRNN: null,
  multiVAE: null,
  initialized: false
};
const BASE_URL = window.location.origin;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  statusElement.textContent = 'Initializing...';
  
  // Create visualization
  createVisualization();
  
  // Initialize Magenta models
  initializeMagentaModels().then(() => {
    statusElement.textContent = 'Ready to fetch data';
    fetchLatestData(); // Initial data fetch
    
    // Start auto-refresh
    startAutoRefresh();
  }).catch(error => {
    console.error('Error initializing Magenta models:', error);
    statusElement.textContent = 'Error initializing music models';
  });
  
  // Set up button event listeners
  playMusicButton.addEventListener('click', generateAndPlayMusic);
  fetchDataButton.addEventListener('click', fetchLatestData);
  stopMusicButton.addEventListener('click', stopMusic);
  if (testDataButton) {
    testDataButton.addEventListener('click', fetchTestData);
  }
  
  // Set up test data slider if it exists
  const testDataSlider = document.getElementById('testDataSlider');
  if (testDataSlider) {
    testDataSlider.addEventListener('input', updateSliderValue);
  }
});

// Start auto-refresh of data
function startAutoRefresh() {
  // Clear any existing interval
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }
  
  // Set up new interval to fetch data every 2 seconds
  autoRefreshInterval = setInterval(fetchLatestData, 2000);
}

// Stop auto-refresh
function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

// Initialize Magenta models
async function initializeMagentaModels() {
  try {
    // Initialize MusicRNN (for melody continuation)
    magentaModels.musicRNN = new mm.MusicRNN(
      'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn'
    );
    
    // Initialize MusicVAE (for melody generation)
    magentaModels.musicVAE = new mm.MusicVAE(
      'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_small_q2'
    );
    
    // Initialize Drum RNN (for rhythm generation)
    magentaModels.drumRNN = new mm.MusicRNN(
      'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/drum_kit_rnn'
    );
    
    // Initialize Multitrack VAE (for multi-instrument music)
    magentaModels.multiVAE = new mm.MusicVAE(
      'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/multitrack_chords'
    );
    
    // Load all models in parallel
    await Promise.all([
      magentaModels.musicRNN.initialize(),
      magentaModels.musicVAE.initialize(),
      magentaModels.drumRNN.initialize().catch(e => console.warn('Drum RNN failed to load:', e)),
      magentaModels.multiVAE.initialize().catch(e => console.warn('MultiVAE failed to load:', e))
    ]);
    
    magentaModels.initialized = true;
    console.log('Magenta models initialized successfully');
  } catch (error) {
    console.error('Error initializing Magenta models:', error);
    magentaModels.initialized = false;
    throw error;
  }
}

// Create visualization elements
function createVisualization() {
  visualizationElement.innerHTML = '';
  visualBars = [];
  
  // Create 20 bars for visualization
  const barWidth = visualizationElement.clientWidth / 20;
  
  for (let i = 0; i < 20; i++) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.left = `${i * barWidth}px`;
    bar.style.width = `${barWidth - 2}px`; // 2px gap
    bar.style.height = '0px';
    // Set animation delay for each bar
    bar.style.setProperty('--i', i);
    visualizationElement.appendChild(bar);
    visualBars.push(bar);
  }
}

// Stop the currently playing music
function stopMusic() {
  if (currentPlayer) {
    if (currentPlayer.player) {
      currentPlayer.player.stop();
    }
    
    if (currentPlayer.synth) {
      currentPlayer.synth.dispose();
    }
    
    currentPlayer = null;
    
    // Clear any visual highlights
    visualBars.forEach(bar => {
      bar.classList.remove('playing');
    });
    
    // Update player display
    musicPlayerElement.innerHTML = '<div>No music playing</div>';
    
    // Enable play button, disable stop button
    playMusicButton.disabled = false;
    stopMusicButton.disabled = true;
    
    statusElement.textContent = 'Music stopped';
  }
}

// Create synth based on acceleration magnitude
function createSynth(avgMagnitude) {
  // Map magnitude ranges to different synthesizer settings
  let oscillatorType, attack, release, effects = [];
  
  // Low movement (0.5-1.0): Soft, ambient sounds
  if (avgMagnitude < 1.0) {
    oscillatorType = 'sine';
    attack = 0.3 + (0.5 - Math.min(avgMagnitude, 0.9)) * 0.4; // 0.3-0.5 (slower attack for lower magnitude)
    release = 2.0 + (0.5 - Math.min(avgMagnitude, 0.9)) * 1.0; // 2.0-3.0 (longer release for lower magnitude)
    
    // Add reverb for spacious sound
    const reverb = new Tone.Reverb({
      decay: 5.0 + (0.5 - Math.min(avgMagnitude, 0.9)) * 3.0, // 5.0-8.0
      wet: 0.6 + (0.5 - Math.min(avgMagnitude, 0.9)) * 0.3    // 0.6-0.9
    }).toDestination();
    
    effects.push(reverb);
    
    // Add subtle chorus for richness in low mode
    const chorus = new Tone.Chorus({
      frequency: 1.5,
      delayTime: 3.5,
      depth: 0.7,
      wet: 0.3
    }).toDestination();
    
    effects.push(chorus);
  } 
  // Medium movement (1.0-1.5): More defined, melodic sounds
  else if (avgMagnitude < 1.5) {
    oscillatorType = 'triangle';
    attack = 0.1 + (1.0 - Math.min(avgMagnitude, 1.4)) * 0.2; // 0.1-0.3
    release = 1.0 + (1.0 - Math.min(avgMagnitude, 1.4)) * 1.0; // 1.0-2.0
    
    // Add chorus for richness
    const chorus = new Tone.Chorus({
      frequency: 1.5 + (avgMagnitude - 1.0) * 3.0, // 1.5-3.0
      delayTime: 2.5 + (avgMagnitude - 1.0) * 2.0, // 2.5-3.5
      depth: 0.3 + (avgMagnitude - 1.0) * 0.4,     // 0.3-0.5
      wet: 0.4
    }).toDestination();
    
    effects.push(chorus);
    
    // Add moderate reverb
    const reverb = new Tone.Reverb({
      decay: 3.0,
      wet: 0.4
    }).toDestination();
    
    effects.push(reverb);
  } 
  // High movement (1.5-2.0): Sharp, energetic sounds
  else {
    oscillatorType = 'sawtooth';  // Even more harmonically rich than square
    attack = 0.05 - (Math.min(avgMagnitude, 1.9) - 1.5) * 0.04; // 0.05-0.01 (faster attack for higher magnitude)
    release = 0.7 - (Math.min(avgMagnitude, 1.9) - 1.5) * 0.4;  // 0.7-0.3 (shorter release for higher magnitude)
    
    // Add distortion for edge
    const distortion = new Tone.Distortion({
      distortion: 0.2 + (avgMagnitude - 1.5) * 0.6, // 0.2-0.8
      wet: 0.3 + (avgMagnitude - 1.5) * 0.4        // 0.3-0.7
    }).toDestination();
    
    effects.push(distortion);
    
    // Add ping-pong delay for rhythmic interest
    const pingPong = new Tone.PingPongDelay({
      delayTime: 0.25,
      feedback: 0.2 + (avgMagnitude - 1.5) * 0.3, // 0.2-0.5
      wet: 0.2
    }).toDestination();
    
    effects.push(pingPong);
  }
  
  // Create and configure the synth
  const synth = new Tone.PolySynth(Tone.Synth).toDestination();
  synth.set({
    oscillator: {
      type: oscillatorType
    },
    envelope: {
      attack: attack,
      decay: 0.2,
      sustain: 0.8,
      release: release
    }
  });
  
  // Connect synth to effects
  effects.forEach(effect => {
    synth.connect(effect);
  });
  
  return synth;
}

// Add function to highlight a bar when a note plays
function highlightBar(pitch, velocity) {
  // Map the pitch to a visualization bar index
  // Assuming pitches range from C3 (48) to C5 (72)
  const normalizedPitch = Math.max(48, Math.min(72, pitch));
  const index = Math.floor((normalizedPitch - 48) / 24 * visualBars.length);
  
  if (index >= 0 && index < visualBars.length) {
    // Add a special class to highlight the bar
    visualBars[index].classList.add('playing');
    
    // Scale the brightness based on velocity
    const brightness = 50 + (velocity / 127) * 50;
    visualBars[index].style.filter = `brightness(${brightness}%)`;
    
    setTimeout(() => {
      visualBars[index].classList.remove('playing');
      visualBars[index].style.filter = '';
    }, 200); // Remove after 200ms
  }
}

// Update the visualization with new data
function updateVisualization() {
  if (!accelData || accelData.length === 0) return;
  
  const maxBars = visualBars.length;
  const dataToShow = accelData.slice(-maxBars); // Get the most recent data points
  
  for (let i = 0; i < maxBars; i++) {
    if (i < dataToShow.length) {
      // Map the value from 0.5-2.0 to 0-100% of the height
      const heightPercent = ((dataToShow[i] - 0.5) / 1.5) * 100;
      visualBars[i].style.height = `${heightPercent}%`;
      
      // Add color variation based on magnitude
      if (dataToShow[i] < 1.0) {
        // Cool colors for low magnitude
        visualBars[i].style.background = `linear-gradient(to top, #3498db, #2980b9)`;
      } else if (dataToShow[i] < 1.5) {
        // Warmer colors for medium magnitude
        visualBars[i].style.background = `linear-gradient(to top, #2ecc71, #27ae60)`;
      } else {
        // Hot colors for high magnitude
        visualBars[i].style.background = `linear-gradient(to top, #e74c3c, #c0392b)`;
      }
    } else {
      visualBars[i].style.height = '0px';
    }
  }
}

// Update test data slider value
function updateSliderValue() {
  const slider = document.getElementById('testDataSlider');
  const currentValue = document.getElementById('currentValue');
  if (slider && currentValue) {
    currentValue.textContent = slider.value;
  }
}

// Fetch the latest accelerometer data
async function fetchLatestData() {
  statusElement.textContent = 'Fetching latest data...';
  
  try {
    console.log('Fetching data from:', `${BASE_URL}/api/data`);
    const response = await fetch(`${BASE_URL}/api/data`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Received data:', result);
    
    if (result && result.rawData) {
      accelData = result.rawData;
      processedData = result.processedData;
      updateDataStats();
      updateVisualization();
      updatePatternDisplay();
      statusElement.textContent = 'Data updated successfully';
    } else {
      console.warn('No data in response:', result);
      statusElement.textContent = 'No data available yet';
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    statusElement.textContent = `Error fetching data: ${error.message}`;
  }
}

// Fetch test data for demonstration
async function fetchTestData() {
  statusElement.textContent = 'Generating test data...';
  
  try {
    // Get the slider value if available
    const slider = document.getElementById('testDataSlider');
    let targetMagnitude = 1.0;
    
    if (slider) {
      targetMagnitude = parseFloat(slider.value);
    }
    
    // Add custom endpoint for targeted test data
    const response = await fetch(`${BASE_URL}/api/testData?magnitude=${targetMagnitude}`);
    const result = await response.json();
    
    if (result && result.status === 'success') {
      accelData = result.data;
      await fetchLatestData(); // Reload to get processed data
      statusElement.textContent = 'Test data generated';
    } else {
      statusElement.textContent = 'Error generating test data';
    }
  } catch (error) {
    console.error('Error generating test data:', error);
    statusElement.textContent = 'Error generating test data';
  }
}

// Update the stats display
function updateDataStats() {
  if (!accelData || accelData.length === 0) {
    dataStatsElement.innerHTML = '<div>No accelerometer data available yet.</div>';
    return;
  }
  
  const avgMagnitude = accelData.reduce((sum, val) => sum + val, 0) / accelData.length;
  const maxMagnitude = Math.max(...accelData);
  const minMagnitude = Math.min(...accelData);
  
  let patternType = 'Unknown';
  let instrumentCount = 1;
  let instruments = ['piano'];
  
  if (processedData && processedData.stats) {
    if (processedData.stats.patterns && processedData.stats.patterns.type) {
      patternType = processedData.stats.patterns.type;
      patternType = patternType.charAt(0).toUpperCase() + patternType.slice(1);
    }
    
    if (processedData.stats.instrumentComplexity) {
      instrumentCount = processedData.stats.instrumentComplexity.count || 1;
      instruments = processedData.stats.instrumentComplexity.instruments || ['piano'];
    }
  }
  
  // Format tempo as integer
  const tempo = processedData?.stats?.tempo ? Math.round(processedData.stats.tempo) : 'N/A';
  
  // Describe the music style based on magnitude
  let musicDescription = '';
  if (avgMagnitude < 1.0) {
    musicDescription = 'Soft, ambient, slow tempo';
  } else if (avgMagnitude < 1.5) {
    musicDescription = 'Balanced, melodic, moderate tempo';
  } else {
    musicDescription = 'Energetic, bright, fast tempo';
  }
  
  dataStatsElement.innerHTML = `
    <div><strong>Data points:</strong> ${accelData.length}</div>
    <div><strong>Average magnitude:</strong> ${avgMagnitude.toFixed(2)}</div>
    <div><strong>Max magnitude:</strong> ${maxMagnitude.toFixed(2)}</div>
    <div><strong>Min magnitude:</strong> ${minMagnitude.toFixed(2)}</div>
    <div><strong>Pattern type:</strong> <span class="pattern-type pattern-${patternType.toLowerCase()}">${patternType}</span></div>
    <div><strong>Music tempo:</strong> ${tempo} BPM</div>
    <div><strong>Instruments:</strong> ${instruments.join(', ')}</div>
    <div><strong>Music style:</strong> ${musicDescription}</div>
    <div><strong>Last updated:</strong> ${new Date().toLocaleTimeString()}</div>
  `;
  
  // Update instrument indicators
  updateInstrumentIndicators(instruments);
}

// Update pattern display based on data
function updatePatternDisplay() {
  if (!processedData || !processedData.stats || !processedData.stats.patterns) {
    return;
  }
  
  const patternData = processedData.stats.patterns;
  if (!patternDisplayElement) return;
  
  // Skip if no pattern type available
  if (!patternData.type) {
    patternDisplayElement.innerHTML = '<p>No pattern detected yet. Generate data to see pattern analysis.</p>';
    return;
  }
  
  // Capitalize first letter of pattern type
  const patternType = patternData.type.charAt(0).toUpperCase() + patternData.type.slice(1);
  
  // Get appropriate description based on pattern type
  let description = '';
  let musicalEffect = '';
  
  switch(patternData.type) {
    case 'calm':
      description = 'Smooth, gentle movements with low acceleration';
      musicalEffect = 'Soft, flowing melodies with slow tempo and gentle sounds';
      break;
    case 'regular':
      description = 'Consistent, rhythmic movements with predictable patterns';
      musicalEffect = 'Structured, rhythmic composition with balanced textures';
      break;
    case 'spiky':
      description = 'Sharp, sudden movements with distinct peaks';
      musicalEffect = 'Dynamic music with contrasting elements and accents';
      break;
    case 'energetic':
      description = 'Vigorous movements with high intensity and variability';
      musicalEffect = 'Fast-paced, intense composition with full instrumentation';
      break;
    case 'sustained-high':
      description = 'Continuous high-intensity movement';
      musicalEffect = 'High-energy, driving music with dense texture';
      break;
    default:
      description = 'Mixed movement patterns with varying intensity';
      musicalEffect = 'Varied musical elements with changing moods';
  }
  
  // Create HTML for pattern display
  patternDisplayElement.innerHTML = `
    <div class="pattern-type pattern-${patternData.type}">${patternType} Pattern</div>
    <p>${description}</p>
    <p><strong>Musical Effect:</strong> ${musicalEffect}</p>
    <p>This pattern typically generates music with:</p>
    <ul>
      <li>Tempo: ${patternData.type === 'calm' ? 'Slow' : patternData.type === 'energetic' ? 'Fast' : 'Moderate'}</li>
      <li>Rhythm: ${patternData.type === 'regular' ? 'Steady' : patternData.type === 'spiky' ? 'Unpredictable' : 'Flowing'}</li>
      <li>Intensity: ${patternData.type === 'calm' ? 'Soft' : patternData.type === 'energetic' || patternData.type === 'sustained-high' ? 'Strong' : 'Moderate'}</li>
      <li>Scale: ${processedData.stats.average < 1.0 ? 'Minor (melancholic)' : processedData.stats.average < 1.5 ? 'Major (uplifting)' : 'Bright modes (energetic)'}</li>
    </ul>
  `;
}

// Update instrument indicators based on data
function updateInstrumentIndicators(instruments) {
  document.querySelectorAll('.instrument').forEach(elem => {
    elem.classList.remove('active');
  });
  
  if (instruments && Array.isArray(instruments)) {
    instruments.forEach(instrument => {
      const elem = document.getElementById(`instrument-${instrument}`);
      if (elem) {
        elem.classList.add('active');
      }
    });
  }
}

// Generate and play music from the latest data
async function generateAndPlayMusic() {
  if (!accelData || accelData.length === 0) {
    statusElement.textContent = 'No data available to generate music';
    return;
  }
  
  if (!magentaModels.initialized) {
    statusElement.textContent = 'Music models not initialized yet. Please wait...';
    try {
      await initializeMagentaModels();
    } catch (error) {
      statusElement.textContent = 'Failed to initialize music models';
      return;
    }
  }
  
  playMusicButton.disabled = true;
  stopMusicButton.disabled = false;
  statusElement.textContent = 'Generating music with Magenta...';
  
  try {
    // Get selected music style
    const musicStyle = musicStyleSelect ? musicStyleSelect.value : 'default';
    
    // Get the music data from the server
    const response = await fetch(`${BASE_URL}/api/musicData`);
    const result = await response.json();
    
    if (result.status === 'success') {
      // Generate music using Magenta models in the browser
      const musicData = await generateMusicWithMagenta(
        result.accelerometerData, 
        result.processedData,
        musicStyle
      );
      
      // Play the generated music
      await playMagentaMusic(musicData.sequence, result.processedData.stats.average);
      
      // Update the status and UI
      statusElement.textContent = 'Playing Magenta-generated music';
      visualizationElement.classList.add('playing');
      
      // Show active instruments
      updateInstrumentIndicators(result.processedData.stats.instrumentComplexity.instruments);
    } else {
      statusElement.textContent = 'Failed to get music data';
      playMusicButton.disabled = false;
    }
  } catch (error) {
    console.error('Error generating music:', error);
    statusElement.textContent = `Error generating music: ${error.message}`;
    playMusicButton.disabled = false;
  }
}

// Generate music with Magenta in the browser
async function generateMusicWithMagenta(accelData, processedData, style = 'default') {
  // Make sure we have data
  if (!accelData || accelData.length < 10) {
    throw new Error('Not enough data to generate music');
  }
  
  const stats = processedData.stats;
  
  // Create seed sequence based on accelerometer data
  const seedSequence = createSeedSequence(accelData, stats);
  
  // Generate separate parts for different instruments based on magnitude
  const parts = {};
  
  // Set parameters based on movement patterns
  const temperature = 0.8 + (stats.average - 0.5) * (0.8 / 1.5); // 0.8-1.6
  const steps = Math.floor(16 + (stats.average - 0.5) * (32 / 1.5)); // 16-48 steps
  
  // Generate lead melody
  parts.melody = await generateMelody(seedSequence, steps, temperature, stats);
  
  // For multiple instruments based on complexity
  const instruments = stats.instrumentComplexity.instruments;
  
  // Add bass if complexity allows
  if (instruments.includes('bass')) {
    parts.bass = await generateBass(seedSequence, steps, temperature, stats);
  }
  
  // Add drums if complexity allows
  if (instruments.includes('drums')) {
    parts.drums = await generateDrums(seedSequence, steps, temperature, stats);
  }
  
  // Add additional instruments for high complexity
  if (instruments.includes('strings')) {
    parts.strings = await generateStrings(seedSequence, steps, temperature, stats);
  }
  
  if (instruments.includes('brass')) {
    parts.brass = await generateBrass(seedSequence, steps, temperature, stats);
  }
  
  // Combine all parts into a cohesive multi-track sequence
  const multiTrackSequence = combineMultiTrackSequence(parts, stats);
  
  // Apply style-specific adjustments
  applyMusicStyle(multiTrackSequence, style, stats);
  
  return {
    sequence: multiTrackSequence,
    parts: parts
  };
}

// Generate lead melody
async function generateMelody(seedSequence, steps, temperature, stats) {
  // Choose generation method based on detected patterns
  let melody;
  
  if (stats.patterns.type === 'calm') {
    // For calm patterns, use MusicVAE with low temperature for smooth melodies
    const z = await magentaModels.musicVAE.encode([seedSequence]);
    melody = await magentaModels.musicVAE.decode(z, temperature * 0.7);
    melody = melody[0];
  } else if (stats.patterns.type === 'regular') {
    // For regular patterns, use MusicRNN for continuation with lower temperature
    melody = await magentaModels.musicRNN.continueSequence(
      seedSequence, 
      steps, 
      temperature * 0.8
    );
  } else if (stats.patterns.type === 'energetic' || stats.patterns.type === 'spiky') {
    // For energetic patterns, use MusicVAE with higher temperature for more variation
    const z = await magentaModels.musicVAE.encode([seedSequence]);
    melody = await magentaModels.musicVAE.decode(z, temperature * 1.2);
    melody = melody[0];
  } else {
    // Default approach: standard continuation
    melody = await magentaModels.musicRNN.continueSequence(
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
async function generateBass(seedSequence, steps, temperature, stats) {
  // Simplify and transpose the seed for bass
  const bassSeed = createBassLineFromSeed(seedSequence);
  
  // Generate bass line
  let bassLine;
  
  if (stats.patterns.type === 'calm') {
    // Simple, smooth bass line for calm patterns
    bassLine = await magentaModels.musicRNN.continueSequence(
      bassSeed,
      steps,
      temperature * 0.6
    );
  } else if (stats.patterns.type === 'energetic') {
    // More active bass line for energetic patterns
    bassLine = await magentaModels.musicRNN.continueSequence(
      bassSeed,
      steps,
      temperature * 1.1
    );
  } else {
    // Standard bass line
    bassLine = await magentaModels.musicRNN.continueSequence(
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
async function generateDrums(seedSequence, steps, temperature, stats) {
  // Create a drum seed pattern based on the movement pattern
  const drumSeed = createDrumPatternFromSeed(seedSequence, stats);
  
  // Generate drum pattern
  let drums;
  
  if (stats.patterns.type === 'calm') {
    // Minimal drums for calm patterns
    drums = await magentaModels.drumRNN.continueSequence(
      drumSeed,
      steps / 2,
      temperature * 0.5
    );
  } else if (stats.patterns.type === 'energetic' || stats.patterns.type === 'spiky') {
    // Complex drums for energetic patterns
    drums = await magentaModels.drumRNN.continueSequence(
      drumSeed,
      steps,
      temperature * 1.3
    );
  } else {
    // Standard drums
    drums = await magentaModels.drumRNN.continueSequence(
      drumSeed,
      steps,
      temperature
    );
  }
  
  return drums;
}

// Generate strings part
async function generateStrings(seedSequence, steps, temperature, stats) {
  // Create a chord progression based on the seed
  const stringsSeed = createStringsFromSeed(seedSequence);
  
  // Generate strings part
  let strings;
  
  if (stats.average < 1.0) {
    // Slow, sustained strings for low intensity
    strings = await magentaModels.musicRNN.continueSequence(
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
    strings = await magentaModels.musicRNN.continueSequence(
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
async function generateBrass(seedSequence, steps, temperature, stats) {
  // Create a brass pattern based on the seed
  const brassSeed = createBrassFromSeed(seedSequence);
  
  // Generate brass part - only for high intensity
  let brass;
  
  if (stats.average > 1.5) {
    // Bold, pronounced brass for high intensity
    brass = await magentaModels.musicRNN.continueSequence(
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
    brass = await magentaModels.musicRNN.continueSequence(
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
function createSeedSequence(accelData, stats) {
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
  
  const scale = selectScaleBasedOnMagnitude(stats.average);
  
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
function selectScaleBasedOnMagnitude(magnitude) {
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
function createBassLineFromSeed(seedSequence) {
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
function createDrumPatternFromSeed(seedSequence, stats) {
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
function createStringsFromSeed(seedSequence) {
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
function createBrassFromSeed(seedSequence) {
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
function combineMultiTrackSequence(parts, stats) {
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
function applyMusicStyle(sequence, style, stats) {
  switch (style) {
    case 'jazz':
      applyJazzStyle(sequence, stats);
      break;
    case 'electronic':
      applyElectronicStyle(sequence, stats);
      break;
    case 'ambient':
      applyAmbientStyle(sequence, stats);
      break;
    case 'orchestral':
      applyOrchestralStyle(sequence, stats);
      break;
    case 'pop':
      applyPopStyle(sequence, stats);
      break;
    default:
      // No specific adjustments for default style
      break;
  }
  
  return sequence;
}

// Apply jazz-style adjustments
function applyJazzStyle(sequence, stats) {
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
function applyElectronicStyle(sequence, stats) {
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
function applyAmbientStyle(sequence, stats) {
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
function applyOrchestralStyle(sequence, stats) {
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
function applyPopStyle(sequence, stats) {
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

// Play music generated by Magenta
async function playMagentaMusic(sequence, avgMagnitude) {
  // Make sure Tone.js is started (required by browsers)
  await Tone.start();
  
  // Stop any currently playing music
  stopMusic();
  
  // Calculate the tempo based on average magnitude (40-180 BPM)
  const tempo = sequence.tempos[0].qpm || (40 + ((avgMagnitude - 0.5) / 1.5) * 140);
  Tone.Transport.bpm.value = tempo;
  
  // Create a synth based on the average magnitude of the data
  const synth = createSynth(avgMagnitude);
  
  // Create player using Magenta's SoundFontPlayer
  const player = new mm.SoundFontPlayer(
    'https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus', 
    undefined, 
    undefined, 
    undefined, 
    {
      run: (note) => {
        // Highlight the corresponding visualization bar when a note plays
        highlightBar(note.pitch, note.velocity);
      },
      stop: () => {
        visualizationElement.classList.remove('playing');
        statusElement.textContent = 'Music finished playing';
        playMusicButton.disabled = false;
        stopMusicButton.disabled = true;
      }
    }
  );
  
  // Start playing
  await player.start(sequence);
  
  // Store the current player for stopping later
  currentPlayer = {
    player,
    synth
  };
  
  // Update the player display
  updateMusicPlayerDisplay(sequence, tempo);
  
  // Enable stop button
  stopMusicButton.disabled = false;
}

// Update the music player display
function updateMusicPlayerDisplay(sequence, tempo) {
  // Count instruments
  const instrumentCount = new Set(sequence.notes.map(note => note.instrument)).size;
  
  // Count total notes
  const totalNotes = sequence.notes.length;
  
  // Determine musical style description based on instrument programs
  const hasStrings = sequence.notes.some(note => note.program === 48);
  const hasBrass = sequence.notes.some(note => note.program === 61);
  const hasDrums = sequence.notes.some(note => note.isDrum);
  
  let styleDescription = '';
  if (tempo < 70) {
    styleDescription = 'Slow, contemplative';
  } else if (tempo < 100) {
    styleDescription = 'Moderate, flowing';
  } else if (tempo < 140) {
    styleDescription = 'Upbeat, energetic';
  } else {
    styleDescription = 'Fast, intense';
  }
  
  if (hasStrings && tempo < 80) {
    styleDescription += ', orchestral';
  } else if (hasBrass && tempo > 120) {
    styleDescription += ', brassy';
  } else if (hasDrums && tempo > 110) {
    styleDescription += ', rhythmic';
  }
  
  // Update the player display
  musicPlayerElement.innerHTML = `
    <div>
      <strong>Now playing</strong><br>
      Tempo: ${Math.round(tempo)} BPM<br>
      Instruments: ${instrumentCount}<br>
      Notes: ${totalNotes}<br>
      Style: ${styleDescription}<br>
      Based on ${accelData.length} data points
    </div>
  `;
}