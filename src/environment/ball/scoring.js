import EventBus from '../../core/EventBus.js';
import { BALL_DIAMETER, BOUNDARY_RADIUS } from './constants.js';

export function checkWicketsAndScoring(ball) {
    const ballRadius = BALL_DIAMETER / 2;

    // 1. Wicket Collision Checks
    if (ball.targetWicketsModule && !ball.targetWicketsModule.isSmashed && !ball.hasHitHandOrStumps) {
        const wicketZ = ball.targetWicketsModule.Z_POSITION;
        const wicketHeight = ball.targetWicketsModule.STUMP_HEIGHT;

        if (Math.abs(ball.position.z - wicketZ) < 0.15 &&
            ball.position.y < wicketHeight &&
            Math.abs(ball.position.x) < 0.12) {

            ball.hasHitHandOrStumps = true;
            ball.targetWicketsModule.triggerBowled();
            ball.velocity.set(0, 1.5, 3.0);

            EventBus.emit(EventBus.GAME_EVENTS.WICKET_DOWN, {
                dismissalType: 'bowled',
                position: ball.position.clone()
            });

            if (ball.uiModule) {
                const { timingDiff, timingText, noSwing } = ball.getTimingData();
                ball.uiModule.registerWicket();
                ball.uiModule.showTimingMeter(timingDiff, timingText, noSwing, "BOWLED! OUT! 🛑", "#FF3333");
            }

            setTimeout(() => { ball.resetDelivery(true); }, 2000);
            return true;
        }
    }

    // 2. LIVE BOUNDARY ROPE DETECTION
    if (ball.hasHitHandOrStumps && !ball.boundaryRegistered && !(ball.targetWicketsModule && ball.targetWicketsModule.isSmashed)) {
        const dz = ball.position.z - (-1.86);
        const distanceFromCenter = Math.sqrt(ball.position.x * ball.position.x + dz * dz);

        if (distanceFromCenter >= BOUNDARY_RADIUS) {
            ball.boundaryRegistered = true;

            const { timingDiff, timingText, noSwing } = ball.getTimingData();

            if (ball.hasHitGroundAfterStroke) {
                EventBus.emit(EventBus.GAME_EVENTS.BOUNDARY_FOUR, {
                    position: ball.position.clone(),
                    distance: distanceFromCenter
                });
                if (ball.uiModule) {
                    ball.uiModule.addRuns(4);
                    ball.uiModule.showTimingMeter(timingDiff, timingText, noSwing, "FOUR! 🏏", "#33CCFF", ball.contactPosition, ball.position);
                }
            } else {
                EventBus.emit(EventBus.GAME_EVENTS.BOUNDARY_SIX, {
                    position: ball.position.clone(),
                    distance: distanceFromCenter,
                    airborneDistance: Math.sqrt(ball.position.x * ball.position.x + ball.position.z * ball.position.z + ball.position.y * ball.position.y)
                });
                if (ball.uiModule) {
                    ball.uiModule.addRuns(6);
                    ball.uiModule.showTimingMeter(timingDiff, timingText, noSwing, "SIX! ⚡", "#33FF33", ball.contactPosition, ball.position);
                }
            }

            setTimeout(() => { ball.resetDelivery(true); }, 1200);
            return true;
        }
    }

    // 3. IN-FIELD RUN SCORING & DISMISSAL RESETS
    if (ball.hasHitHandOrStumps && !(ball.targetWicketsModule && ball.targetWicketsModule.isSmashed)) {
        const isRollingOnGround = ball.position.y <= ballRadius + 0.1 && Math.abs(ball.velocity.y) < 0.5;
        const hSpeed = Math.sqrt(ball.velocity.x * ball.velocity.x + ball.velocity.z * ball.velocity.z);
        const outOfPlay = isRollingOnGround && hSpeed < 0.25;

        if (!ball.boundaryRegistered && outOfPlay) {
            ball.boundaryRegistered = true;

            const travelDist = ball.contactPosition ? Math.sqrt(
                Math.pow(ball.position.x - ball.contactPosition.x, 2) +
                Math.pow(ball.position.z - ball.contactPosition.z, 2)
            ) : Math.sqrt(
                ball.position.x * ball.position.x +
                Math.pow(ball.position.z - (-1.86), 2)
            );

            let runsScored = 1;
            if (travelDist < 3.0) runsScored = 0;
            else if (travelDist >= 20.0) runsScored = 3;
            else if (travelDist >= 10.0) runsScored = 2;

            EventBus.emit(EventBus.GAME_EVENTS.RUNS_SCORED, {
                runs: runsScored,
                position: ball.position.clone(),
                distance: travelDist
            });

            if (ball.uiModule) {
                const { timingDiff, timingText, noSwing } = ball.getTimingData();
                ball.uiModule.addRuns(runsScored);
                const outcomeText = runsScored === 0 ? "DOT BALL" : runsScored === 1 ? `1 RUN` : `${runsScored} RUNS! 🏃`;
                const outcomeColor = runsScored === 0 ? "#888888" : runsScored === 3 ? "#FFAA00" : "#33FF99";
                ball.uiModule.showTimingMeter(timingDiff, timingText, noSwing, outcomeText, outcomeColor, ball.contactPosition, ball.position);
            }

            setTimeout(() => { ball.resetDelivery(true); }, 1500);
            return true;
        }
    } else if (!ball.hasHitHandOrStumps && !ball.boundaryRegistered && (ball.position.z > 12 || ball.position.z < -45)) {
        ball.boundaryRegistered = true;
        if (ball.uiModule) {
            const { timingDiff, timingText, noSwing } = ball.getTimingData();
            ball.uiModule.incrementBall();
            ball.uiModule.showTimingMeter(timingDiff, timingText, noSwing, "DOT BALL", "#888888");
        }
        setTimeout(() => { ball.resetDelivery(true); }, 1500);
        return true;
    }

    return false;
}
