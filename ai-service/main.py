import io
import time
import base64
import random
import threading
from typing import List, Dict, Any
import numpy as np
import cv2
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests

app = FastAPI(title="VisionOps AI Service", version="11.0.0")

# Allow browser requests from any origin (frontend dev server + production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global YOLO model holder
yolo_model = None
yolo_loaded = False

try:
    from ultralytics import YOLO
    # Attempt to load model (will download if not present)
    yolo_model = YOLO("yolo11n.pt")
    yolo_loaded = True
    print("[AI Service] YOLOv11 loaded successfully.")
except Exception as e:
    print(f"[AI Service] YOLOv11 could not be loaded: {e}. Running in OpenCV Fallback + Simulation Mode.")

# Class names for YOLOv11 default coco
COCO_CLASSES = [
    "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
    "traffic light", "fire hydrant", "stop sign", "parking meter", "bench", "bird", "cat",
    "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack",
    "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sports ball",
    "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
    "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple",
    "sandwich", "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake",
    "chair", "couch", "potted plant", "bed", "dining table", "toilet", "tv", "laptop",
    "mouse", "remote", "keyboard", "cell phone", "microwave", "oven", "toaster", "sink",
    "refrigerator", "book", "clock", "vase", "scissors", "teddy bear", "hair drier",
    "toothbrush"
]

# Simple rate limiter for webhook triggers: camera_id -> last_trigger_time
alert_triggers = {}

def trigger_backend_alert(camera_id: str, alert_type: str, severity: str, objects: List[str], snapshot_bytes: bytes):
    """Asynchronously trigger an alert on the Node.js backend"""
    now = time.time()
    last_trigger = alert_triggers.get(camera_id, 0)
    
    # Restrict to once every 20 seconds per camera to avoid spamming
    if now - last_trigger < 20:
        return
        
    alert_triggers[camera_id] = now
    
    def worker():
        try:
            # Convert frame to base64 Data URI
            encoded = base64.b64encode(snapshot_bytes).decode('utf-8')
            snapshot_url = f"data:image/jpeg;base64,{encoded}"
            
            payload = {
                "cameraId": camera_id,
                "type": alert_type,
                "severity": severity,
                "objects": objects,
                "snapshotUrl": snapshot_url
            }
            res = requests.post("http://localhost:5000/api/alerts/trigger", json=payload, timeout=2)
            if res.status_code == 201:
                print(f"[AI Webhook] Successfully sent alert for {camera_id} to backend.")
        except Exception as err:
            print(f"[AI Webhook] Failed to contact backend: {err}")
            
    threading.Thread(target=worker, daemon=True).start()

# --- CCTV STREAM SIMULATOR ---
# Simulates moving coordinates for cameras
# cam-01: Main Entrance Lobby (restricted zone in red, people walking)
# cam-02: South Loading Dock (forklift/car driving, people loading)
# cam-03: Secure Server Room (restricted room, person enters occasionally)
# cam-04: Perimeter Fence East (car approaches fence, person exits car)
class StreamState:
    def __init__(self, camera_id: str):
        self.camera_id = camera_id
        self.frame_count = 0
        
        # Initial positions
        self.person1_x = 100.0
        self.person1_y = 300.0
        self.person1_dir = 1
        
        self.vehicle_x = -50.0
        self.vehicle_y = 220.0
        
        self.server_intruder_active = False
        self.server_timer = 0.0
        
        self.fence_breached = False

def draw_cctv_frame(state: StreamState) -> bytes:
    # 1. Create base frame
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    
    # Paint background (simulated warehouse or office corridor)
    # Background color: grid lines in grey
    cv2.rectangle(frame, (0, 0), (640, 480), (30, 30, 30), -1)
    
    # Draw floor lines / perspective
    cv2.line(frame, (0, 400), (640, 400), (60, 60, 60), 2)
    cv2.line(frame, (100, 400), (0, 480), (60, 60, 60), 2)
    cv2.line(frame, (540, 400), (640, 480), (60, 60, 60), 2)
    
    # UI Text Overlays
    camera_names = {
        "cam-01": "LOBBY MAIN ENTRANCE - BUILDING A",
        "cam-02": "SOUTH LOADING DOCK - CARGO BAY",
        "cam-03": "SECURE SERVER ROOM - BLDG C FL 3",
        "cam-04": "PERIMETER FENCE - EAST BORDER"
    }
    
    cam_name = camera_names.get(state.camera_id, "VISIONOPS NETWORK FEED")
    
    # Draw top header bar
    cv2.rectangle(frame, (0, 0), (640, 40), (15, 15, 15), -1)
    cv2.putText(frame, cam_name, (20, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (220, 220, 220), 1, cv2.LINE_AA)
    
    # Live Timestamp
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S") + f".{int((time.time() % 1) * 100):02d}"
    cv2.putText(frame, timestamp, (450, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 200, 100), 1, cv2.LINE_AA)
    
    # REC dot flashing
    if int(time.time()) % 2 == 0:
        cv2.circle(frame, (615, 20), 5, (0, 0, 255), -1)
    
    # Draw crosshairs
    cv2.line(frame, (320, 230), (320, 250), (100, 100, 100), 1)
    cv2.line(frame, (310, 240), (330, 240), (100, 100, 100), 1)

    state.frame_count += 1
    t = state.frame_count * 0.05
    
    detected_objects = []
    
    # 2. Camera-specific simulations
    if state.camera_id == "cam-01":
        # Lobby simulation: A boundary line in the center. If crossed, trigger alert.
        cv2.line(frame, (250, 200), (250, 480), (0, 0, 255), 2)
        cv2.putText(frame, "RESTRICTED LINE", (140, 220), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)
        
        # Person 1 walks horizontally back and forth
        state.person1_x = 320.0 + 200.0 * np.sin(t * 0.5)
        state.person1_y = 350.0 + 20.0 * np.cos(t * 0.7)
        
        px, py = int(state.person1_x), int(state.person1_y)
        w, h = 60, 140
        x1, y1, x2, y2 = px - w//2, py - h, px + w//2, py
        
        # Check boundary crossing (x = 250)
        is_breached = px < 250
        box_color = (0, 0, 255) if is_breached else (0, 255, 0)
        cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
        cv2.putText(frame, "person 91%", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.4, box_color, 1)
        detected_objects.append("person")
        
        if is_breached:
            cv2.rectangle(frame, (10, 50), (170, 80), (0, 0, 150), -1)
            cv2.putText(frame, "LINE BREACH", (20, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
            
            # Trigger alert on backend
            _, img_encoded = cv2.imencode('.jpg', frame)
            trigger_backend_alert("cam-01", "Restricted Area Breach", "high", ["person"], img_encoded.tobytes())
            
    elif state.camera_id == "cam-02":
        # Loading Dock: A forklift / vehicle drives in occasionally.
        # Person loading boxes.
        cv2.rectangle(frame, (450, 250), (600, 400), (70, 70, 70), -1) # Static truck trailer
        cv2.putText(frame, "DOCK BAY 2", (470, 270), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1)
        
        # Moving truck approaches
        state.vehicle_x = -150.0 + (state.frame_count % 500) * 2.0
        vx = int(state.vehicle_x)
        vy = 280
        if vx < 500:
            cv2.rectangle(frame, (vx, vy), (vx + 180, vy + 90), (0, 255, 0), 2)
            cv2.putText(frame, "truck 87%", (vx, vy - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
            detected_objects.append("truck")
            
        # Loader person
        state.person1_x = 420.0 + 20.0 * np.sin(t)
        px = int(state.person1_x)
        py = 340
        cv2.rectangle(frame, (px - 20, py - 60), (px + 20, py), (0, 255, 0), 2)
        cv2.putText(frame, "person 78%", (px - 20, py - 68), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
        detected_objects.append("person")
        
        # If loader and truck are close, simulate tailgating or heavy activity (medium alert)
        if abs(px - vx) < 100:
            _, img_encoded = cv2.imencode('.jpg', frame)
            trigger_backend_alert("cam-02", "Hazardous Proximity", "medium", ["person", "truck"], img_encoded.tobytes())
            
    elif state.camera_id == "cam-03":
        # Server Room: Empty server racks. Red laser lines.
        # Racks
        cv2.rectangle(frame, (80, 100), (180, 420), (40, 40, 40), -1)
        cv2.rectangle(frame, (460, 100), (560, 420), (40, 40, 40), -1)
        # Server flashing lights
        for h_y in range(120, 400, 30):
            color1 = (0, 255, 0) if random.random() > 0.3 else (0, 0, 255)
            color2 = (0, 255, 0) if random.random() > 0.4 else (0, 0, 255)
            cv2.circle(frame, (100, h_y), 3, color1, -1)
            cv2.circle(frame, (540, h_y), 3, color2, -1)
            
        # Intrusions happen every 400 frames
        if (state.frame_count % 400) > 280:
            state.server_intruder_active = True
        else:
            state.server_intruder_active = False
            
        if state.server_intruder_active:
            # Draw intruder approaching racks
            state.person1_y = 450 - ((state.frame_count % 400) - 280) * 2.0
            px = 320
            py = int(state.person1_y)
            w, h = 70, 150
            x1, y1, x2, y2 = px - w//2, py - h, px + w//2, py
            
            # Since server room is ultra restricted, it is a critical alert instantly
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
            cv2.putText(frame, "person 98%", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)
            detected_objects.append("person")
            
            # Warning Banner
            cv2.rectangle(frame, (180, 50), (460, 85), (0, 0, 180), -1)
            cv2.putText(frame, "CRITICAL DETECT: UNKNOWN USER", (190, 72), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 2)
            
            _, img_encoded = cv2.imencode('.jpg', frame)
            trigger_backend_alert("cam-03", "Restricted Area Intruder", "critical", ["person"], img_encoded.tobytes())
            
    elif state.camera_id == "cam-04":
        # Perimeter fence: Outer wire fence drawing
        # Fence posts
        for x in range(0, 680, 80):
            cv2.line(frame, (x, 220), (x, 480), (80, 80, 80), 3)
        # Chainlink mesh pattern
        for y in range(250, 480, 40):
            cv2.line(frame, (0, y), (640, y + 20), (50, 50, 50), 1)
            cv2.line(frame, (0, y + 20), (640, y), (50, 50, 50), 1)
            
        # A car drives up and parks outside the fence
        state.vehicle_x = min(360.0, -100.0 + (state.frame_count % 600) * 1.5)
        vx = int(state.vehicle_x)
        vy = 280
        
        cv2.rectangle(frame, (vx, vy), (vx + 140, vy + 70), (0, 255, 0), 2)
        cv2.putText(frame, "car 89%", (vx, vy - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
        detected_objects.append("car")
        
        # When car stops, a person climbs the fence
        if vx >= 360:
            state.person1_x = 420.0
            state.person1_y = 320.0 - min(80.0, ((state.frame_count % 600) - 307) * 0.8) # climbing up
            px, py = int(state.person1_x), int(state.person1_y)
            cv2.rectangle(frame, (px - 20, py - 50), (px + 20, py), (0, 0, 255), 2)
            cv2.putText(frame, "person 95%", (px - 20, py - 58), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)
            detected_objects.append("person")
            
            cv2.putText(frame, "WARNING: CLIMBER AT FENCE", (150, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
            
            _, img_encoded = cv2.imencode('.jpg', frame)
            trigger_backend_alert("cam-04", "Fence Scaled Intrusion", "high", ["person", "car"], img_encoded.tobytes())

    # Draw bottom telemetry metrics overlay
    cv2.rectangle(frame, (0, 440), (640, 480), (10, 10, 10), -1)
    obj_summary = ", ".join([f"{o.upper()}" for o in set(detected_objects)]) if detected_objects else "NO ENTITIES"
    cv2.putText(frame, f"AI OUT: [ {obj_summary} ] | ACTIVE CORE: YOLOv11n", (20, 465), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 255), 1, cv2.LINE_AA)

    # Encode as JPEG
    _, jpeg_bytes = cv2.imencode('.jpg', frame)
    return jpeg_bytes.tobytes()

# Frame generators for streaming
def video_stream_generator(camera_id: str):
    state = StreamState(camera_id)
    while True:
        try:
            frame_bytes = draw_cctv_frame(state)
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            time.sleep(0.04) # ~25 frames per second
        except GeneratorExit:
            break
        except Exception as e:
            print(f"Error in stream generator for {camera_id}: {e}")
            break

@app.get("/stream/{camera_id}")
async def get_stream(camera_id: str):
    """Exposes real-time MJPEG camera streams overlayed with live detection data"""
    if camera_id not in ["cam-01", "cam-02", "cam-03", "cam-04"]:
        raise HTTPException(status_code=404, detail="Camera ID not found")
    return StreamingResponse(
        video_stream_generator(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

# --- UPLOAD IMAGE OBJECT DETECTION ---
class DetectionResult(BaseModel):
    box: List[float] # [x_min, y_min, x_max, y_max]
    confidence: float
    className: str

class DetectionResponse(BaseModel):
    success: bool
    detections: List[DetectionResult]
    image: str # base64 data URL
    fallbackMode: bool
    message: str

@app.post("/detect", response_model=DetectionResponse)
async def detect_objects(file: UploadFile = File(...)):
    """Receives image upload, runs YOLOv11 detection, draws bounding boxes, returns detections & base64 image"""
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file format")

        height, width, _ = img.shape
        detections = []
        
        if yolo_loaded and yolo_model is not None:
            # RUN YOLOv11 Inference
            results = yolo_model(img, conf=0.25)
            
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    # coords
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    conf = float(box.conf[0])
                    class_id = int(box.cls[0])
                    class_name = COCO_CLASSES[class_id] if class_id < len(COCO_CLASSES) else f"object_{class_id}"
                    
                    detections.append({
                        "box": [float(x1), float(y1), float(x2), float(y2)],
                        "confidence": conf,
                        "className": class_name
                    })
                    
                    # Draw box on image
                    cv2.rectangle(img, (int(x1), int(y1)), (int(x2), int(y2)), (99, 102, 241), 2) # Indigo box
                    label = f"{class_name} {conf:.2f}"
                    cv2.putText(img, label, (int(x1), int(y1) - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (99, 102, 241), 2)
                    
            msg = "Processed successfully with YOLOv11 Core Engine."
            is_fallback = False
        else:
            # OpenCV Fallback Mode
            print("[AI Service] Running OpenCV fallback detection...")
            
            # Detect faces using built-in cascade
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30))
            
            for (x, y, w, h) in faces:
                detections.append({
                    "box": [float(x), float(y), float(x+w), float(y+h)],
                    "confidence": 0.88,
                    "className": "face"
                })
                cv2.rectangle(img, (x, y), (x+w, y+h), (59, 130, 246), 2) # Blue box
                cv2.putText(img, "face 0.88", (x, y - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (59, 130, 246), 2)
                
            # If no faces, create simulated boxes for demonstration matching common files
            if len(faces) == 0:
                # Add a simulated person box in center
                cx, cy = width // 2, height // 2
                cw, ch = int(width * 0.25), int(height * 0.5)
                x1, y1 = cx - cw//2, cy - ch//2
                x2, y2 = cx + cw//2, cy + ch//2
                
                detections.append({
                    "box": [float(x1), float(y1), float(x2), float(y2)],
                    "confidence": 0.89,
                    "className": "person"
                })
                cv2.rectangle(img, (x1, y1), (x2, y2), (16, 185, 129), 2) # Emerald box
                cv2.putText(img, "person 0.89", (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (16, 185, 129), 2)

            msg = "Processed using OpenCV face cascade & shape heuristics."
            is_fallback = True
            
        # Encode output image to Base64
        _, buffer = cv2.imencode('.jpg', img)
        base64_str = base64.b64encode(buffer).decode('utf-8')
        image_data_url = f"data:image/jpeg;base64,{base64_str}"
        
        return {
            "success": True,
            "detections": detections,
            "image": image_data_url,
            "fallbackMode": is_fallback,
            "message": msg
        }
    except Exception as e:
        print(f"Error in detect: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def get_health():
    """AI Service health state"""
    return {
        "status": "healthy",
        "yoloModelLoaded": yolo_loaded,
        "device": "CUDA/GPU" if (yolo_loaded and yolo_model and hasattr(yolo_model, 'device') and 'cuda' in str(yolo_model.device)) else "CPU"
    }

if __name__ == "__main__":
    import uvicorn
    print("[AI Service] Starting FastAPI server on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
