export function showOverSummary(ui) {
    ui.hideTimingMeter();
    window.gamePaused = true;

    const overNumber = Math.floor(ui.totalBalls / 6);
    let overRuns = 0;
    let overWickets = 0;
    ui.currentOverBalls.forEach(ball => {
        if (ball === 'W') overWickets++;
        else if (typeof ball === 'number') overRuns += ball;
    });

    const ballsHtml = ui.currentOverBalls.map(ball => {
        let bgColor = "#444";
        let textColor = "#fff";
        let displayVal = ball;
        let glow = "none";

        if (ball === 0) {
            bgColor = "#2c3e50";
            displayVal = "•";
        } else if (ball === 4) {
            bgColor = "#d4af37";
            textColor = "#000";
            glow = "0 0 10px #d4af37";
        } else if (ball === 6) {
            bgColor = "#00ffcc";
            textColor = "#000";
            glow = "0 0 12px #00ffcc";
        } else if (ball === 'W') {
            bgColor = "#ff3333";
            glow = "0 0 10px #ff3333";
        } else {
            bgColor = "#27ae60";
        }

        return `
            <div style="
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background-color: ${bgColor};
                color: ${textColor};
                display: flex;
                justify-content: center;
                align-items: center;
                font-size: 18px;
                font-weight: bold;
                margin: 0 6px;
                box-shadow: ${glow};
                border: 2px solid rgba(255, 255, 255, 0.1);
            ">${displayVal}</div>
        `;
    }).join('');

    ui.overSummaryContainer.innerHTML = `
        <div style="
            background: linear-gradient(135deg, rgba(15, 25, 50, 0.96), rgba(5, 10, 25, 0.98));
            border: 2px solid #00ff00;
            box-shadow: 0 10px 30px rgba(0, 255, 0, 0.25);
            border-radius: 16px;
            padding: 40px;
            text-align: center;
            max-width: 480px;
            width: 90%;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #ffffff;
            animation: modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        ">
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #00ff00; font-weight: bold; margin-bottom: 6px;">📊 Over Completed</div>
            <div style="font-size: 32px; font-weight: 900; margin-bottom: 24px; letter-spacing: -0.5px;">OVER ${overNumber} SUMMARY</div>
            
            <div style="display: flex; justify-content: center; margin-bottom: 30px;">
                ${ballsHtml}
            </div>

            <div style="
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 12px;
                padding: 20px;
                margin-bottom: 30px;
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 15px;
            ">
                <div style="text-align: center; border-right: 1px solid rgba(255,255,255,0.08);">
                    <span style="font-size: 11px; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px;">Runs Scored</span>
                    <div style="font-size: 26px; font-weight: 800; color: #00ffcc; margin-top: 4px;">+${overRuns}</div>
                </div>
                <div style="text-align: center;">
                    <span style="font-size: 11px; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px;">Wickets Taken</span>
                    <div style="font-size: 26px; font-weight: 800; color: #ff3333; margin-top: 4px;">${overWickets}</div>
                </div>
                <div style="grid-column: span 2; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 15px; text-align: center;">
                    <span style="font-size: 13px; color: #aaa;">Current Match Score</span>
                    <div style="font-size: 30px; font-weight: 900; color: #ffffff; margin-top: 4px;">${ui.runs} <span style="font-size: 20px; color: #ff3333; font-weight: 600;">/ ${ui.wickets}</span></div>
                </div>
            </div>

            <div id="nextOverCountdown" style="
                background: rgba(255, 255, 255, 0.03);
                border: 1px dashed rgba(255, 255, 255, 0.15);
                border-radius: 8px;
                padding: 12px 24px;
                font-size: 16px;
                font-weight: 800;
                color: #00ff00;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                display: inline-block;
            ">Starting Next Over in 5s... 🏏</div>
        </div>
    `;

    ui.overSummaryContainer.style.display = "flex";

    let timeLeft = 5;
    const countdownEl = document.getElementById("nextOverCountdown");

    if (ui.overTimer) {
        clearInterval(ui.overTimer);
    }

    ui.overTimer = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            clearInterval(ui.overTimer);
            ui.overTimer = null;
            ui.overSummaryContainer.style.display = "none";
            ui.currentOverBalls = [];
            window.gamePaused = false;
        } else {
            if (countdownEl) {
                countdownEl.innerHTML = `Starting Next Over in ${timeLeft}s... 🏏`;
            }
        }
    }, 1000);
}
