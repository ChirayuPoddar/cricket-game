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

        // Swing speed + direction tracking
        this.prevWorldX = null;
        this.prevWorldY = null;
        this.trackerSpeed = 0;       // scalar speed from WebSocket (normalised coords/sec)
        this.trackerVX    = 0;       // signed X velocity from WebSocket
        this.trackerVY    = 0;       // signed Y velocity from WebSocket
        this.swingSpeed   = 0;       // smoothed 0-1 swing power (magnitude)
        this.swingVX      = 0;       // signed world-unit/sec X velocity at bat
        this.swingVY      = 0;       // signed world-unit/sec Y velocity at bat (neg = down = forward)
        this.swingSpeedDecay = 0.94; // how fast speed magnitude fades (increased to hold peak swing speed longer)

        // SWING SPEED THRESHOLDS (world units/sec)
        // Calibrate from console: gentle push ≈ 0.8, hard swing ≈ 4.0+
        this.SWING_SLOW_MAX = 0.6;   // below this → 1/2/3 runs territory
        this.SWING_FAST_MIN = 2.0;   // above this → boundary territory (reduced further to make boundaries easy)

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
                    // console.log("Webcam access granted");
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

        this.trackerVisual = BABYLON.MeshBuilder.CreateSphere("trackerVisual", { diameter: 0.8 }, this.scene);
        this.trackerVisual.parent = this.handGroup;
        this.trackerVisual.isVisible = false;

        const trackingMat = new BABYLON.StandardMaterial("trackingMat", this.scene);
        trackingMat.diffuseColor = new BABYLON.Color3(0, 1, 0);
        trackingMat.emissiveColor = new BABYLON.Color3(0, 0.4, 0);
        this.trackerVisual.material = trackingMat;

        this.handGroup.position = new BABYLON.Vector3(0, 1.2, 7.4);

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
                // console.log("✅ Frontend connected to YOLO Server!");
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
                    // Read speed + signed velocity from tracker
                    if (data.speed !== undefined) this.trackerSpeed = data.speed;
                    if (data.vx    !== undefined) this.trackerVX    = data.vx;  // camera-space vx
                    if (data.vy    !== undefined) this.trackerVY    = data.vy;  // camera-space vy
                } catch (err) { 
                    console.error("Error unpacking packet:", err); 
                }
            };

            this.socket.onerror = (error) => {
                console.error("WebSocket error:", error);
                this.connectionStatus = "error";
                if (navigator.brave) {
                    this.showStatusIndicator("⛔ WEBSOCKET BLOCKED BY BRAVE SHIELDS");
                    console.warn("Brave Browser detected! Localhost WebSockets (ws://localhost:8765) are blocked by default. Click the Brave Lion icon in the address bar and toggle Shields to OFF to allow connection.");
                }
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
        this.handGroup.position.z = 7.4;

        // --- SWING SPEED + DIRECTION COMPUTATION ---
        if (this.prevWorldX !== null) {
            // Per-frame world-space deltas (world units per frame)
            const dxWorld = calculatedX - this.prevWorldX;
            const dyWorld = calculatedY - this.prevWorldY;

            // Convert to world units/sec (assume ~60fps; actual deltaTime not available here)
            const FPS_EST = 60;
            const wVX = dxWorld * FPS_EST;  // positive = moving right in game world
            const wVY = dyWorld * FPS_EST;  // negative = moving down (forward swing proxy)

            // In webcam mode, additionally scale by the tracker's own speed signal
            // (tracker speed is in normalised camera coords/sec - remap to world scale)
            // World X range = 6.0 units, camera X range = 1.0 → scale factor = 6.0
            // World Y range = 5.0 units, camera Y range = 1.0 → scale factor = 5.0
            let rawSpeed;
            if (!this.keyboardMode) {
                // Use tracker scalar speed (normalised → world scale via average 5.5)
                rawSpeed = this.trackerSpeed * 5.5;
                // For signed VX/VY in webcam mode, use world deltas
                // (tracker vx/vy are in camera space; world deltas are already transformed)
            } else {
                rawSpeed = Math.sqrt(wVX * wVX + wVY * wVY);
            }

            // Peak-hold with decay so the swing registers at ball contact
            this.swingSpeed = Math.max(
                Math.min(1.0, rawSpeed / this.SWING_FAST_MIN),
                this.swingSpeed * this.swingSpeedDecay
            );

            // Signed directional velocity (world units/sec) — peak-hold per axis
            // Use exponential smoothing so a sudden jerk registers strongly
            const VX_DECAY = 0.80;
            const VY_DECAY = 0.80;
            // Take the value with larger absolute magnitude
            this.swingVX = Math.abs(wVX) > Math.abs(this.swingVX * VX_DECAY)
                ? wVX : this.swingVX * VX_DECAY;
            this.swingVY = Math.abs(wVY) > Math.abs(this.swingVY * VY_DECAY)
                ? wVY : this.swingVY * VY_DECAY;
        }

        this.prevWorldX = calculatedX;
        this.prevWorldY = calculatedY;

        // Expose everything on the handGroup so ball.js can read at contact
        this.handGroup.swingSpeed = this.swingSpeed;  // 0-1 magnitude
        this.handGroup.swingVX    = this.swingVX;     // world units/sec, signed
        this.handGroup.swingVY    = this.swingVY;     // world units/sec, signed (neg=down=forward)

        // Uncomment to calibrate thresholds:
        // console.log(`swingVX:${this.swingVX.toFixed(2)} swingVY:${this.swingVY.toFixed(2)} speed:${this.swingSpeed.toFixed(2)}`);
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