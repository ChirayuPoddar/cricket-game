// src/environment/hand.js

export default class EnvironmentHand {
    constructor(scene) {
        this.scene = scene;
        this.handGroup = null;
        this.socket = null;
        this.trackerVisual = null;

        this.targetX = 0.5;
        this.targetY = 0.5;
        this.currentX = 0.5;
        this.currentY = 0.5;

        // Snappy, highly responsive tracking factor
        this.lerpFactor = 0.45;

        // BALANCED AND DEEPER VERTICAL BOUNDS
        this.bounds = {
            minX: -3.0,
            maxX: 3.0,
            minY: -1.2,
            maxY: 3.8
        };

        // Keyboard fallback
        this.keyboardMode = false;
        this.keyState = {};
        this.connectionStatus = "disconnected";
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
    }

    setup() {
        // --- WEBCAM CORNER OVERLAY ACTIVATION ENGINE ---
        const videoElement = document.getElementById("webcamOverlay");
        if (videoElement && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 30 } }
            })
                .then((stream) => { 
                    videoElement.srcObject = stream;
                    console.log("Webcam access granted");
                })
                .catch((err) => { 
                    console.warn("Camera access denied, using keyboard fallback:", err);
                    this.keyboardMode = true;
                    this.showStatusIndicator("KEYBOARD MODE (Camera unavailable)");
                });
        } else {
            console.warn("getUserMedia not available, using keyboard fallback");
            this.keyboardMode = true;
        }

        this.handGroup = new BABYLON.TransformNode("handGroup Anchor", this.scene);

        this.trackerVisual = BABYLON.MeshBuilder.CreateSphere("trackerVisual", { diameter: 0.4 }, this.scene);
        this.trackerVisual.parent = this.handGroup;

        const trackingMat = new BABYLON.StandardMaterial("trackingMat", this.scene);
        trackingMat.diffuseColor = new BABYLON.Color3(0, 1, 0);
        trackingMat.emissiveColor = new BABYLON.Color3(0, 0.4, 0);
        this.trackerVisual.material = trackingMat;

        this.handGroup.position = new BABYLON.Vector3(0, 1.2, 8.0);

        // Setup keyboard controls
        this.setupKeyboardControls();

        // Setup WebSocket connection
        this.connectToTracker();

        this.scene.onBeforeRenderObservable.add(() => {
            this.updateFramePosition();
        });

        return this.handGroup;
    }

    setupKeyboardControls() {
        window.addEventListener("keydown", (e) => {
            this.keyState[e.key.toLowerCase()] = true;
        });

        window.addEventListener("keyup", (e) => {
            this.keyState[e.key.toLowerCase()] = false;
        });
    }

    connectToTracker() {
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsURL = `${protocol}://localhost:8765`;
        
        try {
            this.socket = new WebSocket(wsURL);
            this.connectionStatus = "connecting";

            this.socket.onopen = () => { 
                console.log("✅ Frontend connected to YOLO Server!");
                this.connectionStatus = "connected";
                this.reconnectAttempts = 0;
                this.showStatusIndicator("✅ WEBCAM TRACKING ACTIVE");
                this.keyboardMode = false;
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.x !== undefined && data.y !== undefined) {
                        this.targetX = data.x;
                        this.targetY = data.y;
                    }
                } catch (err) { 
                    console.error("Error unpacking packet:", err); 
                }
            };

            this.socket.onerror = (error) => {
                console.error("WebSocket error:", error);
                this.connectionStatus = "error";
            };

            this.socket.onclose = () => { 
                this.connectionStatus = "disconnected";
                console.warn("❌ Server connection lost. Attempting reconnection...");
                this.keyboardMode = true;
                this.showStatusIndicator("⌨️ KEYBOARD MODE (Waiting for server...)");
                
                this.reconnectAttempts++;
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
                    setTimeout(() => this.connectToTracker(), delay);
                } else {
                    console.error("Max reconnection attempts reached");
                    this.showStatusIndicator("⛔ SERVER UNAVAILABLE");
                }
            };
        } catch (err) {
            console.error("Failed to create WebSocket:", err);
            this.keyboardMode = true;
            this.showStatusIndicator("⌨️ KEYBOARD MODE");
        }
    }

    updateFramePosition() {
        if (!this.handGroup) return;

        // Handle keyboard input if camera tracking unavailable
        if (this.keyboardMode) {
            const keySpeed = 0.03;
            if (this.keyState['w'] || this.keyState['arrowup']) this.currentY += keySpeed;
            if (this.keyState['s'] || this.keyState['arrowdown']) this.currentY -= keySpeed;
            if (this.keyState['a'] || this.keyState['arrowleft']) this.currentX -= keySpeed;
            if (this.keyState['d'] || this.keyState['arrowright']) this.currentX += keySpeed;

            // Clamp to [0, 1]
            this.currentX = Math.max(0, Math.min(1, this.currentX));
            this.currentY = Math.max(0, Math.min(1, this.currentY));
        } else {
            // Normal webcam tracking with smoothing
            this.currentX += (this.targetX - this.currentX) * this.lerpFactor;
            this.currentY += (this.targetY - this.currentY) * this.lerpFactor;
        }

        const mirroredX = 1.0 - this.currentX;

        const calculatedX = this.bounds.minX + (mirroredX * (this.bounds.maxX - this.bounds.minX));

        let calculatedY = this.bounds.maxY - (this.currentY * (this.bounds.maxY - this.bounds.minY));

        // CLAMPING: Ensure ball doesn't go underground
        calculatedY = Math.max(0.1, calculatedY);

        this.handGroup.position.x = calculatedX;
        this.handGroup.position.y = calculatedY;
        this.handGroup.position.z = 8.0;
    }

    showStatusIndicator(message) {
        let statusIndicator = document.getElementById("connectionStatus");
        if (!statusIndicator) {
            statusIndicator = document.createElement("div");
            statusIndicator.id = "connectionStatus";
            statusIndicator.style.position = "absolute";
            statusIndicator.style.top = "85px";
            statusIndicator.style.left = "20px";
            statusIndicator.style.padding = "8px 12px";
            statusIndicator.style.backgroundColor = "rgba(10, 20, 40, 0.95)";
            statusIndicator.style.color = "#00FF00";
            statusIndicator.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
            statusIndicator.style.fontSize = "12px";
            statusIndicator.style.borderRadius = "5px";
            statusIndicator.style.borderLeft = "3px solid #00FF00";
            statusIndicator.style.zIndex = "999";
            statusIndicator.style.pointerEvents = "none";
            document.body.appendChild(statusIndicator);
        }
        statusIndicator.innerText = message;
    }
}