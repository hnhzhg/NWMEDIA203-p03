from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import sys
import requests
app = Flask(__name__)
# Allow any origin to POST to /webhook
CORS(app, resources={r"/webhook": {"origins": "*"}})

@app.route('/webhook', methods=['POST', 'GET'])
@cross_origin(origin="*")
def webhook():
    if request.method == 'GET':
        return jsonify({"message": "Webhook endpoint is live. Use POST to send data."}), 200
    print("Raw data:", request.data)
    try:
        data = request.get_json(force=True)
    except Exception as e:
        print("Invalid JSON:", e)

        return jsonify({"error": "Invalid JSON"}), 400
    data = request.get_json(force=True)
    NODE_SERVER_URL = "http://localhost:3000/webhook"
    # Extract and print only the Accelerometer_X/Y/Z values
    accel = {}
    for entry in data.get("values", []):
        name = entry.get("name", "")
        if name in ("Accelerometer_X", "Accelerometer_Y", "Accelerometer_Z"):
            accel[name] = entry.get("value")
    if accel:
        # Real‑time print
        print(f"Received → X: {accel.get('Accelerometer_X')}, "
              f"Y: {accel.get('Accelerometer_Y')}, "
              f"Z: {accel.get('Accelerometer_Z')}")
        sys.stdout.flush()
        # Forward data to Node.js server
        try:
            headers = {'Content-Type': 'application/json'}
            requests.post(NODE_SERVER_URL, json=data, headers=headers)
        except Exception as e:
            print("Error forwarding:", e)
    return jsonify({"status":"received"}), 200

if __name__ == "__main__":
    print("Starting Flask server on port 5001…")
    app.run(host="0.0.0.0", port=5001, debug=False)

# from flask import Flask, request, jsonify
# from flask_cors import CORS, cross_origin
# import sys
# import requests
# import json

# app = Flask(__name__)
# # Allow any origin to POST to /webhook
# CORS(app, resources={r"/*": {"origins": "*"}})

# # Node.js server URL
# NODE_SERVER_URL = "http://localhost:3000/webhook"

# @app.route('/webhook', methods=['POST', 'OPTIONS'])
# @cross_origin(origin="*", methods=['POST', 'OPTIONS'])
# def webhook():
#     if request.method == 'OPTIONS':
#         return '', 200
        
#     try:
#         data = request.get_json(force=True)
#         print("Received raw data:", json.dumps(data, indent=2))
        
#         # Extract and print only the Accelerometer_X/Y/Z values
#         accel = {}
#         for entry in data.get("values", []):
#             name = entry.get("name", "")
#             if name in ("Accelerometer_X", "Accelerometer_Y", "Accelerometer_Z"):
#                 accel[name] = entry.get("value")
        
#         if accel:
#             # Real‑time print
#             print(f"Received → X: {accel.get('Accelerometer_X')}, "
#                   f"Y: {accel.get('Accelerometer_Y')}, "
#                   f"Z: {accel.get('Accelerometer_Z')}")
#             sys.stdout.flush()
            
#             # Forward data to Node.js server
#             try:
#                 headers = {
#                     'Content-Type': 'application/json',
#                     'Access-Control-Allow-Origin': '*'
#                 }
#                 print(f"Forwarding to Node.js server at {NODE_SERVER_URL}")
#                 response = requests.post(NODE_SERVER_URL, json=data, headers=headers)
#                 print(f"Node.js server response status: {response.status_code}")
#                 print(f"Node.js server response: {response.text}")
#             except Exception as e:
#                 print(f"Error forwarding to Node.js server: {str(e)}")
#                 return jsonify({"status": "error", "message": str(e)}), 500
#         else:
#             print("No accelerometer data found in request")
            
#         return jsonify({"status": "received"}), 200
#     except Exception as e:
#         print(f"Error processing request: {str(e)}")
#         return jsonify({"status": "error", "message": str(e)}), 400

# if __name__ == "__main__":
#     print("Starting Flask server on port 5001…")
#     print(f"Will forward data to Node.js server at {NODE_SERVER_URL}")
#     app.run(host="0.0.0.0", port=5001, debug=True)





# from flask import Flask, request, jsonify
# from flask_cors import CORS, cross_origin
# import sys
# import requests
# import json

# app = Flask(__name__)
# CORS(app, resources={r"/*": {"origins": "*"}})

# NODE_SERVER_URL = "http://localhost:3000/webhook"
# latest_data = {
#     "rawData": [],
#     "processedData": {}
# }

# # Process raw accelerometer values into magnitude
# def process_accel_data(accel):
#     try:
#         x = float(accel.get("Accelerometer_X", 0))
#         y = float(accel.get("Accelerometer_Y", 0))
#         z = float(accel.get("Accelerometer_Z", 0))
#         magnitude = (x**2 + y**2 + z**2) ** 0.5
#         return magnitude
#     except Exception:
#         return 0

# @app.route('/webhook', methods=['POST', 'OPTIONS'])
# @cross_origin(origin="*", methods=['POST', 'OPTIONS'])
# def webhook():
#     global latest_data

#     if request.method == 'OPTIONS':
#         return '', 200

#     try:
#         data = request.get_json(force=True)
#         accel = {}

#         for entry in data.get("values", []):
#             name = entry.get("name", "")
#             if name in ("Accelerometer_X", "Accelerometer_Y", "Accelerometer_Z"):
#                 accel[name] = entry.get("value")

#         if accel:
#             magnitude = process_accel_data(accel)
#             latest_data["rawData"].append(magnitude)
#             latest_data["rawData"] = latest_data["rawData"][-100:]  # Keep last 100

#             # Basic stats
#             avg = sum(latest_data["rawData"]) / len(latest_data["rawData"])
#             latest_data["processedData"] = {
#                 "stats": {
#                     "average": avg,
#                     "maximum": max(latest_data["rawData"]),
#                     "variability": max(latest_data["rawData"]) - min(latest_data["rawData"]),
#                     "patterns": {
#                         "type": "regular" if avg < 1.0 else "spiky" if avg > 1.5 else "medium"
#                     }
#                 },
#                 "data": latest_data["rawData"]
#             }

#             # Forward to Node.js
#             try:
#                 headers = {'Content-Type': 'application/json'}
#                 requests.post(NODE_SERVER_URL, json=data, headers=headers)
#             except Exception as e:
#                 print("Error forwarding:", e)

#         return jsonify({"status": "received"}), 200

#     except Exception as e:
#         return jsonify({"status": "error", "message": str(e)}), 400


# @app.route('/api/data', methods=['GET'])
# def get_latest_data():
#     return jsonify(latest_data)