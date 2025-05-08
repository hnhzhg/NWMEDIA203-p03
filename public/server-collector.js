// data-collector.js - Add this file to collect accelerometer data from devices

// Configuration
const SAMPLE_RATE = 20; // Hz (samples per second)
const BUFFER_SIZE = 50; // Number of samples to collect before sending
const SERVER_URL = window.location.origin; // Use same origin as the page

// Data buffers
let xBuffer = [];
let yBuffer = [];
let zBuffer = [];
let isCollecting = false;
let sensorPermissionGranted = false;

// DOM elements
let collectButton;
let statusElement;

document.addEventListener('DOMContentLoaded', () => {
  // Add UI elements for data collection
  createCollectorUI();
  
  // Check for sensor availability
  if ('DeviceMotionEvent' in window) {
    // Initialize the collector system
    initializeCollector();
  } else {
    updateCollectorStatus('Accelerometer not available on this device');
  }
});

// Create UI for accelerometer data collection
function createCollectorUI() {
  // Create container
  const container = document.createElement('div');
  container.className = 'card accent';
  container.innerHTML = `
    <h2>Accelerometer Data Collection</h2>
    <div id="collectorStatus">Waiting to start...</div>
    
    <div class="btn-group" style="margin-top: 15px;">
      <button id="startCollection" class="accent-btn">Start Collection</button>
      <button id="stopCollection" class="accent-btn" disabled>Stop Collection</button>
    </div>
    
    <div class="collector-info" style="margin-top: 15px; font-size: 14px;">
      <div>Collecting at <strong>${SAMPLE_RATE}Hz</strong> (${SAMPLE_RATE} samples per second)</div>
      <div>Buffer size: <strong>${BUFFER_SIZE}</strong> samples</div>
      <div>Data will be sent automatically every <strong>${BUFFER_SIZE/SAMPLE_RATE}</strong> seconds</div>
    </div>
    
    <div id="liveVisualization" class="live-visualization">
      <div class="live-axis">
        <div class="axis-label">X</div>
        <div class="live-bar" id="liveBarX"></div>
        <div class="value" id="valueX">0.00</div>
      </div>
      <div class="live-axis">
        <div class="axis-label">Y</div>
        <div class="live-bar" id="liveBarY"></div>
        <div class="value" id="valueY">0.00</div>
      </div>
      <div class="live-axis">
        <div class="axis-label">Z</div>
        <div class="live-bar" id="liveBarZ"></div>
        <div class="value" id="valueZ">0.00</div>
      </div>
    </div>
  `;
  
  // Add custom styling
  const style = document.createElement('style');
  style.textContent = `
    .accent-btn {
      background-color: #9c64ff;
      color: white;
      border: none;
      border-radius: 12px;
      padding: 12px 20px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-right: 10px;
    }
    
    .accent-btn:hover {
      transform: translateY(-2px);
      opacity: 0.9;
    }
    
    .accent-btn:disabled {
      background-color: #e2e5e9;
      color: #a8adb3;
      cursor: not-allowed;
      transform: none;
    }
    
    #collectorStatus {
      background-color: white;
      border-radius: 12px;
      padding: 15px;
      margin: 10px 0;
      font-size: 14px;
      color: #6c757d;
    }
    
    .live-visualization {
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin-top: 20px;
      background-color: rgba(255, 255, 255, 0.7);
      padding: 15px;
      border-radius: 12px;
    }
    
    .live-axis {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .axis-label {
      font-weight: bold;
      width: 20px;
      text-align: center;
    }
    
    .live-bar {
      flex-grow: 1;
      height: 20px;
      background-color: #e2e5e9;
      border-radius: 10px;
      overflow: hidden;
      position: relative;
    }
    
    .live-bar::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 0%;
      border-radius: 10px;
      transition: width 0.3s ease-out;
    }
    
    #liveBarX::after {
      background-color: #FF5252;
    }
    
    #liveBarY::after {
      background-color: #4CAF50;
    }
    
    #liveBarZ::after {
      background-color: #448AFF;
    }
    
    .value {
      width: 50px;
      text-align: right;
      font-family: monospace;
      font-weight: bold;
    }
  `;
  document.head.appendChild(style);
  
  // Insert UI into the page (after the header)
  const headerElement = document.querySelector('.header');
  if (headerElement && headerElement.nextElementSibling) {
    headerElement.nextElementSibling.insertBefore(container, headerElement.nextElementSibling.firstChild);
  } else {
    document.body.insertBefore(container, document.body.firstChild);
  }
  
  // Get references to elements
  collectButton = document.getElementById('startCollection');
  stopButton = document.getElementById('stopCollection');
  statusElement = document.getElementById('collectorStatus');
  
  // Set up event listeners
  collectButton.addEventListener('click', startDataCollection);
  stopButton.addEventListener('click', stopDataCollection);
}

// Initialize the accelerometer data collector
function initializeCollector() {
  // Check if permission is needed (iOS 13+)
  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    updateCollectorStatus('Permission required to access device motion');
    
    // We need to request permission when user interacts
    collectButton.addEventListener('click', async (e) => {
      e.preventDefault();
      
      try {
        const permissionState = await DeviceMotionEvent.requestPermission();
        if (permissionState === 'granted') {
          sensorPermissionGranted = true;
          startDataCollection();
        } else {
          updateCollectorStatus('Permission denied for accelerometer access');
        }
      } catch (error) {
        console.error('Error requesting device motion permission:', error);
        updateCollectorStatus('Error requesting permission: ' + error.message);
      }
    });
  } else {
    // Permission not required (non-iOS or older iOS)
    sensorPermissionGranted = true;
  }
}

// Start collecting accelerometer data
function startDataCollection() {
  if (!sensorPermissionGranted && typeof DeviceMotionEvent.requestPermission === 'function') {
    // Need to request permission first
    return;
  }
  
  // Clear any existing data
  xBuffer = [];
  yBuffer = [];
  zBuffer = [];
  
  // Update UI
  collectButton.disabled = true;
  stopButton.disabled = false;
  updateCollectorStatus('Starting data collection...');
  
  // Set up data collection interval
  isCollecting = true;
  
  // Set up the device motion event listener
  window.addEventListener('devicemotion', handleMotionEvent);
  
  // Set up interval to send data periodically
  sendDataInterval = setInterval(() => {
    if (xBuffer.length >= BUFFER_SIZE) {
      sendAccelerometerData();
    }
  }, (BUFFER_SIZE / SAMPLE_RATE) * 1000); // Convert to milliseconds
  
  // Also set up local visualization updates
  visualizeInterval = setInterval(() => {
    if (xBuffer.length > 0) {
      updateLocalVisualization();
    }
  }, 500); // Update visualization twice per second
  
  updateCollectorStatus('Collecting accelerometer data...');
}

// Handle device motion events
function handleMotionEvent(event) {
  if (!isCollecting) return;
  
  // Get accelerometer data
  const x = event.accelerationIncludingGravity?.x || 0;
  const y = event.accelerationIncludingGravity?.y || 0;
  const z = event.accelerationIncludingGravity?.z || 0;
  
  // Add to buffers
  xBuffer.push(Math.abs(x));
  yBuffer.push(Math.abs(y));
  zBuffer.push(Math.abs(z));
  
  // Limit buffer size
  if (xBuffer.length > BUFFER_SIZE * 1.5) {
    // Keep buffer at 1.5x the target size to avoid frequent trims
    xBuffer = xBuffer.slice(-BUFFER_SIZE);
    yBuffer = yBuffer.slice(-BUFFER_SIZE);
    zBuffer = zBuffer.slice(-BUFFER_SIZE);
  }
  
  // Update status occasionally
  if (xBuffer.length % 10 === 0) {
    updateCollectorStatus(`Collecting data... (${xBuffer.length}/${BUFFER_SIZE} samples)`);
  }
}