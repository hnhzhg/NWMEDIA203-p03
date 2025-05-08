from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS, cross_origin
import sys
import requests
import json
import numpy as np
import pygame
import math
import time
import threading
import os
from collections import deque


app = Flask(__name__, static_folder='static')
CORS(app, resources={r"/*": {"origins": "*"}})


NODE_SERVER_URL = "http://localhost:3000/webhook"


pygame.mixer.init(frequency=44100, size=-16, channels=1)


MIN_FREQ = 130.81  # C3
MAX_FREQ = 1046.50  # C6
MIN_VOLUME = 0.1
MAX_VOLUME = 1.0
NOTE_DURATION = 0.2  # seconds


MAX_HISTORY = 100
history = deque(maxlen=MAX_HISTORY)
is_recording = False
recording_data = []
current_note = {"frequency": 0, "volume": 0, "magnitude": 0}


C_MAJOR_SCALE = [
    261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25
]


def get_note_from_magnitude(magnitude):
    normalized = min(max(magnitude, 0), 1.5) / 1.5
    index = min(int(normalized * len(C_MAJOR_SCALE)), len(C_MAJOR_SCALE) - 1)
    return C_MAJOR_SCALE[index]


def play_tone(magnitude):
    global current_note
    normalized_mag = min(max(magnitude, 0), 1.5) / 1.5
    frequency = get_note_from_magnitude(magnitude)
    volume = MIN_VOLUME + normalized_mag * (MAX_VOLUME - MIN_VOLUME)


    current_note = {
        "frequency": frequency,
        "volume": volume,
        "magnitude": magnitude
    }


    sample_rate = 44100
    samples = int(NOTE_DURATION * sample_rate)
    buf = np.zeros(samples, dtype=np.int16)


    for i in range(samples):
        t = i / sample_rate
        buf[i] = int(32767 * volume * math.sin(2 * math.pi * frequency * t))


    sound = pygame.sndarray.make_sound(buf)
    sound.play()
    time.sleep(NOTE_DURATION)


def record_sequence(duration=20):
    global is_recording, recording_data
    is_recording = True
    recording_data = []
    print(f"Starting music recording for {duration} seconds")
    start_time = time.time()
    while time.time() - start_time < duration and is_recording:
        time.sleep(0.1)
        if current_note["frequency"] > 0:
            recording_data.append({
                "timestamp": time.time() - start_time,
                "magnitude": current_note["magnitude"],
                "frequency": current_note["frequency"],
                "volume": current_note["volume"]
            })
    print(f"Completed music recording with {len(recording_data)} notes")
    is_recording = False
    return {"status": "completed", "length": len(recording_data)}


@app.route('/')
def index():
    return send_from_directory('static', 'index.html')


@app.route('/webhook', methods=['POST', 'OPTIONS'])
@cross_origin(origin="*", methods=['POST', 'OPTIONS'])
def webhook():
    if request.method == 'OPTIONS':
        return '', 200


    try:
        data = request.get_json(force=True)
        print("Received raw data:", json.dumps(data, indent=2))


        accel = {}
        for entry in data.get("values", []):
            name = entry.get("name", "")
            if name in ("Accelerometer_X", "Accelerometer_Y", "Accelerometer_Z"):
                mapped_name = name.replace("Accelerometer_", "accel_")
                accel[mapped_name] = entry.get("value")
            elif name in ("accel_X", "accel_Y", "accel_Z"):
                accel[name] = entry.get("value")


        if accel:
            x = accel.get('accel_X', 0)
            y = accel.get('accel_Y', 0)
            z = accel.get('accel_Z', 0)


            if len(history) > 0:
                last_data = history[-1]
                x = x if x is not None else last_data.get('x', 0)
                y = y if y is not None else last_data.get('y', 0)
                z = z if z is not None else last_data.get('z', 0)


            x = float(x)
            y = float(y)
            z = float(z)


            print(f"Processed → X: {x}, Y: {y}, Z: {z}")
            sys.stdout.flush()


            magnitude = math.sqrt(x**2 + y**2 + z**2)


            history.append({
                "timestamp": time.time(),
                "x": x,
                "y": y,
                "z": z,
                "magnitude": magnitude
            })


            if is_recording:
                threading.Thread(target=play_tone, args=(magnitude,)).start()


            try:
                headers = {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
                response = requests.post(NODE_SERVER_URL, json=data, headers=headers)
                print(f"Node.js server response status: {response.status_code}")
            except Exception as e:
                print(f"Error forwarding to Node.js server: {str(e)}")
        else:
            print("No accelerometer data found in request")


        return jsonify({"status": "received"}), 200
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return jsonify({"status": "error", "message": str(e)}), 400


@app.route('/api/data', methods=['GET'])
def get_data():
    return jsonify(list(history))


@app.route('/api/current-note', methods=['GET'])
def get_current_note():
    return jsonify(current_note)


@app.route('/api/play', methods=['POST'])
def start_recording():
    try:
        data = request.get_json(force=True)
        duration = data.get("duration", 20)
        threading.Thread(target=record_sequence, args=(duration,)).start()
        return jsonify({"status": "started", "duration": duration})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400


@app.route('/api/stop', methods=['POST'])
def stop_recording():
    global is_recording
    is_recording = False
    return jsonify({"status": "stopped"})


@app.route('/api/recording', methods=['GET'])
def get_recording():
    return jsonify(recording_data)


if __name__ == "__main__":
    os.makedirs('static', exist_ok=True)
    print("\nStarting Flask server on port 5001…")
    print(f"Will forward data to Node.js server at {NODE_SERVER_URL}")
    app.run(host="0.0.0.0", port=5001, debug=True, threaded=True)





