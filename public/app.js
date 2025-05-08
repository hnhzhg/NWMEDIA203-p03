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

