# tracker.py
import cv2
import asyncio
import websockets
import json
import signal
import sys
from ultralytics import YOLO
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize highly optimized YOLOv8 Pose model
try:
    model = YOLO('yolov8n-pose.pt')
    logger.info("YOLOv8 model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load YOLOv8 model: {e}")
    sys.exit(1)

connected_clients = set()
server = None
cap = None
is_running = True

def signal_handler(sig, frame):
    global is_running
    logger.info("Shutdown signal received")
    is_running = False
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

async def handler(websocket):
    """Handle WebSocket client connections"""
    connected_clients.add(websocket)
    logger.info(f"Client connected. Total connections: {len(connected_clients)}")
    try:
        async for message in websocket:
            # Keep connection alive, clients just receive data
            pass 
    except websockets.exceptions.ConnectionClosedError as e:
        logger.warning(f"Client disconnected: {e}")
    except Exception as e:
        logger.error(f"Error in WebSocket handler: {e}")
    finally:
        connected_clients.discard(websocket)
        logger.info(f"Client removed. Total connections: {len(connected_clients)}")

async def broadcast_hand_data():
    """Capture video frames and broadcast hand positions"""
    global cap, is_running

    # Velocity tracking state
    prev_hand_x, prev_hand_y = None, None
    import time
    prev_time = time.time()
    
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        logger.error("Error: Webcam device unavailable. Check camera permissions.")
        return

    logger.info("YOLO Tracking Server Live! Step into frame...")

    frame_count = 0
    error_count = 0
    max_errors = 5

    while is_running:
        try:
            ret, frame = cap.read()
            if not ret:
                await asyncio.sleep(0.01)
                error_count += 1
                if error_count >= max_errors:
                    logger.warning("Too many frame read errors, restarting camera")
                    cap.release()
                    await asyncio.sleep(1)
                    cap = cv2.VideoCapture(0)
                    error_count = 0
                continue

            error_count = 0
            frame = cv2.flip(frame, 1)
            h, w, c = frame.shape
            
            try:
                # Run pose detection with timeout
                results = model(frame, verbose=False)
            except Exception as e:
                logger.error(f"Error in pose detection: {e}")
                continue

            hand_x, hand_y = None, None

            # Extract hand position from keypoints
            try:
                if results and len(results[0].keypoints) > 0:
                    keypoints = results[0].keypoints.xyn[0].cpu().numpy()
                    
                    if len(keypoints) > 10:
                        right_wrist = keypoints[9]
                        left_wrist = keypoints[10]
                        
                        if right_wrist[0] > 0 or right_wrist[1] > 0:
                            hand_x, hand_y = float(right_wrist[0]), float(right_wrist[1])
                            cv2.circle(frame, (int(hand_x * w), int(hand_y * h)), 10, (0, 255, 0), -1)
                        elif left_wrist[0] > 0 or left_wrist[1] > 0:
                            hand_x, hand_y = float(left_wrist[0]), float(left_wrist[1])
                            cv2.circle(frame, (int(hand_x * w), int(hand_y * h)), 10, (0, 255, 0), -1)
            except Exception as e:
                logger.error(f"Error extracting keypoints: {e}")
                continue

            # Display frame
            try:
                cv2.imshow("Cricket Vision Tracking Monitor", frame)
            except Exception as e:
                logger.warning(f"Error displaying frame: {e}")

            # --- Compute hand velocity ---
            now = time.time()
            dt = now - prev_time
            prev_time = now

            vx, vy, speed = 0.0, 0.0, 0.0
            if hand_x is not None and prev_hand_x is not None and dt > 0:
                # Velocity in normalised-coord units per second
                vx = (hand_x - prev_hand_x) / dt
                vy = (hand_y - prev_hand_y) / dt
                speed = (vx ** 2 + vy ** 2) ** 0.5

            if hand_x is not None:
                prev_hand_x, prev_hand_y = hand_x, hand_y

            # Broadcast to connected clients
            if hand_x is not None and len(connected_clients) > 0:
                try:
                    payload = json.dumps({
                        "x": hand_x,
                        "y": hand_y,
                        "vx": round(vx, 4),
                        "vy": round(vy, 4),
                        "speed": round(speed, 4)
                    })
                    # Send with error handling
                    dead_clients = set()
                    for client in connected_clients:
                        try:
                            await asyncio.wait_for(client.send(payload), timeout=0.5)
                        except asyncio.TimeoutError:
                            logger.warning("WebSocket send timeout, removing client")
                            dead_clients.add(client)
                        except Exception as e:
                            logger.debug(f"Error sending to client: {e}")
                            dead_clients.add(client)
                    
                    # Remove dead clients
                    for client in dead_clients:
                        connected_clients.discard(client)
                except Exception as e:
                    logger.error(f"Error broadcasting data: {e}")

            # Check for exit
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

            frame_count += 1
            if frame_count % 300 == 0:  # Log every ~10 seconds at 30fps
                logger.info(f"Processed {frame_count} frames, {len(connected_clients)} active clients")

            await asyncio.sleep(0.01)

        except KeyboardInterrupt:
            break
        except Exception as e:
            logger.error(f"Unexpected error in broadcast loop: {e}")
            await asyncio.sleep(1)

    # Cleanup
    logger.info("Cleaning up resources...")
    if cap:
        cap.release()
    cv2.destroyAllWindows()

async def main():
    global server, is_running
    
    try:
        server = await websockets.serve(handler, "0.0.0.0", 8765)
        logger.info("WebSocket server running at ws://0.0.0.0:8765")
        
        # Run broadcast task
        await broadcast_hand_data()
        
    except OSError as e:
        logger.error(f"Failed to start WebSocket server (port might be in use): {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Unexpected error in main: {e}")
        sys.exit(1)
    finally:
        if server:
            server.close()
            await server.wait_closed()
        logger.info("Server shutdown complete")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server interrupted by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        sys.exit(1)