// Constants
const API_BASE = '';
const UPDATE_INTERVAL = 200; // ms
const MAX_DATA_POINTS = 50;


// State
let isPlaying = false;
let chart;
let dataHistory = [];
let currentNote = { frequency: 0, volume: 0, magnitude: 0 };


// DOM elements
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const statusElement = document.getElementById('status');
const noteInfoElement = document.getElementById('noteInfo');
const pianoElement = document.getElementById('piano');


// Initialize the application
function init() {
   // Set up event listeners
   playBtn.addEventListener('click', startPlaying);
   stopBtn.addEventListener('click', stopPlaying);
  
   // Initialize the chart
   initChart();
  
   // Create piano keys
   createPianoKeys();
  
   // Start data polling
   pollData();
}


// Initialize the chart
function initChart() {
   const ctx = document.createElement('canvas');
   document.getElementById('accelChart').appendChild(ctx);
  
   chart = new Chart(ctx, {
       type: 'line',
       data: {
           labels: Array(MAX_DATA_POINTS).fill(''),
           datasets: [
               {
                   label: 'X',
                   data: Array(MAX_DATA_POINTS).fill(null),
                   borderColor: 'rgba(255, 99, 132, 1)',
                   backgroundColor: 'rgba(255, 99, 132, 0.2)',
                   tension: 0.4
               },
               {
                   label: 'Y',
                   data: Array(MAX_DATA_POINTS).fill(null),
                   borderColor: 'rgba(54, 162, 235, 1)',
                   backgroundColor: 'rgba(54, 162, 235, 0.2)',
                   tension: 0.4
               },
               {
                   label: 'Z',
                   data: Array(MAX_DATA_POINTS).fill(null),
                   borderColor: 'rgba(255, 206, 86, 1)',
                   backgroundColor: 'rgba(255, 206, 86, 0.2)',
                   tension: 0.4
               },
               {
                   label: 'Magnitude',
                   data: Array(MAX_DATA_POINTS).fill(null),
                   borderColor: 'rgba(75, 192, 192, 1)',
                   backgroundColor: 'rgba(75, 192, 192, 0.2)',
                   borderWidth: 2,
                   tension: 0.4
               }
           ]
       },
       options: {
           responsive: true,
           maintainAspectRatio: false,
           scales: {
               y: {
                   beginAtZero: false,
                   suggestedMin: -1.5,
                   suggestedMax: 1.5
               }
           },
           animation: {
               duration: 0
           }
       }
   });
}


// Create piano keys
function createPianoKeys() {
   // C major scale: C, D, E, F, G, A, B, C
   const noteNames = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
   const frequencies = [
       261.63,  // C4
       293.66,  // D4
       329.63,  // E4
       349.23,  // F4
       392.00,  // G4
       440.00,  // A4
       493.88,  // B4
       523.25,  // C5
   ];
  
   // Add white keys
   for (let i = 0; i < noteNames.length; i++) {
       const key = document.createElement('div');
       key.className = 'piano-key';
       key.dataset.note = noteNames[i];
       key.dataset.frequency = frequencies[i];
      
       // Add note label
       const label = document.createElement('div');
       label.textContent = noteNames[i];
       label.style.fontSize = '10px';
       label.style.position = 'absolute';
       label.style.bottom = '5px';
       label.style.left = '50%';
       label.style.transform = 'translateX(-50%)';
       key.appendChild(label);
      
       pianoElement.appendChild(key);
   }
}


// Poll data from the server
function pollData() {
   // Get accelerometer data
   fetch(`${API_BASE}/api/data`)
       .then(response => response.json())
       .then(data => {
           dataHistory = data;
           updateChart();
       })
       .catch(error => console.error('Error fetching data:', error));
  
   // Get current note
   fetch(`${API_BASE}/api/current-note`)
       .then(response => response.json())
       .then(note => {
           currentNote = note;
           updateNoteDisplay();
       })
       .catch(error => console.error('Error fetching note:', error));
  
   // Schedule next update
   setTimeout(pollData, UPDATE_INTERVAL);
}


// Update the chart with latest data
function updateChart() {
   if (dataHistory.length === 0) return;
  
   // Get last N data points
   const data = dataHistory.slice(-MAX_DATA_POINTS);
  
   // Update labels (timestamps)
   const labels = data.map((_, i) => i.toString());
   chart.data.labels = labels;
  
   // Update datasets
   chart.data.datasets[0].data = data.map(d => d.x);
   chart.data.datasets[1].data = data.map(d => d.y);
   chart.data.datasets[2].data = data.map(d => d.z);
   chart.data.datasets[3].data = data.map(d => d.magnitude);
  
   // Update chart
   chart.update();
}


// Update the note display
function updateNoteDisplay() {
   if (currentNote.frequency === 0) {
       noteInfoElement.textContent = 'No note playing';
       // Reset piano keys
       document.querySelectorAll('.piano-key').forEach(key => {
           key.classList.remove('active');
       });
       return;
   }
  
   // Find the nearest note
   const frequencies = [
       261.63,  // C4
       293.66,  // D4
       329.63,  // E4
       349.23,  // F4
       392.00,  // G4
       440.00,  // A4
       493.88,  // B4
       523.25,  // C5
   ];
  
   const noteNames = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
  
   // Find the closest frequency
   let closestIndex = 0;
   let minDiff = Math.abs(frequencies[0] - currentNote.frequency);
  
   for (let i = 1; i < frequencies.length; i++) {
       const diff = Math.abs(frequencies[i] - currentNote.frequency);
       if (diff < minDiff) {
           minDiff = diff;
           closestIndex = i;
       }
   }
  
   // Update note info
   noteInfoElement.textContent = `Playing: ${noteNames[closestIndex]} (${currentNote.frequency.toFixed(2)} Hz) - Volume: ${(currentNote.volume * 100).toFixed(0)}%`;
  
   // Update piano keys
   document.querySelectorAll('.piano-key').forEach((key, index) => {
       if (index === closestIndex) {
           key.classList.add('active');
       } else {
           key.classList.remove('active');
       }
   });
}


// Start playing music
function startPlaying() {
   if (isPlaying) return;
  
   isPlaying = true;
   statusElement.textContent = 'Generating music (20 seconds)...';
   playBtn.disabled = true;
   stopBtn.disabled = false;
  
   fetch(`${API_BASE}/api/play`, {
       method: 'POST',
       headers: {
           'Content-Type': 'application/json'
       },
       body: JSON.stringify({ duration: 20 })
   })
       .then(response => response.json())
       .then(data => {
           console.log('Play response:', data);
       })
       .catch(error => {
           console.error('Error starting playback:', error);
           stopPlaying();
       });
  
   // Auto-stop after 21 seconds (should be completed by then)
   setTimeout(() => {
       if (isPlaying) {
           stopPlaying();
       }
   }, 21000);
}


// Stop playing music
function stopPlaying() {
   if (!isPlaying) return;
  
   fetch(`${API_BASE}/api/stop`, {
       method: 'POST'
   })
       .then(response => response.json())
       .then(data => {
           console.log('Stop response:', data);
       })
       .catch(error => console.error('Error stopping playback:', error));
  
   isPlaying = false;
   statusElement.textContent = 'Ready';
   playBtn.disabled = false;
   stopBtn.disabled = true;
}


// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', init);
