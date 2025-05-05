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

// Global variables
let accelData = [];
let processedData = {};
let currentPlayer = null;
let visualBars = [];
let autoRefreshInterval = null;
let magentaModels = {
  musicRNN: null,
  musicVAE: null,
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
    } else {
      visualBars[i].style.height = '0px';
    }
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
    const response = await fetch(`${BASE_URL}/api/testData`);
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
  if (processedData && processedData.stats && processedData.stats.patterns) {
    patternType = processedData.stats.patterns.type;
    patternType = patternType.charAt(0).toUpperCase() + patternType.slice(1);
  }
  
  dataStatsElement.innerHTML = `
    <div><strong>Data points:</strong> ${accelData.length}</div>
    <div><strong>Average magnitude:</strong> ${avgMagnitude.toFixed(2)}</div>
    <div><strong>Max magnitude:</strong> ${maxMagnitude.toFixed(2)}</div>
    <div><strong>Min magnitude:</strong> ${minMagnitude.toFixed(2)}</div>
    <div><strong>Pattern type:</strong> ${patternType}</div>
    <div><strong>Last updated:</strong> ${new Date().toLocaleTimeString()}</div>
  `;
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
  statusElement.textContent = 'Generating music with Magenta...';
  
  try {
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
      statusElement.textContent = 'Playing Magenta-generated music';
    } else {
      statusElement.textContent = 'Failed to get music data';
    }
  } catch (error) {
    console.error('Error generating music:', error);
    statusElement.textContent = 'Error generating music';
  } finally {
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
  
  // Set parameters based on movement patterns
  const temperature = 0.8 + (stats.average - 0.5) * (0.8 / 1.5); // 0.8-1.6
  const steps = Math.floor(16 + (stats.average - 0.5) * (32 / 1.5)); // 16-48 steps
  
  // Choose generation method based on detected patterns
  let generatedSequence;
  
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
    totalQuantizedSteps: 16
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
      applyJazzStyle(sequence, stats);
      break;
    case 'electronic':
      applyElectronicStyle(sequence, stats);
      break;
    case 'ambient':
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
  // Make sure Tone.js is started (required by browsers)
  await Tone.start();
  
  // Stop any currently playing music
  stopMusic();
  
  // Calculate the tempo based on average magnitude (60-160 BPM)
  const tempo = 60 + ((avgMagnitude - 0.5) / 1.5) * 100;
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
        highlightBar(note.pitch);
      },
      stop: () => {
        statusElement.textContent = 'Music finished playing';
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

// Create a synthesizer with parameters based on accelerometer data
function createSynth(avgMagnitude) {
  // Map magnitude ranges to different synthesizer settings
  let oscillatorType, attack, release, effects = [];
  
  // Low movement (0.5-1.0): Soft, ambient sounds
  if (avgMagnitude < 1.0) {
    oscillatorType = 'sine';
    attack = 0.3;
    release = 2.0;
    // Add reverb for spacious sound
    effects.push(new Tone.Reverb({ decay: 5, wet: 0.6 }).toDestination());
  } 
  // Medium movement (1.0-1.5): More defined, melodic sounds
  else if (avgMagnitude < 1.5) {
    oscillatorType = 'triangle';
    attack = 0.1;
    release = 1.0;
    // Add chorus for richness
    effects.push(new Tone.Chorus(4, 2.5, 0.5).toDestination());
  } 
  // High movement (1.5-2.0): Sharp, energetic sounds
  else {
    oscillatorType = 'square';
    attack = 0.05;
    release = 0.7;
    // Add distortion for edge
    effects.push(new Tone.Distortion(0.3).toDestination());
  }
  
  // Create and configure the synth
}


async function generateMusic(accelDataArray) {
  try {
    const response = await fetch('/generate-music', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: accelDataArray })
    });

    if (!response.ok) {
      throw new Error('Failed to generate music');
    }

    const sequence = await response.json();
    console.log('Music sequence:', sequence);

    // Optionally do something with `sequence`, like visualize or play it
  } catch (error) {
    console.error('Error:', error);
  }
}
