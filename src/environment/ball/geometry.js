import { BALL_DIAMETER } from './constants.js';

export function createBallGeometry(ball) {
    ball.ballMesh = BABYLON.MeshBuilder.CreateSphere("cricketBall", {
        diameter: BALL_DIAMETER,
        segments: 16
    }, ball.scene);
    ball.ballMesh.position = ball.position.clone();

    if (ball.shadowGenerator) {
        ball.shadowGenerator.addShadowCaster(ball.ballMesh);
    }
}

export function applyBallMaterial(ball) {
    const ballMaterial = new BABYLON.StandardMaterial("ballMaterial", ball.scene);
    ballMaterial.diffuseColor = new BABYLON.Color3(0.85, 0.05, 0.05);
    ballMaterial.specularColor = new BABYLON.Color3(0.6, 0.6, 0.6);
    ball.ballMesh.material = ballMaterial;
}
