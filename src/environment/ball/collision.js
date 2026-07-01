import EventBus from '../../core/EventBus.js';
import ShotClassifier from '../../gameplay/ShotClassifier.js';

export function checkBatCollision(ball) {
    if (!ball.targetHandGroup || ball.hasHitHandOrStumps) return;

    const handPos = ball.targetHandGroup.position;
    const distX = Math.abs(ball.position.x - handPos.x);
    const distY = Math.abs(ball.position.y - handPos.y);
    const distZ = Math.abs(ball.position.z - handPos.z);

    if (distX < 1.8 && distY < 1.8 && distZ < 2.5) {
        ball.hasHitHandOrStumps = true;
        ball.contactPosition = ball.position.clone();

        // Record contact moment as peak swing time and speed
        ball.peakSwingTime = Date.now();
        ball.peakSwingSpeed = Math.max(ball.peakSwingSpeed, ball.targetHandGroup.swingSpeed ?? 0);

        const swing = Math.max(0, Math.min(1, ball.targetHandGroup.swingSpeed ?? 0.4));
        const handVX = ball.targetHandGroup.swingVX ?? 0;
        const handVY = ball.targetHandGroup.swingVY ?? 0;

        const normOffX = distX / 1.8;
        const normOffY = distY / 1.8;
        const edgeness = Math.sqrt(normOffX * normOffX + normOffY * normOffY) * 0.6;
        const isEdge = edgeness > 0.60;
        const isThickEdge = edgeness > 0.85;

        const edgeSideSign = (ball.position.x - handPos.x) >= 0 ? 1 : -1;

        let newVX, newVY_ball, newVZ;
        let timing, quality;

        if (isEdge) {
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
        } else {
            const fwdFactor = -handVY / 6.0;
            const zSign = fwdFactor > 0.25 ? -1.0
                : fwdFactor < -0.20 ? +1.0
                    : -(0.5 + Math.random() * 0.4);

            let launchZ;
            newVX = handVX * 3.8 + (ball.position.x - handPos.x) * 15;

            if (swing < 0.14) {
                newVY_ball = 1.5 + Math.random() * 1.0;
                launchZ = 4 + swing * 10;
                newVX *= 0.35;
                timing = 'defensive'; quality = 0.25 + swing;
            } else if (swing < 0.35) {
                const t = (swing - 0.14) / 0.21;
                newVY_ball = 2.0 + t * 1.5;
                launchZ = 8 + t * 8;
                newVX *= (0.55 + t * 0.20);
                timing = 'good'; quality = 0.48 + t * 0.22;
            } else if (swing < 0.78) {
                const t = (swing - 0.35) / 0.43;
                newVY_ball = 2.5 + t * 2.0;
                launchZ = 20 + t * 10;
                newVX *= (0.75 + t * 0.25);
                timing = 'perfect'; quality = 0.72 + t * 0.15;
            } else {
                const t = (swing - 0.78) / 0.22;
                newVY_ball = 9.0 + t * 7.0;
                launchZ = 28 + t * 15;
                newVX *= (1.0 + t * 0.30);
                timing = 'perfect'; quality = 0.88 + t * 0.12;
            }

            newVZ = zSign * launchZ;
        }

        ball.velocity.x = newVX;
        ball.velocity.y = newVY_ball;
        ball.velocity.z = newVZ;

        const classifier = window.shotClassifier || new ShotClassifier();
        const shotClass = classifier.classify({
            velocity: ball.velocity,
            position: ball.position,
            handPosition: handPos,
            timing: timing
        }, {
            position: ball.position,
            velocity: ball.velocity
        });

        EventBus.emit(EventBus.GAME_EVENTS.SHOT_PLAYED, {
            shotType: shotClass.shotType,
            power: shotClass.power,
            direction: shotClass.direction,
            timing,
            quality,
            swingSpeed: swing,
            edgeness,
            position: ball.position.clone(),
            velocity: ball.velocity.clone()
        });

        if (ball.cameraModule) ball.cameraModule.startTracking();
    }
}
