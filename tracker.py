# tracker.py
import cv2
import asyncio
import websockets
import json
from ultralytics import YOLO

# Initialize highly optimized YOLOv8 Pose model (automatically downloads on first run)
model = YOLO('yolov8n-pose.pt')

connected_clients = set()

async def handler(websocket):
    connected_clients.add(websocket)
    print(f"Game Browser Connected! Active pipes: {len(connected_clients)}")
    try:
        async for message in websocket:
            pass 
    except websockets.exceptions.ConnectionClosedError:
        pass
    finally:
        connected_clients.remove(websocket)
        print("Game Browser Disconnected.")

async def broadcast_hand_data():
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Error: Webcam device unavailable.")
        return

    print("YOLO Tracking Server Live! Step into frame...")

    while True:
        ret, frame = cap.read()
        if not ret:
            await asyncio.sleep(0.01)
            continue

        # Flip for natural mapping mirror
        frame = cv2.flip(frame, 1)
        h, w, c = frame.shape
        
        # Run fast object-pose detection frame prediction (verbose=False keeps terminal clean)
        results = model(frame, verbose=False)

        hand_x, hand_y = None, None

        # Check if a person is in the webcam view
        if results and len(results[0].keypoints) > 0:
            # Get keypoint arrays for the first detected player
            # Keypoint indices: 9 is Right Wrist, 10 is Left Wrist
            keypoints = results[0].keypoints.xyn[0].cpu().numpy()
            
            if len(keypoints) > 10:
                right_wrist = keypoints[9] # [x, y] normalized format
                left_wrist = keypoints[10] # [x, y] normalized format
                
                # Check if either wrist is visible in frame (values will be non-zero)
                if right_wrist[0] > 0 or right_wrist[1] > 0:
                    hand_x, hand_y = float(right_wrist[0]), float(right_wrist[1])
                    # Draw visual indicator dot over tracked wrist
                    cv2.circle(frame, (int(hand_x * w), int(hand_y * h)), 10, (0, 255, 0), -1)
                elif left_wrist[0] > 0 or left_wrist[1] > 0:
                    hand_x, hand_y = float(left_wrist[0]), float(left_wrist[1])
                    cv2.circle(frame, (int(hand_x * w), int(hand_y * h)), 10, (0, 255, 0), -1)

        cv2.imshow("Cricket Vision Tracking Monitor", frame)

        # Pipe coordinate payload down to the browser websocket link
        if hand_x is not None and len(connected_clients) > 0:
            payload = json.dumps({"x": hand_x, "y": hand_y})
            await asyncio.gather(
                *[client.send(payload) for client in connected_clients], 
                return_exceptions=True
            )

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

        await asyncio.sleep(0.01)

    cap.release()
    cv2.destroyAllWindows()

async def main():
    server = await websockets.serve(handler, "localhost", 8765)
    print("WebSocket pipeline running at ws://localhost:8765")
    await broadcast_hand_data()
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())