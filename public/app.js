// public/app.js - Frontend JavaScript to interact with server and play music

// UI Elements
const statusElement = document.getElementById('status');
const dataStatsElement = document.getElementById('dataStats');
const visualizationElement = document.getElementById('dataVisualization');
const playMusicButton = document.getElementById('playMusic');
const fetchDataButton = document.getElementById('fetchData');
const stopMusicButton = document.getElementById('stopMusic');
const musicPlayerElement = document.getElementById('musicPlayer');

// Global variables
let accelData = [];
let currentPlayer = null;
let visualBars = [];
const BASE_URL = window.location.origin; // Automatically use the correct server URL

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  statusElement.textContent = 'Ready to fetch data';
  createVisualization();
  fetchLatestData(); // Initial data fetch
  
  // Set up button event listeners
  playMusicButton.addEventListener('click', generateAndPlayMusic);
  fetchDataButton.addEventListener('click', fetchLatestData);
  stopMusicButton.addEventListener('click', stopMusic);
});

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
    const response = await fetch(`${BASE_URL}/api/data`);
    const result = await response.json();
    
    if (result && result.rawData) {
      accelData = result.rawData;
      updateDataStats();
      updateVisualization();
      statusElement.textContent = 'Data updated successfully';
    } else {
      statusElement.textContent = 'No data available yet';
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    statusElement.textContent = 'Error fetching data';
  }
}

// Update the stats display
function updateDataStats() {
  if (accelData.length === 0) {
    dataStatsElement.innerHTML = '<div>No accelerometer data available yet.</div>';
    return;
  }
  
  const avgMagnitude = accelData.reduce((sum, val) => sum + val, 0) / accelData.length;
  const maxMagnitude = Math.max(...accelData);
  const minMagnitude = Math.min(...accelData);
  
  dataStatsElement.innerHTML = `
    <div><strong>Data points:</strong> ${accelData.length}</div>
    <div><strong>Average magnitude:</strong> ${avgMagnitude.toFixed(2)}</div>
    <div><strong>Max magnitude:</strong> ${maxMagnitude.toFixed(2)}</div>
    <div><strong>Min magnitude:</strong> ${minMagnitude.toFixed(2)}</div>
    <div><strong>Last updated:</strong> ${new Date().toLocaleTimeString()}</div>
  `;
}

// Generate and play music from the latest data
async function generateAndPlayMusic() {
  if (accelData.length === 0) {
    statusElement.textContent = 'No data available to generate music';
    return;
  }
  
  playMusicButton.disabled = true;
  statusElement.textContent = 'Generating music...';
  
  try {
    // Request the server to generate music from the latest data
    const response = await fetch(`${BASE_URL}/api/music`);
    const result = await response.json();
    
    if (result.status === 'success' && result.sequence) {
      // Play the music with Tone.js
      await playMusic(result.sequence, result.avgMagnitude);
      statusElement.textContent = 'Playing music';
    } else {
      statusElement.textContent = 'Failed to generate music';
    }
  } catch (error) {
    console.error('Error generating music:', error);
    statusElement.textContent = 'Error generating music';
  } finally {
    playMusicButton.disabled = false;
  }
}

// Play the generated music sequence
async function playMusic(sequence, avgMagnitude) {
  // Make sure Tone.js is started (required by browsers)
  await Tone.start();
  
  // Stop any currently playing music
  stopMusic();
  
  // Create a synth based on the average magnitude of the data
  const synth = createSynth(avgMagnitude);
  
  // Calculate the tempo based on average magnitude (60-160 BPM)
  const tempo = 60 + ((avgMagnitude - 0.5) / 1.5) * 100;
  Tone.Transport.bpm.value = tempo;
  
  // Create a sequence player
  const midiPart = new Tone.Part((time, note) => {
    synth.triggerAttackRelease(
      Tone.Frequency(note.pitch, "midi").toNote(), 
      note.duration, 
      time, 
      note.velocity
    );
  }, sequence.notes.map(note => {
    return {
      time: note.quantizedStartStep * (60 / tempo / 4),
      pitch: note.pitch,
      duration: ((note.quantizedEndStep - note.quantizedStartStep) * (60 / tempo / 4)),
      velocity: 0.8
    };
  }));
  
  // Start playing
  midiPart.start(0);
  Tone.Transport.start();
  
  // Store the current player for stopping later
  currentPlayer = {
    synth,
    midiPart
  };
  
  // Update the player display
  musicPlayerElement.innerHTML = `
    <div>
      <strong>Now playing</strong><br>
      Tempo: ${Math.round(tempo)} BPM<br>
      Notes: ${sequence.notes.length}<br>
      Based on ${accelData.length} data points
    </div>
  `;
}

// Create a synthesizer with parameters based on accelerometer data
function createSynth(avgMagnitude) {
  let oscillatorType = 'sine';
  let attack = 0.2;
  let release = 1.5;
  
  // Map the magnitude to synth parameters
  if (avgMagnitude < 1.0) {
    oscillatorType = 'sine'; // Soft sine wave
    attack = 0.2;
    release = 1.5;
  } else if (avgMagnitude < 1.5) {
    oscillatorType = 'triangle'; // Medium brightness
    attack = 0.1;
    release = 1.2;
  } else {
    oscillatorType = 'square'; // Bright, more intense sound
    attack = 0.05;
    release = 0.8;
  }
  
  // Create and configure the synth
  const synth = new Tone.PolySynth(Tone.Synth).toDestination();
  synth.set({
    oscillator: {
      type: oscillatorType
    },
    envelope: {
      attack: attack,
      decay: 0.3,
      sustain: 0.7,
      release: release
    }
  });
  
  return synth;
}

// Stop the currently playing music
function stopMusic() {
  if (currentPlayer) {
    currentPlayer.midiPart.stop();
    currentPlayer.synth.dispose();
    Tone.Transport.stop();
    currentPlayer = null;
    musicPlayerElement.innerHTML = '<div>Music stopped</div>';
    statusElement.textContent = 'Ready';
  }
}

// Set up automatic data refresh every 10 seconds
setInterval(fetchLatestData, 10000);