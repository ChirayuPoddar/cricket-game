import { BALL_DIAMETER, GRAVITY } from './constants.js';

export function updatePhysics(ball, deltaTime) {
    ball.velocity.y += GRAVITY * deltaTime;
    ball.velocity.x += ball.swingForce * deltaTime;

    // AIR RESISTANCE (always, small)
    if (ball.hasHitHandOrStumps) {
        ball.velocity.x *= 0.998;
        ball.velocity.z *= 0.998;
    }

    ball.position.x += ball.velocity.x * deltaTime;
    ball.position.y += ball.velocity.y * deltaTime;
    ball.position.z += ball.velocity.z * deltaTime;

    // GROUND BOUNCE + FRICTION
    const ballRadius = BALL_DIAMETER / 2;
    if (ball.position.y <= ballRadius) {
        ball.position.y = ballRadius;

        if (Math.abs(ball.velocity.y) > 0.4) {
            // Real bounce — reverse with restitution
            ball.velocity.y = -ball.velocity.y * 0.60;

            if (ball.hasHitHandOrStumps) {
                // Each bounce robs ~14% of horizontal speed (grass contact)
                ball.velocity.x *= 0.86;
                ball.velocity.z *= 0.86;
            }
        } else {
            // Ball is now rolling — kill vertical oscillation
            ball.velocity.y = 0;
        }

        ball.swingForce *= 0.1;
        if (ball.hasHitHandOrStumps) {
            ball.hasHitGroundAfterStroke = true;
        }
    }

    // ROLLING DECELERATION (grass friction while on ground)
    if (ball.hasHitHandOrStumps &&
        ball.position.y <= ballRadius + 0.08 &&
        Math.abs(ball.velocity.y) < 0.5) {

        const hSpeed = Math.sqrt(
            ball.velocity.x * ball.velocity.x +
            ball.velocity.z * ball.velocity.z
        );
        if (hSpeed > 0.05) {
            const reduction = Math.min(hSpeed, 3.2 * deltaTime);
            const factor = (hSpeed - reduction) / hSpeed;
            ball.velocity.x *= factor;
            ball.velocity.z *= factor;
        }
    }
}
