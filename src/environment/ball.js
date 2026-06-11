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

        this.position = new BABYLON.Vector3(0.6, 1.9, -12);
        this.velocity = new BABYLON.Vector3(-0.77, -0.8, 22);

        this.swingForce = 0;
        this.isAnimating = true;
        this.hasHitHandOrStumps = false;

        // BOUNDARY TRACKING STATE
        this.hasHitGroundAfterStroke = false;
        this.boundaryRegistered = false;
        this.BOUNDARY_RADIUS = 40.0;
        this.contactPosition = null;

        // Physics state preservation for pause
        this.lastValidPosition = null;
        this.lastValidVelocity = null;

        // SWING TIMING & AUTO-BOWL STATE
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

            // Check if game is paused or ball is not ready to bowl
            if (window.gamePaused || !this.isBallReadyToBowl) {
                // Store state for resume / keep frozen mesh position
                if (this.ballMesh) {
                    this.ballMesh.position.copyFrom(this.position);
                }
                this.lastValidPosition = this.position.clone();
                this.lastValidVelocity = this.velocity.clone();
                return;
            }

            // Initialize timing values when the ball actually starts moving
            if (this.bowlingStartTime === null) {
                this.bowlingStartTime = Date.now();
                this.idealContactTime = this.bowlingStartTime + (19.4 / this.velocity.z) * 1000;
                this.peakSwingSpeed = 0;
                this.peakSwingTime = 0;
            }

            // Track peak swing speed and timing while the ball is in flight (before contact/wicket)
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

            this.velocity.y += this.GRAVITY * deltaTime;
            this.velocity.x += this.swingForce * deltaTime;

            // ── AIR RESISTANCE (always, small) ──────────────────────────────
            if (this.hasHitHandOrStumps) {
                this.velocity.x *= 0.998;
                this.velocity.z *= 0.998;
            }

            this.position.x += this.velocity.x * deltaTime;
            this.position.y += this.velocity.y * deltaTime;
            this.position.z += this.velocity.z * deltaTime;

            // ── GROUND BOUNCE + FRICTION ─────────────────────────────────────
            const ballRadius = this.BALL_DIAMETER / 2;
            if (this.position.y <= ballRadius) {
                this.position.y = ballRadius;

                if (Math.abs(this.velocity.y) > 0.4) {
                    // Real bounce — reverse with restitution
                    this.velocity.y = -this.velocity.y * 0.60;

                    if (this.hasHitHandOrStumps) {
                        // Each bounce robs ~14% of horizontal speed (grass contact)
                        this.velocity.x *= 0.86;
                        this.velocity.z *= 0.86;
                    }
                } else {
                    // Ball is now rolling — kill vertical oscillation
                    this.velocity.y = 0;
                }

                this.swingForce *= 0.1;
                if (this.hasHitHandOrStumps) {
                    this.hasHitGroundAfterStroke = true;
                }
            }

            // ── ROLLING DECELERATION (grass friction while on ground) ────────
            // Only when ball is very close to ground and not bouncing significantly
            if (this.hasHitHandOrStumps &&
                this.position.y <= ballRadius + 0.08 &&
                Math.abs(this.velocity.y) < 0.5) {

                const hSpeed = Math.sqrt(
                    this.velocity.x * this.velocity.x +
                    this.velocity.z * this.velocity.z
                );
                if (hSpeed > 0.05) {
                    // Decelerate at 3.2 units/sec² — ball rolls much further and scoring is more generous
                    const reduction = Math.min(hSpeed, 3.2 * deltaTime);
                    const factor = (hSpeed - reduction) / hSpeed;
                    this.velocity.x *= factor;
                    this.velocity.z *= factor;
                }
            }

            // A. Hand Collision Proxy Detection
            if (this.targetHandGroup && !this.hasHitHandOrStumps) {
                const handPos = this.targetHandGroup.position;
                const distX = Math.abs(this.position.x - handPos.x);
                const distY = Math.abs(this.position.y - handPos.y);
                const distZ = Math.abs(this.position.z - handPos.z);

                if (distX < 0.65 && distY < 0.65 && distZ < 0.55) {

                    this.hasHitHandOrStumps = true;
                    this.contactPosition = this.position.clone();

                    // Record contact moment as peak swing time and speed
                    this.peakSwingTime = Date.now();
                    this.peakSwingSpeed = Math.max(this.peakSwingSpeed, this.targetHandGroup.swingSpeed ?? 0);

                    // ══════════════════════════════════════════════
                    // READ HAND STATE AT CONTACT
                    // ══════════════════════════════════════════════
                    const swing = Math.max(0, Math.min(1, this.targetHandGroup.swingSpeed ?? 0.4));
                    const handVX = this.targetHandGroup.swingVX ?? 0;  // world units/sec, +ve = right
                    const handVY = this.targetHandGroup.swingVY ?? 0;  // world units/sec, -ve = down = forward swing

                    // ══════════════════════════════════════════════
                    // EDGE DETECTION
                    // Normalise contact offset to hitbox half-size:
                    //   0.0 = dead centre (sweet spot)
                    //   1.0 = outer boundary of hitbox (thick edge)
                    // ══════════════════════════════════════════════
                    const normOffX = distX / 0.65;   // 0-1 (updated for larger hitbox)
                    const normOffY = distY / 0.65;   // 0-1
                    const edgeness = Math.sqrt(normOffX * normOffX + normOffY * normOffY); // 0 = center, ~1.4 = far corner
                    const isEdge = edgeness > 0.60; // outside ~60% of hitbox = edge
                    const isThickEdge = edgeness > 0.85;

                    // Sign of horizontal miss tells us which edge (off or leg side)
                    const edgeSideSign = (this.position.x - handPos.x) >= 0 ? 1 : -1;

                    // ══════════════════════════════════════════════
                    // DIRECTION PHYSICS
                    // Coordinate system:
                    //   -Z = toward field (straight drive direction)
                    //   +Z = behind batsman (keeper / slip cordon)
                    //   ±X = off side / leg side
                    //
                    // handVY < 0  → hand moving DOWN  → forward drive  → ball goes in -Z
                    // handVY > 0  → hand lifting UP    → defensive/scoop → ball may go +Z
                    // handVX ±    → lateral swing direction → ball deflects on X axis
                    // ══════════════════════════════════════════════

                    let newVX, newVY_ball, newVZ;
                    let timing, quality;

                    if (isEdge) {
                        // ── EDGE CONTACT ──────────────────────────────────
                        // Thick edge: squirts wide + low
                        // Thin edge: glancing deflection to slip/fine-leg
                        // Increased base speed and edgePower so edges don't always result in 1 run
                        const edgePower = 0.55 + (1.0 - edgeness) * 0.4;

                        if (isThickEdge) {
                            newVX = edgeSideSign * (12 + Math.random() * 12);
                            newVZ = (Math.random() > 0.45 ? -1 : 1) * (6 + Math.random() * 8);
                            newVY_ball = 3.5 + Math.random() * 4;
                        } else {
                            newVX = edgeSideSign * (6 + Math.random() * 9) + handVX * 0.8;
                            newVZ = (Math.random() > 0.35 ? 1 : -1) * (4 + Math.random() * 7);
                            newVY_ball = 4 + Math.random() * 5;
                        }

                        newVX *= edgePower;
                        newVZ *= edgePower;
                        newVY_ball *= (0.6 + edgePower * 0.4);

                        timing = 'edge';
                        quality = 0.2 + (1 - edgeness) * 0.3;

                        // console.log(`⚠️ EDGE | edgeness:${edgeness.toFixed(2)} thick:${isThickEdge}`);

                    } else {
                        // ── MIDDLE OF BAT ─────────────────────────────────
                        //
                        // DIRECTION: handVY < 0 (swinging DOWN) → forward drive (−Z)
                        //            handVY > 0 (lifting UP)    → scoop/glance (+Z)
                        //            handVX ±                   → off/leg side
                        //
                        // Normalise: hard downswing VY ≈ −4 to −8 world units/sec
                        const fwdFactor = -handVY / 6.0;  // +ve = forward, −ve = backward

                        const zSign = fwdFactor > 0.25 ? -1.0
                            : fwdFactor < -0.20 ? +1.0
                                : -(0.5 + Math.random() * 0.4);

                        // ── FIXED LAUNCH SPEEDS (units/sec) ───────────────
                        let launchZ;

                        // Lateral: hand swing direction + contact-point offset (scaled down)
                        newVX = handVX * 3.8 + (this.position.x - handPos.x) * 15;

                        if (swing < 0.14) {
                            // ── Defensive / 1 run ──
                            newVY_ball = 1.5 + Math.random() * 1.0;   // low arc
                            launchZ = 4 + swing * 10;              // 4 – 5.5
                            newVX *= 0.35;
                            timing = 'defensive'; quality = 0.25 + swing;
                        } else if (swing < 0.35) {
                            // ── 2–3 runs ──
                            const t = (swing - 0.14) / 0.21;
                            newVY_ball = 2.0 + t * 1.5;                // 2.0 – 3.5
                            launchZ = 8 + t * 8;                  // 8 – 16
                            newVX *= (0.55 + t * 0.20);
                            timing = 'good'; quality = 0.48 + t * 0.22;
                        } else if (swing < 0.78) {
                            // ── FOUR territory ──
                            const t = (swing - 0.35) / 0.43;
                            newVY_ball = 2.5 + t * 2.0;                // 2.5 – 4.5
                            launchZ = 20 + t * 10; // 20 – 30
                            newVX *= (0.75 + t * 0.25);
                            timing = 'perfect'; quality = 0.72 + t * 0.15;
                        } else {
                            // ── SIX territory ──
                            const t = (swing - 0.78) / 0.22;
                            newVY_ball = 9.0 + t * 7.0;                // 9.0 – 16.0
                            launchZ = 28 + t * 15;                 // 28 – 43
                            newVX *= (1.0 + t * 0.30);
                            timing = 'perfect'; quality = 0.88 + t * 0.12;
                        }

                        newVZ = zSign * launchZ;

                        // console.log(`🏏 Swing:${(swing*100).toFixed(0)}% fwd:${fwdFactor.toFixed(2)} launchZ:${launchZ.toFixed(1)} newVZ:${newVZ.toFixed(1)} newVY:${newVY_ball.toFixed(1)}`);
                    }

                    // Apply computed velocities
                    this.velocity.x = newVX;
                    this.velocity.y = newVY_ball;
                    this.velocity.z = newVZ;

                    // Classify and emit
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

                    EventBus.emit(EventBus.GAME_EVENTS.SHOT_PLAYED, {
                        shotType: shotClass.shotType,
                        power: shotClass.power,
                        direction: shotClass.direction,
                        timing,
                        quality,
                        swingSpeed: swing,
                        edgeness,
                        position: this.position.clone(),
                        velocity: this.velocity.clone()
                    });

                    const shotEmoji = this._getShotEmoji(shotClass.shotType);
                    // console.log(`${shotEmoji} ${shotClass.shotType} - ${timing.toUpperCase()} - Power: ${shotClass.power.toFixed(0)}%`);

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
                        const { timingDiff, timingText, noSwing } = this.getTimingData();
                        this.uiModule.registerWicket();
                        this.uiModule.showTimingMeter(timingDiff, timingText, noSwing, "BOWLED! OUT! 🛑", "#FF3333");
                    }

                    setTimeout(() => { this.resetDelivery(true); }, 2000);
                    return;
                }
            }

            // C. LIVE BOUNDARY ROPE DETECTION
            if (this.hasHitHandOrStumps && !this.boundaryRegistered && !(this.targetWicketsModule && this.targetWicketsModule.isSmashed)) {
                const distanceFromCenter = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);

                if (distanceFromCenter >= this.BOUNDARY_RADIUS) {
                    this.boundaryRegistered = true;

                    const { timingDiff, timingText, noSwing } = this.getTimingData();

                    if (this.hasHitGroundAfterStroke) {
                        // Emit boundary.four event
                        EventBus.emit(EventBus.GAME_EVENTS.BOUNDARY_FOUR, {
                            position: this.position.clone(),
                            distance: distanceFromCenter
                        });
                        if (this.uiModule) {
                            this.uiModule.addRuns(4);
                            this.uiModule.showTimingMeter(timingDiff, timingText, noSwing, "FOUR! 🏏", "#33CCFF", this.contactPosition, this.position);
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
                            this.uiModule.showTimingMeter(timingDiff, timingText, noSwing, "SIX! ⚡", "#33FF33", this.contactPosition, this.position);
                        }
                    }

                    setTimeout(() => { this.resetDelivery(true); }, 1200);
                    return;
                }
            }

            this.ballMesh.position.copyFrom(this.position);

            // D. IN-FIELD RUN SCORING & DISMISSAL RESETS
            // Only runs if the ball was hit by the bat and not a wicket
            if (this.hasHitHandOrStumps && !(this.targetWicketsModule && this.targetWicketsModule.isSmashed)) {
                // Ball is out-of-play when it stops rolling on the ground
                const isRollingOnGround = this.position.y <= ballRadius + 0.1 && Math.abs(this.velocity.y) < 0.5;
                const hSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
                const outOfPlay = isRollingOnGround && hSpeed < 0.25;

                if (!this.boundaryRegistered && outOfPlay) {
                    this.boundaryRegistered = true;

                    // 2D ground distance from where contact happened
                    const travelDist = this.contactPosition ? Math.sqrt(
                        Math.pow(this.position.x - this.contactPosition.x, 2) +
                        Math.pow(this.position.z - this.contactPosition.z, 2)
                    ) : Math.sqrt(
                        this.position.x * this.position.x +
                        this.position.z * this.position.z
                    );

                    // Thresholds calibrated for 2D distance from contact point:
                    //   very gentle block/defense → stops < 3u  → 0 runs (Dot ball)
                    //   gentle hit                → stops 3-10u → 1 run
                    //   medium hit                → stops 10-20u → 2 runs
                    //   hard hit                  → stops > 20u → 3 runs
                    let runsScored = 1;
                    if (travelDist < 3.0) runsScored = 0;
                    else if (travelDist >= 20.0) runsScored = 3;
                    else if (travelDist >= 10.0) runsScored = 2;

                    EventBus.emit(EventBus.GAME_EVENTS.RUNS_SCORED, {
                        runs: runsScored,
                        position: this.position.clone(),
                        distance: travelDist
                    });

                    if (this.uiModule) {
                        const { timingDiff, timingText, noSwing } = this.getTimingData();
                        this.uiModule.addRuns(runsScored);
                        const outcomeText = runsScored === 0 ? "DOT BALL" : runsScored === 1 ? `1 RUN` : `${runsScored} RUNS! 🏃`;
                        const outcomeColor = runsScored === 0 ? "#888888" : runsScored === 3 ? "#FFAA00" : "#33FF99";
                        this.uiModule.showTimingMeter(timingDiff, timingText, noSwing, outcomeText, outcomeColor, this.contactPosition, this.position);
                    }

                    setTimeout(() => { this.resetDelivery(true); }, 1500);
                }
            } else if (!this.hasHitHandOrStumps && !this.boundaryRegistered && (this.position.z > 12 || this.position.z < -45)) {
                // Ball passed batsman without contact — no runs
                this.boundaryRegistered = true;
                if (this.uiModule) {
                    const { timingDiff, timingText, noSwing } = this.getTimingData();
                    this.uiModule.incrementBall();
                    this.uiModule.showTimingMeter(timingDiff, timingText, noSwing, "DOT BALL", "#888888");
                }
                setTimeout(() => { this.resetDelivery(true); }, 1500);
            }
        });
    }

    resetDelivery(autoBowl = false) {
        // Clear any active auto-bowl timer
        if (this.bowlTimeout) {
            clearTimeout(this.bowlTimeout);
            this.bowlTimeout = null;
        }

        // Reset common delivery flags
        this.hasHitHandOrStumps = false;
        this.hasHitGroundAfterStroke = false;
        this.boundaryRegistered = false;
        this.contactPosition = null;

        // Common next delivery preparation
        const randomPace = 22 + Math.random() * 6;
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

        // Freeze ball if autoBowl is active (released by bowler reaching the crease)
        this.isBallReadyToBowl = !autoBowl;
        this.bowlingStartTime = null;
        this.idealContactTime = null;
        this.peakSwingSpeed = 0;
        this.peakSwingTime = 0;

        // Notify other modules that the ball has reset
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
                if (Math.abs(timingDiff) <= 40) {
                    timingText = "PERFECT";
                } else if (Math.abs(timingDiff) <= 100) {
                    timingText = "GOOD";
                } else if (timingDiff < 0) {
                    if (timingDiff < -180) {
                        timingText = "TOO EARLY";
                    } else {
                        timingText = "EARLY";
                    }
                } else {
                    if (timingDiff > 180) {
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