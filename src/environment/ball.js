import EventBus from '../core/EventBus.js';
import ShotClassifier from '../gameplay/ShotClassifier.js';

export default class EnvironmentBall {
    constructor(scene, shadowGenerator) {
        this.scene = scene;
        this.shadowGenerator = shadowGenerator;
        this.ballMesh = null;
        this.targetHandGroup = null;
        this.targetWicketsModule = null;
        this.uiModule = null;
        this.cameraModule = null;

        this.BALL_DIAMETER = 0.072;
        this.GRAVITY = -9.8;

        this.position = new BABYLON.Vector3(0, 1.9, -22);
        this.velocity = new BABYLON.Vector3(0, -0.8, 22);

        this.swingForce = 0;
        this.isAnimating = true;
        this.hasHitHandOrStumps = false;

        // BOUNDARY TRACKING STATE
        this.hasHitGroundAfterStroke = false;
        this.boundaryRegistered = false;
        this.BOUNDARY_RADIUS = 40.0;

        // Physics state preservation for pause
        this.lastValidPosition = null;
        this.lastValidVelocity = null;
    }

    setup(handGroup, wicketsModule, uiModule, cameraModule) {
        this.targetHandGroup = handGroup;
        this.targetWicketsModule = wicketsModule;
        this.uiModule = uiModule;
        this.cameraModule = cameraModule;

        this.createBallGeometry();
        this.applyBallMaterial();

        if (this.cameraModule) {
            this.cameraModule.setBallReference(this.ballMesh);
        }

        this.registerPhysicsLoop();
        return this.ballMesh;
    }

    createBallGeometry() {
        this.ballMesh = BABYLON.MeshBuilder.CreateSphere("cricketBall", {
            diameter: this.BALL_DIAMETER,
            segments: 16
        }, this.scene);
        this.ballMesh.position = this.position.clone();

        if (this.shadowGenerator) {
            this.shadowGenerator.addShadowCaster(this.ballMesh);
        }
    }

    applyBallMaterial() {
        const ballMaterial = new BABYLON.StandardMaterial("ballMaterial", this.scene);
        ballMaterial.diffuseColor = new BABYLON.Color3(0.85, 0.05, 0.05);
        ballMaterial.specularColor = new BABYLON.Color3(0.6, 0.6, 0.6);
        this.ballMesh.material = ballMaterial;
    }

    registerPhysicsLoop() {
        this.scene.onBeforeRenderObservable.add(() => {
            if (!this.isAnimating) return;

            // Check if game is paused
            if (window.gamePaused) {
                // Store state for resume
                this.lastValidPosition = this.position.clone();
                this.lastValidVelocity = this.velocity.clone();
                return;
            }

            const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;

            this.velocity.y += this.GRAVITY * deltaTime;
            this.velocity.x += this.swingForce * deltaTime;

            this.position.x += this.velocity.x * deltaTime;
            this.position.y += this.velocity.y * deltaTime;
            this.position.z += this.velocity.z * deltaTime;

            // Pitch turf and outfield ground bouncing collision
            const ballRadius = this.BALL_DIAMETER / 2;
            if (this.position.y <= ballRadius) {
                this.position.y = ballRadius;
                this.velocity.y = -this.velocity.y * 0.65;
                this.swingForce *= 0.1;

                if (this.hasHitHandOrStumps) {
                    this.hasHitGroundAfterStroke = true;
                }
            }

            // A. Hand Collision Proxy Detection
            if (this.targetHandGroup && !this.hasHitHandOrStumps) {
                const handPos = this.targetHandGroup.position;
                const distX = Math.abs(this.position.x - handPos.x);
                const distY = Math.abs(this.position.y - handPos.y);
                const distZ = Math.abs(this.position.z - handPos.z);

                if (distX < 0.35 && distY < 0.35 && distZ < 0.30) {

                    this.hasHitHandOrStumps = true;
                    const strikeError = distX;
                    this.velocity.z = -Math.abs(this.velocity.z) * 2.5;
                    this.velocity.x = (this.position.x - handPos.x) * 35;

                    let timing = 'good';
                    let quality = 0.6;
                    
                    if (strikeError < 0.12) {
                        // Perfect strike
                        this.velocity.y = 18.0 + (Math.random() * 4.0);
                        this.velocity.z *= 1.5;
                        timing = 'perfect';
                        quality = 0.95;
                    } else {
                        // Edges/mistimed strike
                        this.velocity.y = 4.0 + (Math.random() * 2.0);
                        timing = 'mistimed';
                        quality = 0.4;
                    }

                    // Classify shot type based on mechanics
                    // ShotClassifier.classify() is an instance method; use the globally created instance
                    const classifier = window.shotClassifier || new ShotClassifier();
                    const shotClass = classifier.classify({
                        velocity: this.velocity,
                        position: this.position,
                        handPosition: handPos,
                        timing: timing
                    }, {
                        position: this.position,
                        velocity: this.velocity
                    });

                    // Emit shot event for analytics and UI feedback
                    EventBus.emit(EventBus.GAME_EVENTS.SHOT_PLAYED, {
                        shotType: shotClass.shotType,
                        power: shotClass.power,
                        direction: shotClass.direction,
                        timing: timing,
                        quality: quality,
                        position: this.position.clone(),
                        velocity: this.velocity.clone()
                    });

                    // Log to console for debugging
                    const shotEmoji = this._getShotEmoji(shotClass.shotType);
                    console.log(`${shotEmoji} ${shotClass.shotType} - ${timing.toUpperCase()} timing - Power: ${shotClass.power.toFixed(0)}%`);

                    if (this.cameraModule) this.cameraModule.startTracking();
                }
            }

            // B. Wicket Collision Checks
            if (this.targetWicketsModule && !this.targetWicketsModule.isSmashed && !this.hasHitHandOrStumps) {
                const wicketZ = this.targetWicketsModule.Z_POSITION;
                const wicketHeight = this.targetWicketsModule.STUMP_HEIGHT;

                if (Math.abs(this.position.z - wicketZ) < 0.15 &&
                    this.position.y < wicketHeight &&
                    Math.abs(this.position.x) < 0.12) {

                    this.hasHitHandOrStumps = true;
                    this.targetWicketsModule.triggerBowled();
                    this.velocity.set(0, 1.5, 3.0);

                    // Emit wicket event instead of direct UI call
                    EventBus.emit(EventBus.GAME_EVENTS.WICKET_DOWN, {
                        dismissalType: 'bowled',
                        position: this.position.clone()
                    });

                    if (this.uiModule) {
                        this.uiModule.showAnnouncement("WICKET!", "#FF3333");
                        this.uiModule.registerWicket();
                    }

                    setTimeout(() => { this.resetDelivery(); }, 2000);
                    return;
                }
            }

            // C. LIVE BOUNDARY ROPE DETECTION
            if (this.hasHitHandOrStumps && !this.boundaryRegistered && !(this.targetWicketsModule && this.targetWicketsModule.isSmashed)) {
                const distanceFromCenter = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);

                if (distanceFromCenter >= this.BOUNDARY_RADIUS) {
                    this.boundaryRegistered = true;

                    if (this.hasHitGroundAfterStroke) {
                        // Emit boundary.four event
                        EventBus.emit(EventBus.GAME_EVENTS.BOUNDARY_FOUR, {
                            position: this.position.clone(),
                            distance: distanceFromCenter
                        });
                        if (this.uiModule) {
                            this.uiModule.addRuns(4);
                            this.uiModule.showAnnouncement("FOUR!", "#33CCFF");
                        }
                    } else {
                        // Emit boundary.six event
                        EventBus.emit(EventBus.GAME_EVENTS.BOUNDARY_SIX, {
                            position: this.position.clone(),
                            distance: distanceFromCenter,
                            airborneDistance: Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z + this.position.y * this.position.y)
                        });
                        if (this.uiModule) {
                            this.uiModule.addRuns(6);
                            this.uiModule.showAnnouncement("SIX!", "#33FF33");
                        }
                    }

                    setTimeout(() => { this.resetDelivery(); }, 1200);
                    return;
                }
            }

            this.ballMesh.position.copyFrom(this.position);

            // D. IN-FIELD RUN SCORING & DISMISSAL RESETS
            if (this.hasHitHandOrStumps) {
                if (!this.boundaryRegistered && (this.position.z < -40 || Math.abs(this.position.x) > 25 || this.velocity.length() < 1.5)) {
                    this.boundaryRegistered = true;
                    const travelDistance = Math.abs(this.position.z);
                    let runsScored = 1;
                    if (travelDistance > 25) runsScored = 3;
                    else if (travelDistance > 15) runsScored = 2;

                    // Emit runs scored event
                    EventBus.emit(EventBus.GAME_EVENTS.RUNS_SCORED, {
                        runs: runsScored,
                        position: this.position.clone(),
                        distance: travelDistance
                    });

                    if (this.uiModule) {
                        this.uiModule.addRuns(runsScored);
                        if (runsScored > 1) {
                            this.uiModule.showAnnouncement(`${runsScored} RUNS! 🏃`, "#33FF99");
                        }
                    }

                    setTimeout(() => { this.resetDelivery(); }, 1500);
                }
            } else if (this.position.z > 12 || this.position.z < -45) {
                this.resetDelivery();
            }
        });
    }

    resetDelivery() {
        if (!this.boundaryRegistered && !(this.targetWicketsModule && this.targetWicketsModule.isSmashed)) {
            if (this.uiModule) {
                this.uiModule.incrementBall();
                this.uiModule.updateDisplay();
            }
        }

        this.hasHitHandOrStumps = false;
        this.hasHitGroundAfterStroke = false;
        this.boundaryRegistered = false;

        const randomPace = 22 + Math.random() * 6;
        const randomHeight = 1.8 + Math.random() * 0.2;
        const randomLineOffset = (Math.random() - 0.5) * 0.12;

        this.position = new BABYLON.Vector3(randomLineOffset, randomHeight, -22);
        this.velocity = new BABYLON.Vector3((Math.random() - 0.5) * 0.2, -0.6, randomPace);
        this.swingForce = (Math.random() - 0.5) * 1.8;

        this.ballMesh.position.copyFrom(this.position);

        if (this.targetWicketsModule) {
            this.targetWicketsModule.resetWickets();
        }

        if (this.cameraModule) {
            this.cameraModule.resetToStance();
        }
    }

    _getShotEmoji(shotType) {
        const emojiMap = {
            'STRAIGHT_DRIVE': '→',
            'COVER_DRIVE': '↗',
            'ON_DRIVE': '↖',
            'PULL_SHOT': '←',
            'HOOK_SHOT': '↙',
            'CUT_SHOT': '↘',
            'DEFENSE': '🛡',
            'EDGE': '⚠',
            'LOFTED_DRIVE': '↑',
            'FLICK': '↙',
        };
        return emojiMap[shotType] || '🎯';
    }
}