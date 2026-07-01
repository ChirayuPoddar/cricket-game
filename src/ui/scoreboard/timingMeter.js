import { TIMING_COLUMNS_COUNT, getTimingLabelStyles } from './constants.js';
import { drawWagonWheel } from './wagonWheel.js';

export function showTimingMeter(ui, timingDiff, timingText, noSwing = false, outcomeText = "", outcomeColor = "#ffffff", contactPos = null, finalPos = null) {
    if (!ui.timingMeterContainer) return;

    let activeIndex = 10; // default to center

    if (!noSwing) {
        const clampedDiff = Math.max(-250, Math.min(250, timingDiff));
        activeIndex = Math.round(((clampedDiff + 250) / 500) * (TIMING_COLUMNS_COUNT - 1));
    }

    let colsHtml = '';
    for (let i = 0; i < TIMING_COLUMNS_COUNT; i++) {
        const distanceFromCenter = Math.abs(i - 10);
        const height = 30 - distanceFromCenter * 1.8;

        let colColor = "#00f5d4"; // Center: Cyan/Green
        if (i <= 3 || i >= 17) {
            colColor = "#ff007f"; // Edges: Pink/Magenta
        } else if (i <= 7 || i >= 13) {
            colColor = "#9b5de5"; // Mid: Purple
        }

        const isIndicator = i === activeIndex && !noSwing;
        const finalBgColor = isIndicator ? "#000000" : colColor;
        const finalBorder = isIndicator ? "2px solid #ffffff" : "none";
        const finalShadow = isIndicator ? "0 0 8px rgba(255,255,255,0.8)" : "none";

        colsHtml += `
            <div style="
                width: 6px;
                height: ${height}px;
                background-color: ${finalBgColor};
                border: ${finalBorder};
                box-shadow: ${finalShadow};
                margin: 0 2px;
                border-radius: 2px;
                transition: all 0.2s ease;
            "></div>
        `;
    }

    const { labelBgColor, labelTextColor } = getTimingLabelStyles(timingText);

    let radarHtml = "";
    if (contactPos && finalPos) {
        radarHtml = `
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #8cd6ff; margin: 10px 0 5px 0; font-weight: bold;">Shot Trajectory Map</div>
            <canvas id="wagonWheelCanvas" width="260" height="260" style="
                background: rgba(0, 0, 0, 0.4);
                border: 2px dashed rgba(0, 255, 200, 0.25);
                border-radius: 50%;
                margin-bottom: 15px;
                box-shadow: 0 0 15px rgba(0, 255, 200, 0.1);
            "></canvas>
        `;
    }

    ui.timingMeterContainer.innerHTML = `
        <div style="
            background: linear-gradient(135deg, rgba(15, 25, 50, 0.96), rgba(5, 10, 25, 0.98));
            border: 2px solid ${outcomeColor};
            box-shadow: 0 10px 30px ${outcomeColor}40;
            border-radius: 16px;
            padding: 30px;
            text-align: center;
            max-width: 460px;
            width: 90%;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #ffffff;
            animation: modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            display: flex;
            flex-direction: column;
            align-items: center;
        ">
            <div style="
                font-size: 28px;
                font-weight: 900;
                color: ${outcomeColor};
                text-transform: uppercase;
                margin-bottom: 10px;
                letter-spacing: 2px;
                text-shadow: 0 0 12px ${outcomeColor}50;
            ">${outcomeText}</div>
            
            ${radarHtml}

            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #aaa; margin: 5px 0 10px 0; font-weight: bold;">Swing Timing Feedback</div>
            
            <div style="
                display: flex;
                align-items: flex-end;
                height: 35px;
                padding: 0 10px;
                margin-bottom: 12px;
            ">
                ${colsHtml}
            </div>
            
            <div style="
                background: ${labelBgColor};
                color: ${labelTextColor};
                padding: 6px 22px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                border: 1px solid rgba(255,255,255,0.15);
                margin-bottom: 20px;
            ">${timingText}</div>

            <div id="deliveryCountdown" style="
                font-size: 12px;
                color: #8cd6ff;
                text-transform: uppercase;
                letter-spacing: 1px;
            ">Next delivery in 3s...</div>
        </div>
    `;

    ui.timingMeterContainer.style.display = "flex";
    ui.timingMeterContainer.style.animation = "modalFadeIn 0.2s ease-out";

    if (contactPos && finalPos) {
        drawWagonWheel(outcomeColor, contactPos, finalPos);
    }

    let timeLeft = 3;
    const countdownEl = document.getElementById("deliveryCountdown");

    if (ui.deliveryTimer) {
        clearInterval(ui.deliveryTimer);
    }

    ui.deliveryTimer = setInterval(() => {
        if (window.gamePaused) return;
        timeLeft--;
        if (timeLeft <= 0) {
            clearInterval(ui.deliveryTimer);
            ui.deliveryTimer = null;
            ui.timingMeterContainer.style.display = "none";
        } else {
            if (countdownEl) {
                countdownEl.innerHTML = `Next delivery in ${timeLeft}s...`;
            }
        }
    }, 1000);
}
