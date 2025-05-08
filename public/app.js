// public/app.js - Frontend JavaScript with Magenta in browser

// UI Elements - Wait for DOM to load before getting elements
let statusElement, dataStatsElement, visualizationElement, playMusicButton;
let fetchDataButton, stopMusicButton, testDataButton, musicPlayerElement, musicStyleSelect;

// Global variables
let accelData = [];
let processedData = {};
let currentPlayer = null;
let visualBars = [];
let autoRefreshInterval = null;
let visualizationInterval = null;
let magentaModels = {
  musicRNN: null,
  musicVAE: null,
  initialized: false
};
const BASE_URL = window.location.origin;
let audioRecorder = null;
let audioChunks = [];
let isRecording = false;
let recordingStartTime = null;
let recordedAudioUrl = null;
console.log(BASE_URL)

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Get UI elements after DOM is loaded
  statusElement = document.getElementById('status');
  dataStatsElement = document.getElementById('dataStats');
  visualizationElement = document.getElementById('dataVisualization');
  playMusicButton = document.getElementById('playMusic');
  fetchDataButton = document.getElementById('fetchData');
  stopMusicButton = document.getElementById('stopMusic');
  testDataButton = document.getElementById('testData');
  musicPlayerElement = document.getElementById('musicPlayer');
  musicStyleSelect = document.getElementById('musicStyle');
  
  // Display loading status
  if (statusElement) {
    statusElement.textContent = 'Initializing...';
  }
  
  // Create visualization
  createVisualization();
  
  // Initialize Magenta models
  initializeMagentaModels().then(() => {
    if (statusElement) {
      statusElement.textContent = 'Ready to fetch data';
    }
    fetchLatestData(); // Initial data fetch
    
    // Start auto-refresh
    startAutoRefresh();
  }).catch(error => {
    console.error('Error initializing Magenta models:', error);
    if (statusElement) {
      statusElement.textContent = 'Error initializing music models';
    }
  });
  
  // Set up button event listeners
  if (playMusicButton) {
    playMusicButton.addEventListener('click', async () => {
      const selectedOption = musicStyleSelect ? musicStyleSelect.value : 'accelerometer';
      if (selectedOption === 'accelerometer') {
        await generateAndPlayMusic();
      } else {
        await playSelectedTrack(selectedOption);
      }
    });
  }
  
  if (fetchDataButton) {
    fetchDataButton.addEventListener('click', fetchLatestData);
  }
  
  if (stopMusicButton) {
    stopMusicButton.addEventListener('click', stopMusic);
  }
  
  if (testDataButton) {
    testDataButton.addEventListener('click', fetchTestData);
  }
  
  // Set up test data slider interaction
  const testDataSlider = document.getElementById('testDataSlider');
  if (testDataSlider) {
    testDataSlider.addEventListener('input', () => {
      document.getElementById('currentValue').textContent = testDataSlider.value;
    });
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
  console.log('Auto-refresh started');
}

// Stop auto-refresh
function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
    console.log('Auto-refresh stopped');
  }
}

// Initialize Magenta models
async function initializeMagentaModels() {
  try {
    // Check if mm is defined
    if (typeof mm === 'undefined') {
      console.warn('Magenta Music library not found - skipping initialization');
      magentaModels.initialized = false;
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

// Create visualization elements
function createVisualization() {
  if (!visualizationElement) {
    console.error('Visualization element not found');
    return;
  }
  
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
    visualizationElement.appendChild(bar);
    visualBars.push(bar);
  }
  
  console.log(`Created ${visualBars.length} visualization bars`);
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
    if (musicPlayerElement) {
      musicPlayerElement.innerHTML = '<div>No music playing</div>';
    }
    
    if (statusElement) {
      statusElement.textContent = 'Music stopped';
    }
    
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
  
  // Map magnitude ranges to different synthesizer settings with more dramatic differences
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

// Add function to highlight a bar when a note plays
function highlightBar(pitch) {
  // Map the pitch to a visualization bar index
  // Using expanded range from C2 (36) to C6 (84)
  const normalizedPitch = Math.max(36, Math.min(84, pitch));
  const index = Math.floor((normalizedPitch - 36) / 48 * visualBars.length);
  
  if (index >= 0 && index < visualBars.length) {
    // Add more dramatic visual highlighting
    visualBars[index].classList.add('playing');
    
    // Add color based on pitch height
    if (pitch < 48) { // Low notes
      visualBars[index].style.backgroundColor = '#3366cc'; // Blue for low notes
    } else if (pitch < 60) { // Mid-low notes
      visualBars[index].style.backgroundColor = '#33cc33'; // Green for mid-low notes
    } else if (pitch < 72) { // Mid-high notes
      visualBars[index].style.backgroundColor = '#ff9900'; // Orange for mid-high notes
    } else { // High notes
      visualBars[index].style.backgroundColor = '#cc3333'; // Red for high notes
    }
    
    // Make the bar temporarily larger for visual emphasis
    const originalHeight = visualBars[index].style.height;
    visualBars[index].style.height = 'calc(' + originalHeight + ' + 20px)';
    
    // Reset after animation
    setTimeout(() => {
      visualBars[index].classList.remove('playing');
      visualBars[index].style.backgroundColor = '#4CAF50'; // Reset to original color
      visualBars[index].style.height = originalHeight; // Reset to original height
    }, 300); // 300ms animation for better visibility
  }
}

// Update the visualization with new data
function updateVisualization() {
  if (!accelData || accelData.length === 0) return;
  if (!visualBars || visualBars.length === 0) {
    console.warn('No visualization bars found');
    createVisualization(); // Try to recreate visualization
    return;
  }
  
  // console.log(`Updating visualization with ${accelData.length} data points`);
  
  const maxBars = visualBars.length;
  const dataToShow = accelData.slice(-maxBars); // Get the most recent data points
  
  for (let i = 0; i < maxBars; i++) {
    if (i < dataToShow.length) {
      // Map the value from 0.5-2.0 to 0-100% of the height
      const heightPercent = ((dataToShow[i] - 0.5) / 1.5) * 100;
      // Apply with a cap at 100%
      const cappedHeight = Math.min(100, Math.max(0, heightPercent));
      visualBars[i].style.height = `${cappedHeight}%`;
    } else {
      visualBars[i].style.height = '0%';
    }
  }
  
  // console.log('Visualization updated');
}

// Fetch the latest accelerometer data
async function fetchLatestData() {
  if (statusElement) {
    statusElement.textContent = 'Fetching latest data...';
  }
  
  try {
    console.log('Fetching data from:', `${BASE_URL}/api/data`);
    const response = await fetch(`${BASE_URL}/api/data`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    // console.log('Received data:', result);
    
    if (result && result.rawData) {
      accelData = result.rawData;
      processedData = result.processedData;
      updateDataStats();
      updateVisualization(); // This should update the UI
      
      if (statusElement) {
        statusElement.textContent = 'Data updated successfully';
      }
      
      // Update instrument indicators based on data
      updateInstrumentIndicators();
    } else {
      console.warn('No data in response:', result);
      if (statusElement) {
        statusElement.textContent = 'No data available yet';
      }
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    if (statusElement) {
      statusElement.textContent = `Error fetching data: ${error.message}`;
    }
  }
}

// Update instrument indicators based on data
function updateInstrumentIndicators() {
  // Default to 1 instrument for empty data
  if (!accelData || accelData.length === 0) return;
  
  const avgMagnitude = accelData.reduce((sum, val) => sum + val, 0) / accelData.length;
  
  // Determine how many instruments should be active based on magnitude
  // Map 0.5-2.0 to 1-5 instruments
  const numActiveInstruments = Math.max(1, Math.min(5, Math.floor(1 + (avgMagnitude - 0.5) * 4)));
  
  // All possible instruments
  const instruments = ['piano', 'bass', 'drums', 'strings', 'brass'];
  
  // Activate/deactivate instruments
  instruments.forEach((instrument, index) => {
    const element = document.getElementById(`instrument-${instrument}`);
    if (element) {
      if (index < numActiveInstruments) {
        element.classList.add('active');
      } else {
        element.classList.remove('active');
      }
    }
  });
}

// Fetch test data for demonstration
async function fetchTestData() {
  if (statusElement) {
    statusElement.textContent = 'Generating test data...';
  }
  
  try {
    // Get intensity value from slider if available
    const slider = document.getElementById('testDataSlider');
    const intensity = slider ? parseFloat(slider.value) : 1.0;
    
    // Add intensity parameter to the URL
    const url = `${BASE_URL}/api/testData?intensity=${intensity}`;
    console.log('Generating test data with URL:', url);
    
    const response = await fetch(url);
    const result = await response.json();
    
    if (result && result.status === 'success') {
      accelData = result.data;
      if (statusElement) {
        statusElement.textContent = 'Test data generated';
      }
      
      // Update visualizations immediately
      updateDataStats();
      updateVisualization();
      updateInstrumentIndicators();
    } else {
      if (statusElement) {
        statusElement.textContent = 'Error generating test data';
      }
    }
  } catch (error) {
    console.error('Error generating test data:', error);
    if (statusElement) {
      statusElement.textContent = 'Error generating test data';
    }
  }
}

// Update the stats display with 100% dynamic data
function updateDataStats() {
  if (!dataStatsElement) return;
  
  if (!accelData || accelData.length === 0) {
    dataStatsElement.innerHTML = '<div>No accelerometer data available yet.</div>';
    return;
  }
  
  // Calculate statistics directly from the current data
  const avgMagnitude = accelData.reduce((sum, val) => sum + val, 0) / accelData.length;
  const maxMagnitude = Math.max(...accelData);
  const minMagnitude = Math.min(...accelData);
  
  // Calculate variability (standard deviation)
  function calculateVariability(data) {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const squaredDiffs = data.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / data.length;
    return Math.sqrt(variance);
  }
  const variability = calculateVariability(accelData);
  
  // Count peaks
  function countPeaks(data) {
    let peakCount = 0;
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] > data[i-1] && data[i] > data[i+1] && data[i] > 1.3) {
        peakCount++;
      }
    }
    return peakCount;
  }
  const peakCount = countPeaks(accelData);
  
  // Count high values
  const highValueCount = accelData.filter(val => val > 1.5).length;
  
  // Determine pattern type
  let patternType;
  if (peakCount > 3) {
    patternType = 'Spiky';
  } else if (highValueCount > accelData.length * 0.5) {
    patternType = 'Sustained-high';
  } else if (variability < 0.2) {
    patternType = 'Regular';
  } else {
    patternType = 'Irregular';
  }
  
  // Calculate tempo (60-160 BPM based on magnitude)
  const tempo = 60 + (avgMagnitude - 0.5) * (100 / 1.5);
  
  // Calculate predicted timbre characteristics
  function getTimbreType(magnitude) {
    if (magnitude < 1.0) {
      return 'Soft, ambient (sine wave)';
    } else if (magnitude < 1.5) {
      return 'Balanced, melodic (triangle wave)';
    } else {
      return 'Bright, energetic (sawtooth wave)';
    }
  }
  const timbreType = getTimbreType(avgMagnitude);
  
  // Calculate activity level
  function getActivityLevel(magnitude) {
    if (magnitude < 1.0) {
      return 'Low';
    } else if (magnitude < 1.5) {
      return 'Medium';
    } else {
      return 'High';
    }
  }
  const activityLevel = getActivityLevel(avgMagnitude);
  
  // Update the HTML with the current values - all dynamically calculated from data
  dataStatsElement.innerHTML = `
    <div><strong>Data points:</strong> ${accelData.length}</div>
    <div><strong>Activity level:</strong> ${activityLevel}</div>
    <div><strong>Average magnitude:</strong> ${avgMagnitude.toFixed(2)}</div>
    <div><strong>Max magnitude:</strong> ${maxMagnitude.toFixed(2)}</div>
    <div><strong>Min magnitude:</strong> ${minMagnitude.toFixed(2)}</div>
    <div><strong>Variability:</strong> ${variability.toFixed(3)}</div>
    <div><strong>Peak count:</strong> ${peakCount}</div>
    <div><strong>Pattern:</strong> ${patternType}</div>
    <div><strong>Tempo:</strong> ${Math.round(tempo)} BPM</div>
    <div><strong>Sound character:</strong> ${timbreType}</div>
    <div><strong>Last updated:</strong> ${new Date().toLocaleTimeString()}</div>
  `;
  
  // Update instrument indicators based on current data
  updateInstrumentIndicatorsFromData();
  
  // console.log('Data stats completely updated with current dynamic values');
}

// Dynamically update instrument indicators based on current data
function updateInstrumentIndicatorsFromData() {
  if (!accelData || accelData.length === 0) return;
  
  // Get current average magnitude
  const avgMagnitude = accelData.reduce((sum, val) => sum + val, 0) / accelData.length;
  
  // Dynamically calculate how many instruments to show
  // Map 0.5-2.0 to 1-5 instruments
  const numActiveInstruments = Math.max(1, Math.min(5, Math.floor(1 + (avgMagnitude - 0.5) * 4)));
  
  // All possible instruments
  const instruments = ['piano', 'bass', 'drums', 'strings', 'brass'];
  
  // Activate/deactivate instruments based on current data
  instruments.forEach((instrument, index) => {
    const element = document.getElementById(`instrument-${instrument}`);
    if (element) {
      if (index < numActiveInstruments) {
        element.classList.add('active');
      } else {
        element.classList.remove('active');
      }
    }
  });
}

// Generate and play music from the latest data
async function generateAndPlayMusic() {
  if (!accelData || accelData.length === 0) {
    if (statusElement) {
      statusElement.textContent = 'No data available to generate music';
    }
    return;
  }
  
  if (!magentaModels.initialized) {
    if (statusElement) {
      statusElement.textContent = 'Music models not initialized yet. Please wait...';
    }
    try {
      await initializeMagentaModels();
    } catch (error) {
      if (statusElement) {
        statusElement.textContent = 'Failed to initialize music models';
      }
      return;
    }
  }
  
  if (playMusicButton) playMusicButton.disabled = true;
  if (stopMusicButton) stopMusicButton.disabled = false;
  
  if (statusElement) {
    statusElement.textContent = 'Generating music with Magenta...';
  }
  
  try {
    // Dispatch beforeGenerateMusic event for compatibility
    window.dispatchEvent(new Event('beforeGenerateMusic'));
    
    // Get selected music style
    const musicStyle = musicStyleSelect ? musicStyleSelect.value : 'default';
    
    // Get the music data from the server
    const response = await fetch(`${BASE_URL}/api/musicData`);
    const result = await response.json();
    
    if (result.status === 'success') {
      // Generate music using Magenta models in the browser
      const sequence = await generateMusicWithMagenta(
        result.accelerometerData, 
        result.processedData,
        musicStyle
      );
      
      // Play the generated music
      await playMagentaMusic(sequence, result.processedData.stats.average);
      if (statusElement) {
        statusElement.textContent = 'Playing Magenta-generated music';
      }
    } else {
      if (statusElement) {
        statusElement.textContent = 'Failed to get music data';
      }
      if (playMusicButton) playMusicButton.disabled = false;
    }
  } catch (error) {
    console.error('Error generating music:', error);
    if (statusElement) {
      statusElement.textContent = 'Error generating music';
    }
    if (playMusicButton) playMusicButton.disabled = false;
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
        // Highlight the corresponding visualization bar when a note plays
        highlightBar(note.pitch);
      },
      stop: () => {
        if (statusElement) {
          statusElement.textContent = 'Music finished playing';
        }
        if (playMusicButton) playMusicButton.disabled = false;
        if (stopMusicButton) stopMusicButton.disabled = true;
      }
    }
  );
  
  // Configure the player
  player.callbackObject = {
    run: (note) => {
      const index = Math.floor((note.pitch - 48) / 24 * visualBars.length);
      if (index >= 0 && index < visualBars.length) {
        // Add a special class to highlight the bar
        visualBars[index].classList.add('playing');
        setTimeout(() => {
          visualBars[index].classList.remove('playing');
        }, note.endTime - note.startTime + 100);
      }
    },
    stop: () => {}
  };
  
  // Start playing
  player.start(sequence);
  
  // Store the current player for stopping later
  currentPlayer = {
    player,
    synth
  };
  
  // Update the player display
  if (musicPlayerElement) {
    musicPlayerElement.innerHTML = `
      <div>
        <strong>Now playing</strong><br>
        Tempo: ${Math.round(tempo)} BPM<br>
        Notes: ${sequence.notes.length}<br>
        Based on ${accelData.length} data points<br>
        Generated with Magenta AI
      </div>
    `;
  }
}

// Play selected track
async function playSelectedTrack(trackName) {
  // Stop any currently playing music
  stopMusic();
  
  if (playMusicButton) playMusicButton.disabled = true;
  if (stopMusicButton) stopMusicButton.disabled = false;
  
  try {
    console.log('Attempting to play track:', trackName);
    // Create audio context
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Load and play the selected track
    const trackUrl = `/tracks/${trackName}.mp3`;
    console.log('Fetching track from:', trackUrl);
    
    try {
      const response = await fetch(trackUrl);
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        console.error('Failed response details:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        });
        throw new Error(`Failed to load track: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('Successfully loaded track data, size:', arrayBuffer.byteLength);
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Create source and connect to destination
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      // Store the current player
      currentPlayer = {
        player: source,
        context: audioContext
      };
      
      // Set up event for when track ends
      source.onended = () => {
        if (statusElement) {
          statusElement.textContent = `Finished playing ${trackName}`;
        }
        if (playMusicButton) playMusicButton.disabled = false;
        if (stopMusicButton) stopMusicButton.disabled = true;
        if (musicStyleSelect) musicStyleSelect.disabled = false;
      };
      
      // Start playback
      source.start(0);
      console.log('Started playing track');
      
      // Update the player display
      if (musicPlayerElement) {
        musicPlayerElement.innerHTML = `
          <div>
            <strong>Now playing</strong><br>
            Track: ${trackName}<br>
            Duration: ${Math.round(audioBuffer.duration)} seconds
          </div>
        `;
      }
      
      if (statusElement) {
        statusElement.textContent = `Playing ${trackName}`;
      }
      
    } catch (fetchError) {
      console.error('Fetch error details:', {
        error: fetchError,
        message: fetchError.message,
        stack: fetchError.stack
      });
      
      if (statusElement) {
        statusElement.textContent = `Error: Failed to load track ${trackName}`;
      }
      
      if (playMusicButton) playMusicButton.disabled = false;
      if (stopMusicButton) stopMusicButton.disabled = true;
      if (musicStyleSelect) musicStyleSelect.disabled = false;
      
      throw fetchError;
    }
  } catch (error) {
    console.error('Error playing track:', error);
    if (statusElement) {
      statusElement.textContent = 'Error playing track';
    }
    
    if (playMusicButton) playMusicButton.disabled = false;
    if (stopMusicButton) stopMusicButton.disabled = true;
    if (musicStyleSelect) musicStyleSelect.disabled = false;
    
    throw error;
  }
}

// Add this function to your code
function makeLongerNotes(sequence) {
  // Extend the duration of each note
  for (let i = 0; i < sequence.notes.length; i++) {
    const note = sequence.notes[i];
    // Make each note 2x longer
    note.quantizedEndStep = note.quantizedStartStep + 
      (note.quantizedEndStep - note.quantizedStartStep) * 2;
  }
  return sequence;
}

// Then modify your generateMusicWithMagenta function to call this
// Add this line right before returning generatedSequence:
generatedSequence = makeLongerNotes(generatedSequence);
// Function to add arpeggios to increase note density
function addArpeggios(sequence) {
  const originalNotes = [...sequence.notes];
  
  // For each existing note, add arpeggiated patterns
  originalNotes.forEach((note, index) => {
    if (index % 3 === 0) { // Only do this for some notes to avoid overcrowding
      const startStep = note.quantizedStartStep;
      const duration = note.quantizedEndStep - note.quantizedStartStep;
      
      // Only add arpeggios for longer notes
      if (duration >= 2) {
        // Create an arpeggio (4 notes in a pattern)
        const arpeggioNotes = [
          0,  // Root (same as original note)
          4,  // Major third
          7,  // Perfect fifth
          12  // Octave
        ];
        
        // Add each note of the arpeggio in sequence
        arpeggioNotes.forEach((interval, i) => {
          sequence.notes.push({
            pitch: note.pitch + interval,
            quantizedStartStep: startStep + (i * 0.5), // Each 1/8th note
            quantizedEndStep: startStep + (i * 0.5) + 0.5,
            velocity: Math.max(60, note.velocity - 20)
          });
        });
      }
    }
  });
  
  return sequence;
}

// Function to double notes with variations
function doubleNotes(sequence) {
  const originalNotes = [...sequence.notes];
  
  // For each original note, add a variation
  originalNotes.forEach(note => {
    // Random pitch variation (-2, 0, or +2 semitones)
    const pitchVariation = Math.random() < 0.7 ? 0 : (Math.random() < 0.5 ? -2 : 2);
    
    // Slight timing offset
    const timeOffset = Math.random() * 0.75;
    
    // Create the doubled note with variations
    sequence.notes.push({
      pitch: note.pitch + pitchVariation,
      quantizedStartStep: note.quantizedStartStep + timeOffset,
      quantizedEndStep: note.quantizedEndStep + timeOffset,
      velocity: Math.max(50, note.velocity - 15)
    });
  });
  
  return sequence;
}

// Enhanced createSeedSequence function with more notes
function createEnhancedSeedSequence(accelData, stats) {
  // Existing setup
  const qpm = stats.tempo || 120;
  const stepsPerQuarter = 4;
  
  const sequence = {
    quantizationInfo: { stepsPerQuarter },
    notes: [],
    totalQuantizedSteps: 32
  };
  
  // Use more data points by reducing the sampling rate
  const samplingRate = Math.max(1, Math.floor(accelData.length / 16)); // Changed from 8 to 16
  let step = 0;
  
  for (let i = 0; i < accelData.length; i += samplingRate) {
    const magnitude = accelData[i];
    
    // Basic note (same as before)
    const basePitch = 48 + Math.floor((magnitude - 0.5) * (24 / 1.5));
    let pitch = basePitch;
    
    if (stats.patterns.type === 'spiky' && magnitude > 1.5) {
      pitch += 7;
    }
    
    const durationSteps = Math.max(1, Math.floor(4 - (magnitude - 0.5) * 2));
    
    // Add the primary note
    sequence.notes.push({
      pitch: pitch,
      quantizedStartStep: step,
      quantizedEndStep: step + durationSteps,
      velocity: 80 + Math.floor((magnitude - 0.5) * (47 / 1.5))
    });
    
    // Add harmony notes
    if (i % 2 === 0) {
      // Add a third above (4 semitones up)
      sequence.notes.push({
        pitch: pitch + 4,
        quantizedStartStep: step + 0.5,
        quantizedEndStep: step + durationSteps,
        velocity: 70 + Math.floor((magnitude - 0.5) * 40)
      });
    }
    
    if (i % 3 === 0) {
      // Add a fifth above (7 semitones up)
      sequence.notes.push({
        pitch: pitch + 7,
        quantizedStartStep: step + 1,
        quantizedEndStep: step + durationSteps,
        velocity: 65 + Math.floor((magnitude - 0.5) * 40)
      });
    }
    
    // Add occasional bass notes
    if (i % 4 === 0) {
      sequence.notes.push({
        pitch: pitch - 12, // Octave below
        quantizedStartStep: step,
        quantizedEndStep: step + durationSteps + 2,
        velocity: 85
      });
    }
    
    step += Math.max(1, Math.floor(durationSteps * 0.8)); // Overlap notes slightly
  }
  
  sequence.totalQuantizedSteps = Math.max(32, step);
  return sequence;
}

// Enhanced ambient style with more notes
function enhancedAmbientStyle(sequence, stats) {
  // First make existing notes longer
  for (let i = 0; i < sequence.notes.length; i++) {
    const note = sequence.notes[i];
    note.quantizedEndStep = note.quantizedEndStep + 6; // Even longer notes
    
    // Add rich layering - multiple notes for each existing note
    if (i % 2 === 0) { // For half the notes
      // Perfect fifth down
      sequence.notes.push({
        pitch: note.pitch - 7,
        quantizedStartStep: note.quantizedStartStep + 2,
        quantizedEndStep: note.quantizedEndStep + 4,
        velocity: Math.max(40, note.velocity - 30)
      });
      
      // Octave down
      sequence.notes.push({
        pitch: note.pitch - 12,
        quantizedStartStep: note.quantizedStartStep + 4,
        quantizedEndStep: note.quantizedEndStep + 8,
        velocity: Math.max(40, note.velocity - 35)
      });
    }
    
    if (i % 3 === 0) { // For one third of the notes
      // Major third up
      sequence.notes.push({
        pitch: note.pitch + 4,
        quantizedStartStep: note.quantizedStartStep + 1,
        quantizedEndStep: note.quantizedEndStep + 3,
        velocity: Math.max(40, note.velocity - 25)
      });
      
      // Perfect fifth up
      sequence.notes.push({
        pitch: note.pitch + 7,
        quantizedStartStep: note.quantizedStartStep + 3,
        quantizedEndStep: note.quantizedEndStep + 5,
        velocity: Math.max(40, note.velocity - 20)
      });
    }
  }
  
  // Add decorative touches - gentle runs of notes
  const totalSteps = sequence.totalQuantizedSteps;
  const sections = Math.floor(totalSteps / 8);
  
  for (let i = 0; i < sections; i++) {
    const startStep = i * 8;
    
    // Add a gentle ascending scale every 8 steps
    for (let j = 0; j < 5; j++) {
      sequence.notes.push({
        pitch: 60 + j * 2, // Starting from middle C, ascending in whole steps
        quantizedStartStep: startStep + j,
        quantizedEndStep: startStep + j + 2,
        velocity: 50
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

// Now, let's modify the generateMusicWithMagenta function to use these enhanced features
// Replace your current generateMusicWithMagenta function with this one:

// Generate music with Magenta in the browser
async function generateMusicWithMagenta(accelData, processedData, style = 'default') {
  // Make sure we have data
  if (!accelData || accelData.length < 10) {
    throw new Error('Not enough data to generate music');
  }
  
  const stats = processedData.stats;
  
  // Use enhanced seed sequence with more notes
  const seedSequence = createEnhancedSeedSequence(accelData, stats);
  
  // Set parameters based on movement patterns - keep the increased steps
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
  
  // Add arpeggios to dramatically increase note count
  generatedSequence = addArpeggios(generatedSequence);
  
  // Double the notes with variations for even more richness
  generatedSequence = doubleNotes(generatedSequence);
  
  // Make all notes longer (your existing function)
  generatedSequence = makeLongerNotes(generatedSequence);
  
  return generatedSequence;
}

// And finally, let's enhance the applyAmbientStyle function to add more notes
// Replace your current applyAmbientStyle function with this:

// Apply ambient music style adjustments
function applyAmbientStyle(sequence, stats) {
  // Use the enhanced ambient style function
  enhancedAmbientStyle(sequence, stats);
}