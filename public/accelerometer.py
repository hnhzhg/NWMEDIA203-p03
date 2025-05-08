from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import sys
import requests
import json
import numpy as np
import pygame
import math
import time
from threading import Thread

app = Flask(__name__)
# Allow any origin to POST to /webhook
CORS(app, resources={r"/*": {"origins": "*"}})

# Node.js server URL
NODE_SERVER_URL = "http://localhost:3000/webhook"

# Initialize pygame mixer for sound
pygame.mixer.init(frequency=44100, size=-16, channels=1)

# Define musical parameters
MIN_FREQ = 130.81  # C3
MAX_FREQ = 1046.50  # C6
MIN_VOLUME = 0.1
MAX_VOLUME = 1.0
NOTE_DURATION = 0.2  # seconds

# Function to generate and play a tone based on accelerometer data
def play_tone(magnitude):
    # Map magnitude to frequency (logarithmic scale feels more musical)
    # Assuming magnitude is between 0 and 20 (adjust as needed)
    normalized_mag = min(max(magnitude, 0), 20) / 20.0
    
    # Calculate frequency using logarithmic mapping (feels more musical)
    frequency = MIN_FREQ * math.pow(MAX_FREQ/MIN_FREQ, normalized_mag)
    
    # Calculate volume
    volume = MIN_VOLUME + normalized_mag * (MAX_VOLUME - MIN_VOLUME)
    
    # Generate a sine wave
    sample_rate = 44100
    samples = int(NOTE_DURATION * sample_rate)
    buf = np.zeros(samples, dtype=np.int16)
    
    for i in range(samples):
        t = i / sample_rate
        buf[i] = int(32767 * volume * math.sin(2 * math.pi * frequency * t))
    
    # Play the sound
    sound = pygame.sndarray.make_sound(buf)
    sound.play()
    time.sleep(NOTE_DURATION)  # Let it play

@app.route('/webhook', methods=['POST', 'OPTIONS'])
@cross_origin(origin="*", methods=['POST', 'OPTIONS'])
def webhook():
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.get_json(force=True)
        print("Received raw data:", json.dumps(data, indent=2))
        
        # Extract and print only the Accelerometer_X/Y/Z values
        accel = {}
        for entry in data.get("values", []):
            name = entry.get("name", "")
            if name in ("Accelerometer_X", "Accelerometer_Y", "Accelerometer_Z"):
                accel[name] = entry.get("value")
        
        if accel:
            # Real-time print
            x = accel.get('Accelerometer_X', 0)
            y = accel.get('Accelerometer_Y', 0)
            z = accel.get('Accelerometer_Z', 0)
            
            print(f"Received → X: {x}, Y: {y}, Z: {z}")
            sys.stdout.flush()
            
            # Calculate magnitude of acceleration
            magnitude = math.sqrt(x**2 + y**2 + z**2)
            print(f"Magnitude: {magnitude}")
            
            # Play tone in a separate thread to avoid blocking
            Thread(target=play_tone, args=(magnitude,)).start()
            
            # Forward data to Node.js server
            try:
                headers = {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
                print(f"Forwarding to Node.js server at {NODE_SERVER_URL}")
                response = requests.post(NODE_SERVER_URL, json=data, headers=headers)
                print(f"Node.js server response status: {response.status_code}")
                print(f"Node.js server response: {response.text}")
            except Exception as e:
                print(f"Error forwarding to Node.js server: {str(e)}")
                return jsonify({"status": "error", "message": str(e)}), 500
        else:
            print("No accelerometer data found in request")
            
        return jsonify({"status": "received"}), 200
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 400

if __name__ == "__main__":
    print("Starting Flask server on port 5001...")
    print(f"Will forward data to Node.js server at {NODE_SERVER_URL}")
    print("Sound system initialized. Ready to convert accelerometer data to music!")
    app.run(host="0.0.0.0", port=5001, debug=True)

