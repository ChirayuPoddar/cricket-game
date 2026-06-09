// src/environment/hand.js

export default class EnvironmentHand {
    constructor(scene) {
        this.scene = scene;
        this.handGroup = null;
        this.socket = null;

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
            minY: -1.2,  // LOWERED FROM -0.2 -> Forces the tracker to easily touch the grass for yorkers!
            maxY: 3.8    // Slightly increased ceiling to give you a full vertical range
        };
    }

    setup() {
        // --- WEBCAM CORNER OVERLAY ACTIVATION ENGINE ---
        const videoElement = document.getElementById("webcamOverlay");
        if (videoElement && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 30 } }
            })
                .then((stream) => { videoElement.srcObject = stream; })
                .catch((err) => { console.error("Camera access handshake dropped:", err); });
        }

        this.handGroup = new BABYLON.TransformNode("handGroup Anchor", this.scene);

        const trackerVisual = BABYLON.MeshBuilder.CreateSphere("trackerVisual", { diameter: 0.4 }, this.scene);
        trackerVisual.parent = this.handGroup;

        const trackingMat = new BABYLON.StandardMaterial("trackingMat", this.scene);
        trackingMat.diffuseColor = new BABYLON.Color3(0, 1, 0);
        trackingMat.emissiveColor = new BABYLON.Color3(0, 0.4, 0);
        trackerVisual.material = trackingMat;

        this.handGroup.position = new BABYLON.Vector3(0, 1.2, 8.0);
        this.connectToTracker();

        this.scene.onBeforeRenderObservable.add(() => {
            this.updateFramePosition();
        });

        return this.handGroup;
    }

    connectToTracker() {
        this.socket = new WebSocket("ws://localhost:8765");

        this.socket.onopen = () => { console.log("Frontend connected to YOLO Server!"); };
        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.x !== undefined && data.y !== undefined) {
                    this.targetX = data.x;
                    this.targetY = data.y;
                }
            } catch (err) { console.error("Error unpacking packet:", err); }
        };
        this.socket.onclose = () => { setTimeout(() => this.connectToTracker(), 3000); };
    }

    // Inside src/environment/hand.js -> updateFramePosition()

    updateFramePosition() {
        if (!this.handGroup) return;

        this.currentX += (this.targetX - this.currentX) * this.lerpFactor;
        this.currentY += (this.targetY - this.currentY) * this.lerpFactor;

        const mirroredX = 1.0 - this.currentX;

        const calculatedX = this.bounds.minX + (mirroredX * (this.bounds.maxX - this.bounds.minX));

        // CALCULATE Y AND CLAMP TO GROUND
        let calculatedY = this.bounds.maxY - (this.currentY * (this.bounds.maxY - this.bounds.minY));

        // CLAMPING: This ensures that even if you drop your hand low, 
        // the ball stops at 0.1 (just above the grass), not under the earth!
        calculatedY = Math.max(0.1, calculatedY);

        this.handGroup.position.x = calculatedX;
        this.handGroup.position.y = calculatedY;
        this.handGroup.position.z = 8.0;
    }
}