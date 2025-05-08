// Updates to app.js for 3D accelerometer visualization

// Get DOM elements
const visualizationElement = document.getElementById('dataVisualization');
const dataStatsElement = document.getElementById('dataStats');
const statusElement = document.getElementById('status');

// Initialize data arrays
let accelDataX = []; // X-axis data
let accelDataY = []; // Y-axis data
let accelDataZ = []; // Z-axis data
let visualBarsX = []; // X-axis visualization bars
let visualBarsY = []; // Y-axis visualization bars
let visualBarsZ = []; // Z-axis visualization bars
let pollingInterval = null;

// Enhanced visualization creation with separate sections for X, Y, Z axes
function createVisualization() {
  if (!visualizationElement) {
    console.error('Visualization element not found');
    return;
  }
  
  visualizationElement.innerHTML = '';
  
  // Create container divs for each axis
  const xAxisContainer = document.createElement('div');
  xAxisContainer.className = 'axis-container';
  xAxisContainer.innerHTML = '<div class="axis-label">X-Axis</div>';
  
  const yAxisContainer = document.createElement('div');
  yAxisContainer.className = 'axis-container';
  yAxisContainer.innerHTML = '<div class="axis-label">Y-Axis</div>';
  
  const zAxisContainer = document.createElement('div');
  zAxisContainer.className = 'axis-container';
  zAxisContainer.innerHTML = '<div class="axis-label">Z-Axis</div>';
  
  // Add containers to visualization element
  visualizationElement.appendChild(xAxisContainer);
  visualizationElement.appendChild(yAxisContainer);
  visualizationElement.appendChild(zAxisContainer);
  
  // Create visualization bars for each axis
  visualBarsX = createAxisBars(xAxisContainer, '#FF5252');
  visualBarsY = createAxisBars(yAxisContainer, '#4CAF50');
  visualBarsZ = createAxisBars(zAxisContainer, '#448AFF');
}

// Helper function to create bars for a specific axis
function createAxisBars(container, color) {
  const bars = [];
  const barCount = 20; // Increased number of bars for smoother visualization
  const containerWidth = visualizationElement.clientWidth;
  const barWidth = (containerWidth / 3) / barCount - 2; // Account for 3 sections
  
  for (let i = 0; i < barCount; i++) {
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.width = `${barWidth}px`;
    bar.style.height = '0px';
    bar.style.background = `linear-gradient(to top, ${color}99, ${color})`;
    bar.style.transition = 'height 0.2s ease-out'; // Faster transition for real-time feel
    container.appendChild(bar);
    bars.push(bar);
  }
  
  return bars;
}

// Updated fetchLatestData function to handle 3-axis data
async function fetchLatestData() {
  try {
    // const response = await fetch(`${BASE_URL}/api/data`);
    // const response = await fetch('/api/data');

    // const response = await fetch(`http://localhost:5001/api/data`);

    const response = await fetch(`http://localhost:3000/api/data`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result && result.rawData3D) {
      // Store data for each axis
      accelDataX = result.rawData3D.x || [];
      accelDataY = result.rawData3D.y || [];
      accelDataZ = result.rawData3D.z || [];
      
      // Keep the original accelData for compatibility with existing functions
      accelData = result.rawData || calculateMagnitude(accelDataX, accelDataY, accelDataZ);
      
      updateDataStats();
      updateVisualization();
      updateStatus('Data updated successfully');
    } else if (result && result.rawData) {
      // Backward compatibility with original format
      accelData = result.rawData;
      updateDataStats();
      updateVisualization();
      updateStatus('Data updated successfully (single-axis data)');
    } else {
      updateStatus('No data available yet');
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    updateStatus(`Error fetching data: ${error.message}`);
  }
}

// Calculate magnitude from 3 axes (for backward compatibility)
function calculateMagnitude(x, y, z) {
  if (!x.length || !y.length || !z.length) return [];
  
  // Make sure all arrays are the same length
  const minLength = Math.min(x.length, y.length, z.length);
  const result = [];
  
  for (let i = 0; i < minLength; i++) {
    // Calculate magnitude using 3D vector formula: sqrt(x² + y² + z²)
    const magnitude = Math.sqrt(x[i]*x[i] + y[i]*y[i] + z[i]*z[i]);
    result.push(magnitude);
  }
  
  return result;
}

// Updated visualization function to handle 3 axes
function updateVisualization() {
  // Update for X axis
  updateAxisVisualization(accelDataX, visualBarsX, '#FF5252');
  
  // Update for Y axis
  updateAxisVisualization(accelDataY, visualBarsY, '#4CAF50');
  
  // Update for Z axis
  updateAxisVisualization(accelDataZ, visualBarsZ, '#448AFF');
}

// Helper function to update visualization for a specific axis
function updateAxisVisualization(data, bars, color) {
  if (!data || !data.length || !bars || !bars.length) return;
  
  const maxBars = bars.length;
  const dataToShow = data.slice(-maxBars);
  
  // Find min/max for scaling
  let minValue = Math.min(...dataToShow);
  let maxValue = Math.max(...dataToShow);
  
  // Ensure we have a reasonable range
  if (maxValue - minValue < 0.1) minValue = maxValue - 0.5;
  
  // Update each bar
  for (let i = 0; i < maxBars; i++) {
    if (i < dataToShow.length) {
      // Calculate height percentage
      const heightPercent = ((dataToShow[i] - minValue) / (maxValue - minValue)) * 100;
      const cappedHeight = Math.min(100, Math.max(5, heightPercent));
      bars[i].style.height = `${cappedHeight}%`;
      
      // Color intensity based on value
      const opacity = 0.5 + (heightPercent / 200);
      bars[i].style.opacity = opacity;
      
      // Add subtle animation for active bars
      if (i === dataToShow.length - 1) {
        bars[i].classList.add('active');
        setTimeout(() => bars[i].classList.remove('active'), 200);
      }
    } else {
      bars[i].style.height = '0%';
    }
  }
}

// Start polling for updates
function startPolling() {
  if (pollingInterval) return;
  pollingInterval = setInterval(fetchLatestData, 100); // Poll every 100ms for smoother updates
  updateStatus('Live updates started');
}

// Stop polling
function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    updateStatus('Live updates stopped');
  }
}

// CSS styles to be added to the page for 3D visualization
const threeDStyles = `
  #dataVisualization {
    height: 300px;
    display: flex;
    flex-direction: column;
    padding: 10px;
  }
  
  .axis-container {
    flex: 1;
    display: flex;
    align-items: flex-end;
    position: relative;
    margin-bottom: 10px;
    border-bottom: 1px solid #eee;
  }
  
  .axis-label {
    position: absolute;
    top: 5px;
    left: 5px;
    font-size: 12px;
    font-weight: bold;
    color: #666;
  }
  
  .axis-container:nth-child(1) .axis-label {
    color: #FF5252;
  }
  
  .axis-container:nth-child(2) .axis-label {
    color: #4CAF50;
  }
  
  .axis-container:nth-child(3) .axis-label {
    color: #448AFF;
  }
  
  .bar {
    margin: 0 1px;
  }
  
  .bar.playing {
    transform: scaleX(1.1) scaleY(1.1);
    z-index: 10;
  }
`;

// Add CSS for active bar animation
const additionalStyles = `
  .bar.active {
    transform: scaleY(1.1);
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.2);
  }
  
  .axis-container {
    position: relative;
    height: 80px;
    margin-bottom: 15px;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 8px;
    padding: 5px;
  }
  
  .axis-label {
    position: absolute;
    top: 5px;
    left: 10px;
    font-size: 12px;
    font-weight: bold;
    color: #666;
    z-index: 1;
  }
`;

function updateDataStats() {
  const latestX = accelDataX[accelDataX.length - 1] || 0;
  const latestY = accelDataY[accelDataY.length - 1] || 0;
  const latestZ = accelDataZ[accelDataZ.length - 1] || 0;
  const magnitude = Math.sqrt(latestX ** 2 + latestY ** 2 + latestZ ** 2);

  dataStatsElement.innerHTML = `
    <div><strong>X:</strong> ${latestX.toFixed(4)}</div>
    <div><strong>Y:</strong> ${latestY.toFixed(4)}</div>
    <div><strong>Z:</strong> ${latestZ.toFixed(4)}</div>
    <div><strong>Magnitude:</strong> ${magnitude.toFixed(4)}</div>
    <div><strong>Data Points:</strong> ${accelDataX.length}</div>
  `;
}

function updateStatus(message) {
  if (statusElement) {
    statusElement.textContent = message;
  } else {
    console.log("Status:", message);
  }
}

// Initialize the 3D visualization
function initialize3DVisualization() {
  // Wait for DOM to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeVisualization();
    });
  } else {
    initializeVisualization();
  }
}

function initializeVisualization() {
  // Add custom styles for 3D visualization
  const styleElement = document.createElement('style');
  styleElement.textContent = threeDStyles + additionalStyles;
  document.head.appendChild(styleElement);
  
  // Update the visualization with the new 3D version
  createVisualization();
  
  // Replace functions for handling data
  window.fetchLatestData = fetchLatestData;
  window.updateVisualization = updateVisualization;
  window.updateDataStats = updateDataStats;
  window.fetchTestData = fetchTestData;
  window.highlightBar = highlightBar;
  window.startPolling = startPolling;
  window.stopPolling = stopPolling;
  
  // Start polling for updates
  startPolling();
}

function fetchTestData() {
  console.log("Test data fetch not implemented.");
}

function highlightBar(index) {
  console.log("Highlight bar:", index);
}

// Run initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initialize3DVisualization);

// Add this code to the bottom of your app.js file 
// It will restore music generation without breaking visualization

// Global variables for music generation
let processedData = {};
let currentPlayer = null;
let magentaModels = {
  musicRNN: null,
  musicVAE: null,
  initialized: false
};
const BASE_URL = window.location.origin;

// Find the music buttons
const playMusicButton = document.getElementById('playMusic');
const stopMusicButton = document.getElementById('stopMusic');
const musicPlayerElement = document.getElementById('musicPlayer');
const musicStyleSelect = document.getElementById('musicStyle');

// Add event listeners for music controls if they exist
document.addEventListener('DOMContentLoaded', () => {
  // Set up music generation event listeners
  if (playMusicButton) {
    playMusicButton.addEventListener('click', generateAndPlayMusic);
    console.log('Added click listener to play music button');
  }
  
  if (stopMusicButton) {
    stopMusicButton.addEventListener('click', stopMusic);
    console.log('Added click listener to stop music button');
  }
  
  // Initialize Magenta models in the background
  initializeMagentaModels().then(() => {
    console.log('Magenta models initialized successfully');
  }).catch(error => {
    console.error('Error initializing Magenta models:', error);
  });
});

// Initialize Magenta models
async function initializeMagentaModels() {
  try {
    // Check if mm is defined
    if (typeof mm === 'undefined') {
      console.warn('Magenta Music library not found - skipping initialization');
      return;
    }
    
    // Initialize MusicRNN (for melody continuation)
    magentaModels.musicRNN = new mm.MusicRNN(
      'https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn'
    );
    
    // Initialize MusicVAE (for melody generation)
    magentaModels.musicVAE = new mm.MusicVAE(
      'https://storage.googleapis.com/magentadata/js/checkpoints/music_vae/mel_4bar_small_q2'
    );
    
    // Load both models in parallel
    await Promise.all([
      magentaModels.musicRNN.initialize(),
      magentaModels.musicVAE.initialize()
    ]);
    
    magentaModels.initialized = true;
    console.log('Magenta models initialized successfully');
  } catch (error) {
    console.error('Error initializing Magenta models:', error);
    magentaModels.initialized = false;
    throw error;
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
    if (visualBarsX && visualBarsY && visualBarsZ) {
      [...visualBarsX, ...visualBarsY, ...visualBarsZ].forEach(bar => {
        if (bar) bar.classList.remove('playing');
      });
    }
    
    // Update player display
    if (musicPlayerElement) {
      musicPlayerElement.innerHTML = '<div>No music playing</div>';
    }
    
    updateStatus('Music stopped');
    
    // Enable/disable buttons
    if (playMusicButton) playMusicButton.disabled = false;
    if (stopMusicButton) stopMusicButton.disabled = true;
    if (musicStyleSelect) musicStyleSelect.disabled = false;
  }
}

// Create synth based on accelerometer data
function createSynth(avgMagnitude) {
  // Check if Tone.js is loaded
  if (typeof Tone === 'undefined') {
    console.error('Tone.js not found');
    return null;
  }
  
  // Map magnitude ranges to different synthesizer settings
  let oscillatorType, attack, release, effects = [];
  
  // Low movement (0.5-1.0): Soft, ambient sounds
  if (avgMagnitude < 1.0) {
    oscillatorType = 'sine';
    attack = 0.4;
    release = 2.5;
    // Add reverb for spacious sound
    effects.push(new Tone.Reverb({ decay: 6, wet: 0.7 }).toDestination());
  } 
  // Medium movement (1.0-1.5): More defined, melodic sounds
  else if (avgMagnitude < 1.5) {
    oscillatorType = 'triangle';
    attack = 0.08;
    release = 0.8;
    // Add chorus for richness
    effects.push(new Tone.Chorus(4, 2.5, 0.5).toDestination());
  } 
  // High movement (1.5-2.0): Sharp, energetic sounds
  else {
    oscillatorType = 'sawtooth'; // Changed from square to sawtooth for more brightness
    attack = 0.02; // Faster attack for more percussive sound
    release = 0.5;  // Shorter release for more staccato sound
    // Add distortion and filter for edge
    const dist = new Tone.Distortion(0.4).toDestination();
    const filter = new Tone.Filter(2000, "highpass").connect(dist);
    effects.push(filter);
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
      sustain: 0.7,
      release: release
    }
  });
  
  // Connect effects if any
  if (effects.length > 0) {
    synth.disconnect();
    effects.forEach(effect => {
      synth.connect(effect);
    });
  }
  
  return synth;
}

// Generate and play music from the latest data
async function generateAndPlayMusic() {
  if (!accelDataX || !accelDataY || !accelDataZ) {
    updateStatus('No accelerometer data available');
    return;
  }
  
  // Create a single array of magnitudes
  const magnitudes = [];
  const minLength = Math.min(accelDataX.length, accelDataY.length, accelDataZ.length);
  
  for (let i = 0; i < minLength; i++) {
    const magnitude = Math.sqrt(
      accelDataX[i] * accelDataX[i] + 
      accelDataY[i] * accelDataY[i] + 
      accelDataZ[i] * accelDataZ[i]
    );
    magnitudes.push(magnitude);
  }
  
  if (magnitudes.length === 0) {
    updateStatus('No data available to generate music');
    return;
  }
  
  if (!magentaModels.initialized) {
    updateStatus('Music models not initialized yet. Please wait...');
    try {
      await initializeMagentaModels();
    } catch (error) {
      updateStatus('Failed to initialize music models');
      return;
    }
  }
  
  if (playMusicButton) playMusicButton.disabled = true;
  if (stopMusicButton) stopMusicButton.disabled = false;
  
  updateStatus('Generating music with Magenta...');
  
  try {
    // Get selected music style
    const musicStyle = musicStyleSelect ? musicStyleSelect.value : 'default';
    
    // Create processed data for music generation
    const averageMagnitude = magnitudes.reduce((sum, val) => sum + val, 0) / magnitudes.length;
    const processedData = {
      stats: {
        average: averageMagnitude,
        tempo: 60 + (averageMagnitude - 0.5) * 100,
        patterns: {
          type: detectPatternType(magnitudes)
        }
      }
    };
    
    // Generate music using Magenta
    const sequence = await generateMusicWithMagenta(magnitudes, processedData, musicStyle);
    
    // Play the generated music
    await playMagentaMusic(sequence, averageMagnitude);
    updateStatus('Playing Magenta-generated music');
  } catch (error) {
    console.error('Error generating music:', error);
    updateStatus('Error generating music: ' + error.message);
    if (playMusicButton) playMusicButton.disabled = false;
  }
}

// Detect pattern type from magnitudes
function detectPatternType(magnitudes) {
  // Calculate variability
  const avg = magnitudes.reduce((sum, val) => sum + val, 0) / magnitudes.length;
  const variability = Math.sqrt(
    magnitudes.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / magnitudes.length
  );
  
  // Count peaks
  let peakCount = 0;
  for (let i = 1; i < magnitudes.length - 1; i++) {
    if (magnitudes[i] > magnitudes[i-1] && magnitudes[i] > magnitudes[i+1] && magnitudes[i] > 1.3) {
      peakCount++;
    }
  }
  
  // Count high values
  const highValueCount = magnitudes.filter(val => val > 1.5).length;
  
  // Determine pattern type
  if (peakCount > 3) {
    return 'spiky';
  } else if (highValueCount > magnitudes.length * 0.5) {
    return 'sustained-high';
  } else if (variability < 0.2) {
    return 'regular';
  } else {
    return 'irregular';
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
  
  // Set parameters based on movement patterns
  const temperature = 0.8 + (stats.average - 0.5) * (0.8 / 1.5); // 0.8-1.6
  const steps = Math.floor(64 + (stats.average - 0.5) * (96 / 1.5)); // 64-160 steps
  
  // Choose generation method based on detected patterns
  let generatedSequence;
  
  if (!magentaModels.initialized) {
    throw new Error('Magenta models not initialized');
  }
  
  if (stats.patterns.type === 'regular') {
    // For regular patterns, use MusicRNN for continuation with lower temperature
    generatedSequence = await magentaModels.musicRNN.continueSequence(
      seedSequence, 
      steps, 
      temperature * 0.8
    );
  } else if (stats.patterns.type === 'spiky') {
    // For spiky patterns, use MusicVAE with higher temperature for more variation
    const z = await magentaModels.musicVAE.encode([seedSequence]);
    const generated = await magentaModels.musicVAE.decode(z, temperature * 1.2);
    generatedSequence = generated[0];
  } else {
    // Default approach: standard continuation
    generatedSequence = await magentaModels.musicRNN.continueSequence(
      seedSequence, 
      steps, 
      temperature
    );
  }
  
  // Apply style-specific adjustments
  applyMusicStyle(generatedSequence, style, stats);
  
  return generatedSequence;
}

// Create a seed sequence from accelerometer data
function createSeedSequence(accelData, stats) {
  // Quantization settings
  const qpm = stats.tempo || 120;
  const stepsPerQuarter = 4;
  
  // Create a new sequence
  const sequence = {
    quantizationInfo: { stepsPerQuarter },
    notes: [],
    totalQuantizedSteps: 32
  };
  
  // Sample points for creating notes
  const samplingRate = Math.max(1, Math.floor(accelData.length / 8));
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
function applyMusicStyle(sequence, style, stats) {
  switch (style) {
    case 'jazz':
    case 'curious':
      applyJazzStyle(sequence, stats);
      break;
    case 'electronic':
    case 'upbeat':
      applyElectronicStyle(sequence, stats);
      break;
    case 'ambient':
    case 'slow':
      applyAmbientStyle(sequence, stats);
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
function applyElectronicStyle(sequence, stats) {
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
function applyAmbientStyle(sequence, stats) {
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

// Play music generated by Magenta
async function playMagentaMusic(sequence, avgMagnitude) {
  // Check if Tone.js is loaded
  if (typeof Tone === 'undefined') {
    console.error('Tone.js not found');
    return;
  }
  
  // Make sure Tone.js is started (required by browsers)
  await Tone.start();
  
  // Stop any currently playing music
  stopMusic();
  
  // Calculate the tempo based on average magnitude (60-160 BPM)
  const tempo = 60 + ((avgMagnitude - 0.5) / 1.5) * 100;
  Tone.Transport.bpm.value = tempo;
  
  // Create a synth based on the average magnitude of the data
  const synth = createSynth(avgMagnitude);
  
  // Check if Magenta's SoundFontPlayer is available
  if (typeof mm === 'undefined' || !mm.SoundFontPlayer) {
    console.error('Magenta SoundFontPlayer not available');
    return;
  }
  
  // Create player using Magenta's SoundFontPlayer
  const player = new mm.SoundFontPlayer(
    'https://storage.googleapis.com/magentadata/js/soundfonts/sgm_plus', 
    undefined, 
    undefined, 
    undefined, 
    {
      run: (note) => {
        // Highlight bars when a note plays
        highlightMultipleAxes(note.pitch);
      },
      stop: () => {
        updateStatus('Music finished playing');
        if (playMusicButton) playMusicButton.disabled = false;
        if (stopMusicButton) stopMusicButton.disabled = true;
      }
    }
  );
  
  // Start playing
  player.start(sequence);
  
  // Store the current player for stopping later
  currentPlayer = { player, synth };
  
  // Update the player display
  if (musicPlayerElement) {
    musicPlayerElement.innerHTML = `
      <div>
        <strong>Now playing</strong><br>
        Tempo: ${Math.round(tempo)} BPM<br>
        Notes: ${sequence.notes.length}<br>
        Generated with Magenta AI
      </div>
    `;
  }
}

// Highlight bars across all axes when a note plays
function highlightMultipleAxes(pitch) {
  const normalizedPitch = Math.max(36, Math.min(84, pitch));
  
  // Get indices for each axis (with slight offsets to make it more interesting)
  const xIndex = Math.floor((normalizedPitch - 36) / 48 * visualBarsX.length);
  const yIndex = Math.floor((normalizedPitch - 40) / 48 * visualBarsY.length); // Offset by 4
  const zIndex = Math.floor((normalizedPitch - 32) / 48 * visualBarsZ.length); // Offset by -4
  
  // Highlight X axis
  if (xIndex >= 0 && xIndex < visualBarsX.length) {
    visualBarsX[xIndex].classList.add('playing');
    setTimeout(() => visualBarsX[xIndex].classList.remove('playing'), 200);
  }
  
  // Highlight Y axis
  if (yIndex >= 0 && yIndex < visualBarsY.length) {
    visualBarsY[yIndex].classList.add('playing');
    setTimeout(() => visualBarsY[yIndex].classList.remove('playing'), 200);
  }
  
  // Highlight Z axis
  if (zIndex >= 0 && zIndex < visualBarsZ.length) {
    visualBarsZ[zIndex].classList.add('playing');
    setTimeout(() => visualBarsZ[zIndex].classList.remove('playing'), 200);
  }
}

console.log('Music generation code loaded');