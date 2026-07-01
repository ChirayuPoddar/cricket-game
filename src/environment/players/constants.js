export const MODEL_ROTATION_OFFSET = 0;
export const MODEL_ROTATION_X = Math.PI / 2;

export const BOWLER_RUN_START = { x: 0.6, y: 0, z: -18.5 };
export const BOWLER_CREASE = { x: 0.6, y: 0, z: -12.0 };
export const BOWLER_SPEED = 3.25; // Speed during run-up (m/s)
export const CHASE_SPEED = 7.5; // Fielder sprint speed (m/s)

export const DEFAULT_FIELDERS = [
    { name: "Mid On",           pos: { x: 9.0, y: 0, z: 13.74 } },
    { name: "Mid Off",          pos: { x: -9.0, y: 0, z: 13.74 } },
    { name: "Point",            pos: { x: -17.64, y: 0, z: 1.2 } },
    { name: "Cover",            pos: { x: -12.73, y: 0, z: -14.59 } },
    { name: "Deep Point",       pos: { x: -34.5, y: 0, z: -1.86 } },
    { name: "Long Off",         pos: { x: -17.25, y: 0, z: -31.74 } },
    { name: "Long On",          pos: { x: 17.25, y: 0, z: -31.74 } },
    { name: "Deep Mid Wicket",  pos: { x: 31.26, y: 0, z: -16.45 } },
    { name: "Deep Square Leg",  pos: { x: 33.98, y: 0, z: 4.14 } }
];
