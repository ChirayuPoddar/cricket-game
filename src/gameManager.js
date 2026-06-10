// src/gameManager.js
import { GameEngine } from './core/engine.js';
import { GameScene } from './core/scene.js';
import EnvironmentCamera from './environment/camera.js';
import EnvironmentLights from './environment/lights.js';
import EnvironmentSky from './environment/sky.js';
import EnvironmentGround from './environment/ground.js';
import EnvironmentStadium from './environment/stadium.js';
import EnvironmentWickets from './environment/wickets.js';
import EnvironmentHand from './environment/hand.js';
import EnvironmentBall from './environment/ball.js';
import GameUI from './ui/scoreboard.js';

export default class GameManager {
    constructor(canvasId) {
        this.engineModule = new GameEngine(canvasId);
        this.engine = this.engineModule.initialize();
        this.scene = new GameScene(this.engine).create();
    }

    async start() {
        // 1. Setup Environment
        const camera = new EnvironmentCamera(this.scene, this.engineModule.canvas).setup();
        const { shadowGenerator } = new EnvironmentLights(this.scene).setup();

        new EnvironmentSky(this.scene).setup();
        new EnvironmentGround(this.scene).setup();
        new EnvironmentStadium(this.scene).setup();

        // 2. Setup Gameplay
        const ui = new GameUI();
        ui.setup();

        const wickets = new EnvironmentWickets(this.scene, shadowGenerator);
        wickets.setup();

        const hand = new EnvironmentHand(this.scene);
        const handGroup = hand.setup();

        const ball = new EnvironmentBall(this.scene, shadowGenerator);
        ball.setup(handGroup, wickets, ui, camera);

        // 3. Start
        this.engineModule.startRenderLoop(this.scene);
        // console.log("Game Manager: Initialization Complete.");
    }
}