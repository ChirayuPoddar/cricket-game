import EventBus from '../../core/EventBus.js';
import { BALL_DIAMETER, BOUNDARY_RADIUS, SHOT_EMOJI_MAP } from './constants.js?v=58';
import { createBallGeometry, applyBallMaterial } from './geometry.js?v=58';
import { updatePhysics } from './physics.js?v=58';
import { checkBatCollision } from './collision.js?v=58';
import { checkWicketsAndScoring } from './scoring.js?v=58';

export default class EnvironmentBall {
    constructor(scene, shadowGenerator) {
        this.scene = scene;
        this.shadowGenerator = shadowGenerator;
        this.ballMesh = null;
        this.targetHandGroup = null;
        this.targetWicketsModule = null;
        this.uiModule = null;
        this.cameraModule = null;

        this.BALL_DIAMETER = BALL_DIAMETER;
        this.GRAVITY = -9.8;
        this.BOUNDARY_RADIUS = BOUNDARY_RADIUS;

        this.position = new BABYLON.Vector3(0.6, 1.9, -12);
        this.velocity = new BABYLON.Vector3(-0.77, -0.8, 22);

        this.swingForce = 0;
        this.isAnimating = true;
        this.hasHitHandOrStumps = false;

        this.hasHitGroundAfterStroke = false;
        this.boundaryRegistered = false;
        this.contactPosition = null;

        this.lastValidPosition = null;
        this.lastValidVelocity = null;

        this.isBallReadyToBowl = false;
        this.peakSwingSpeed = 0;
        this.peakSwingTime = 0;
        this.bowlingStartTime = null;
        this.idealContactTime = null;
        this.bowlTimeout = null;
    }

    setup(handGroup, wicketsModule, uiModule, cameraModule) {
        this.targetHandGroup = handGroup;
        this.targetWicketsModule = wicketsModule;
        this.uiModule = uiModule;
        this.cameraModule = cameraModule;

        createBallGeometry(this);
        applyBallMaterial(this);

        if (this.cameraModule) {
            this.cameraModule.setBallReference(this.ballMesh);
        }

        this.registerPhysicsLoop();
        return this.ballMesh;
    }

    registerPhysicsLoop() {
        this.scene.onBeforeRenderObservable.add(() => {
            if (!this.isAnimating) return;

            if (window.gamePaused || !this.isBallReadyToBowl) {
                if (this.ballMesh) {
                    this.ballMesh.position.copyFrom(this.position);
                }
                this.lastValidPosition = this.position.clone();
                this.lastValidVelocity = this.velocity.clone();
                return;
            }

            if (this.bowlingStartTime === null) {
                this.bowlingStartTime = Date.now();
                this.idealContactTime = this.bowlingStartTime + (19.4 / this.velocity.z) * 1000;
                this.peakSwingSpeed = 0;
                this.peakSwingTime = 0;
            }

            if (!this.hasHitHandOrStumps && this.targetHandGroup) {
                const currentSwingSpeed = this.targetHandGroup.swingSpeed ?? 0;
                const timeSinceBowl = Date.now() - this.bowlingStartTime;
                if (timeSinceBowl > 100) {
                    if (currentSwingSpeed > this.peakSwingSpeed) {
                        this.peakSwingSpeed = currentSwingSpeed;
                        this.peakSwingTime = Date.now();
                    }
                }
            }

            const deltaTime = this.scene.getEngine().getDeltaTime() / 1000;

            updatePhysics(this, deltaTime);
            checkBatCollision(this);
            const triggeredReset = checkWicketsAndScoring(this);

            if (!triggeredReset && this.ballMesh) {
                this.ballMesh.position.copyFrom(this.position);
            }
        });
    }

    resetDelivery(autoBowl = false) {
        if (this.bowlTimeout) {
            clearTimeout(this.bowlTimeout);
            this.bowlTimeout = null;
        }

        this.hasHitHandOrStumps = false;
        this.hasHitGroundAfterStroke = false;
        this.boundaryRegistered = false;
        this.contactPosition = null;

        // Easier pace (17 to 22 m/s instead of 22 to 28 m/s)
        const randomPace = 17 + Math.random() * 5;
        const randomHeight = 1.8 + Math.random() * 0.2;
        const randomLineOffset = (Math.random() - 0.5) * 0.12;

        this.position = new BABYLON.Vector3(0.6 + randomLineOffset, randomHeight, -12);
        this.velocity = new BABYLON.Vector3(-0.77 + (Math.random() - 0.5) * 0.2, -0.6, randomPace);
        this.swingForce = (Math.random() - 0.5) * 1.8;

        if (this.ballMesh) {
            this.ballMesh.position.copyFrom(this.position);
        }

        if (this.targetWicketsModule) {
            this.targetWicketsModule.resetWickets();
        }

        if (this.cameraModule) {
            this.cameraModule.resetToStance();
        }

        if (this.uiModule) {
            this.uiModule.hideTimingMeter();
        }

        this.isBallReadyToBowl = !autoBowl;
        this.bowlingStartTime = null;
        this.idealContactTime = null;
        this.peakSwingSpeed = 0;
        this.peakSwingTime = 0;

        EventBus.emit(EventBus.GAME_EVENTS.BALL_RESET, { autoBowl });
    }

    getTimingData() {
        let noSwing = false;
        let timingText = "NO SWING";
        let timingDiff = 0;

        if (this.bowlingStartTime !== null && this.idealContactTime !== null) {
            if (this.peakSwingSpeed < 0.15) {
                noSwing = true;
                timingText = "NO SWING";
            } else {
                timingDiff = this.peakSwingTime - this.idealContactTime;
                // Highly relaxed timing windows for easier hitting
                if (Math.abs(timingDiff) <= 180) {
                    timingText = "PERFECT";
                } else if (Math.abs(timingDiff) <= 300) {
                    timingText = "GOOD";
                } else if (timingDiff < 0) {
                    if (timingDiff < -450) {
                        timingText = "TOO EARLY";
                    } else {
                        timingText = "EARLY";
                    }
                } else {
                    if (timingDiff > 450) {
                        timingText = "TOO LATE";
                    } else {
                        timingText = "LATE";
                    }
                }
            }
        } else {
            noSwing = true;
        }

        return { timingDiff, timingText, noSwing };
    }

    _getShotEmoji(shotType) {
        return SHOT_EMOJI_MAP[shotType] || '🎯';
    }
}
