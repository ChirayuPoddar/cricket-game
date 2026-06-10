/**
 * ShotClassifier - Identifies shot types from hand mechanics
 * Determines shot type based on hand velocity, angle, and position
 * 
 * Supported shot types:
 *   STRAIGHT_DRIVE, COVER_DRIVE, ON_DRIVE, LOFTED_DRIVE,
 *   CUT_SHOT, PULL_SHOT, DEFENSE_BLOCK, EDGE, MIS_TIMED
 * 
 * Usage:
 *   const classifier = new ShotClassifier(config)
 *   const result = classifier.classify(handData)
 *   console.log(result.shotType, result.power, result.timing)
 */

export const ShotType = {
  STRAIGHT_DRIVE: 'STRAIGHT_DRIVE',
  COVER_DRIVE: 'COVER_DRIVE',
  ON_DRIVE: 'ON_DRIVE',
  LOFTED_DRIVE: 'LOFTED_DRIVE',
  CUT_SHOT: 'CUT_SHOT',
  PULL_SHOT: 'PULL_SHOT',
  HOOK_SHOT: 'HOOK_SHOT',
  DEFENSE_BLOCK: 'DEFENSE_BLOCK',
  EDGE: 'EDGE',
  MIS_TIMED: 'MIS_TIMED',
  UNKNOWN: 'UNKNOWN'
};

export const ShotTiming = {
  EARLY: 'EARLY',           // Before ball arrival
  GOOD: 'GOOD',             // Near optimal
  PERFECT: 'PERFECT',       // Exactly at sweet spot
  LATE: 'LATE',             // After optimal contact time
  MISTIMED: 'MISTIMED'      // Significantly off
};

export const ShotQuality = {
  POOR: 0.3,        // Edge, mis-timed
  AVERAGE: 0.6,     // Average swing
  GOOD: 0.8,        // Well-timed
  EXCELLENT: 1.0    // Perfect contact
};

export default class ShotClassifier {
  constructor(config = {}) {
    this.config = config;
    
    // Tuning parameters
    this.velocityThreshold = 0.5;     // Minimum velocity to count as shot
    this.coverDriveAngleMin = 20;     // Degrees
    this.coverDriveAngleMax = 60;
    this.onDriveAngleMin = -60;
    this.onDriveAngleMax = -20;
    this.straightDriveAngleMin = -20;
    this.straightDriveAngleMax = 20;
    this.cutShotAngleMin = 50;
    this.cutShotAngleMax = 100;
    this.pullShotYMin = 1.5;          // Waist height
    this.defensiveZVelocityMax = 0.5; // Minimal forward push
  }

  /**
   * Classify shot based on hand mechanics
   * @param {object} handData - Hand position/velocity data
   *   @param {BABYLON.Vector3} handData.position - Hand position
   *   @param {BABYLON.Vector3} handData.velocity - Hand velocity (change per frame)
   *   @param {number} handData.timestamp - Frame timestamp
   *   @param {boolean} handData.isConnected - Whether hand tracking is active
   * @param {object} ballData - Ball state at contact
   *   @param {BABYLON.Vector3} ballData.position - Ball position
   *   @param {number} ballData.arrivalTime - Estimated time for ball to reach bat
   * @returns {object} Shot classification result
   *   @returns {string} result.shotType - Type of shot
   *   @returns {number} result.power - Power/velocity (0-100)
   *   @returns {number} result.direction - Direction angle (-180 to 180)
   *   @returns {string} result.timing - Timing classification
   *   @returns {number} result.quality - Quality score (0-1)
   *   @returns {string} result.description - Human-readable description
   *   @returns {object} result.metrics - Raw metrics used for classification
   */
  classify(handData, ballData = null) {
    // Validate input
    if (!handData || !handData.position || !handData.velocity) {
      return this.#createResult(ShotType.UNKNOWN, 0, 0, ShotTiming.MISTIMED, 0);
    }

    const position = handData.position;
    const velocity = handData.velocity;

    // Calculate metrics
    const speed = velocity.length();
    const angle = this.#calculateAngle(velocity);
    const height = position.y;
    const lateralMovement = Math.abs(velocity.x);
    const forwardMovement = Math.abs(velocity.z);
    const power = Math.min(100, speed * 25); // Scale to 0-100

    // Classify based on mechanics
    let shotType = ShotType.UNKNOWN;
    let timing = ShotTiming.GOOD;
    let quality = ShotQuality.AVERAGE;

    // Check if it's actually a shot (minimum velocity)
    if (speed < this.velocityThreshold) {
      shotType = ShotType.DEFENSE_BLOCK;
      quality = ShotQuality.POOR;
      timing = ShotTiming.LATE;
    }
    // Check for driving shots
    else if (this.#isStraightDrive(angle, height, forwardMovement)) {
      shotType = ShotType.STRAIGHT_DRIVE;
      quality = this.#calculateQuality(power, ShotType.STRAIGHT_DRIVE);
    }
    else if (this.#isCoverDrive(angle, height, lateralMovement)) {
      shotType = ShotType.COVER_DRIVE;
      quality = this.#calculateQuality(power, ShotType.COVER_DRIVE);
    }
    else if (this.#isOnDrive(angle, height, lateralMovement)) {
      shotType = ShotType.ON_DRIVE;
      quality = this.#calculateQuality(power, ShotType.ON_DRIVE);
    }
    else if (this.#isLoftedDrive(height, forwardMovement, speed)) {
      shotType = ShotType.LOFTED_DRIVE;
      quality = this.#calculateQuality(power, ShotType.LOFTED_DRIVE);
    }
    // Check for cutting/pulling
    else if (this.#isCutShot(angle, height, lateralMovement)) {
      shotType = ShotType.CUT_SHOT;
      quality = this.#calculateQuality(power, ShotType.CUT_SHOT);
    }
    else if (this.#isPullShot(height, lateralMovement, angle)) {
      shotType = ShotType.PULL_SHOT;
      quality = this.#calculateQuality(power, ShotType.PULL_SHOT);
    }
    else if (this.#isHookShot(height, angle, lateralMovement)) {
      shotType = ShotType.HOOK_SHOT;
      quality = this.#calculateQuality(power, ShotType.HOOK_SHOT);
    }
    // Check for edges/mis-timed
    else if (this.#isEdge(speed, forwardMovement, lateralMovement)) {
      shotType = ShotType.EDGE;
      quality = ShotQuality.POOR;
      timing = ShotTiming.LATE;
    }
    else if (power > 50) {
      shotType = ShotType.MIS_TIMED;
      quality = ShotQuality.POOR;
      timing = ShotTiming.MISTIMED;
    }

    // Calculate timing based on contact quality
    if (quality > 0.9) timing = ShotTiming.PERFECT;
    else if (quality > 0.7) timing = ShotTiming.GOOD;
    else if (quality < 0.4) timing = ShotTiming.EARLY;

    return this.#createResult(
      shotType,
      power,
      angle,
      timing,
      quality,
      { speed, angle, height, lateralMovement, forwardMovement }
    );
  }

  /**
   * Calculate angle of hand movement (-180 to 180 degrees)
   * 0° = forward, 90° = right, -90° = left
   * @private
   */
  #calculateAngle(velocity) {
    const angleRadians = Math.atan2(velocity.x, velocity.z);
    const angleDegrees = (angleRadians * 180) / Math.PI;
    return angleDegrees;
  }

  /**
   * Check if shot matches straight drive pattern
   * Forward movement, minimal lateral movement, center height
   * @private
   */
  #isStraightDrive(angle, height, forwardMovement) {
    const angleInRange = angle >= this.straightDriveAngleMin && angle <= this.straightDriveAngleMax;
    const heightOK = height >= 1.0 && height <= 2.5;
    const forwardOK = forwardMovement > 0.8;
    
    return angleInRange && heightOK && forwardOK;
  }

  /**
   * Check if shot matches cover drive pattern
   * Right-side lateral movement, forward movement, high follow-through
   * @private
   */
  #isCoverDrive(angle, height, lateralMovement) {
    const angleInRange = angle >= this.coverDriveAngleMin && angle <= this.coverDriveAngleMax;
    const heightOK = height >= 1.5 && height <= 2.8;
    const lateralOK = lateralMovement > 0.6;
    
    return angleInRange && heightOK && lateralOK;
  }

  /**
   * Check if shot matches on drive pattern
   * Left-side lateral movement, forward movement
   * @private
   */
  #isOnDrive(angle, height, lateralMovement) {
    const angleInRange = angle >= this.onDriveAngleMin && angle <= this.onDriveAngleMax;
    const heightOK = height >= 1.5 && height <= 2.8;
    const lateralOK = lateralMovement > 0.6;
    
    return angleInRange && heightOK && lateralOK;
  }

  /**
   * Check if shot matches lofted drive pattern
   * High upward movement, good forward momentum
   * @private
   */
  #isLoftedDrive(height, forwardMovement, speed) {
    const heightOK = height >= 2.0;
    const forwardOK = forwardMovement > 0.7;
    const speedOK = speed > 2.0;
    
    return heightOK && forwardOK && speedOK;
  }

  /**
   * Check if shot matches cut shot pattern
   * Wide lateral movement to the right, high angle
   * @private
   */
  #isCutShot(angle, height, lateralMovement) {
    const angleInRange = angle >= this.cutShotAngleMin && angle <= this.cutShotAngleMax;
    const heightOK = height >= 1.5;
    const lateralOK = lateralMovement > 0.7;
    
    return angleInRange && heightOK && lateralOK;
  }

  /**
   * Check if shot matches pull shot pattern
   * Waist height or lower, high lateral velocity, downward trajectory
   * @private
   */
  #isPullShot(height, lateralMovement, angle) {
    const heightOK = height >= 0.8 && height <= this.pullShotYMin;
    const lateralOK = lateralMovement > 0.6;
    const angleOK = Math.abs(angle) > 45;
    
    return heightOK && lateralOK && angleOK;
  }

  /**
   * Check if shot matches hook shot pattern
   * Left-side pull, low height, aggressive swing
   * @private
   */
  #isHookShot(height, angle, lateralMovement) {
    const heightOK = height >= 0.5 && height <= 2.0;
    const angleOK = angle < -70;
    const lateralOK = lateralMovement > 0.7;
    
    return heightOK && angleOK && lateralOK;
  }

  /**
   * Check if shot matches edge pattern
   * Glancing blow, minimal forward movement, high lateral
   * @private
   */
  #isEdge(speed, forwardMovement, lateralMovement) {
    const speedOK = speed > 1.0;
    const forwardLow = forwardMovement < 0.4;
    const lateralHigh = lateralMovement > 0.5;
    
    return speedOK && forwardLow && lateralHigh;
  }

  /**
   * Calculate shot quality (0-1) based on shot type and mechanics
   * @private
   */
  #calculateQuality(power, shotType) {
    // Base quality on power curve
    let quality = Math.min(1.0, power / 80);
    
    // Adjust based on shot type
    const typeQualityAdjustment = {
      [ShotType.STRAIGHT_DRIVE]: 0.95,
      [ShotType.COVER_DRIVE]: 0.90,
      [ShotType.ON_DRIVE]: 0.90,
      [ShotType.LOFTED_DRIVE]: 0.85,
      [ShotType.CUT_SHOT]: 0.80,
      [ShotType.PULL_SHOT]: 0.75,
      [ShotType.DEFENSE_BLOCK]: 0.50,
      [ShotType.EDGE]: 0.30,
      [ShotType.MIS_TIMED]: 0.20
    };
    
    const adjustment = typeQualityAdjustment[shotType] || 0.5;
    return Math.min(1.0, quality * adjustment);
  }

  /**
   * Create result object
   * @private
   */
  #createResult(shotType, power, angle, timing, quality, metrics = {}) {
    const descriptions = {
      [ShotType.STRAIGHT_DRIVE]: '🎯 Straight Drive - Textbook shot!',
      [ShotType.COVER_DRIVE]: '→ Cover Drive - Elegant shot through covers',
      [ShotType.ON_DRIVE]: '← On Drive - Flowing shot toward mid-on',
      [ShotType.LOFTED_DRIVE]: '⬆️  Lofted Drive - High risk, high reward',
      [ShotType.CUT_SHOT]: '↗ Cut Shot - Risky against short delivery',
      [ShotType.PULL_SHOT]: '↙ Pull Shot - Aggressive response to short ball',
      [ShotType.HOOK_SHOT]: '↖ Hook Shot - Dangerous but exhilarating',
      [ShotType.DEFENSE_BLOCK]: '🛡️  Defensive Block - Safe play',
      [ShotType.EDGE]: '⚠️  Edge - Caught or lucky escape!',
      [ShotType.MIS_TIMED]: '❌ Mis-timed - Poor contact',
      [ShotType.UNKNOWN]: '? Unknown shot'
    };

    return {
      shotType,
      power: Math.round(power),
      direction: Math.round(angle * 10) / 10,
      timing,
      quality: Math.round(quality * 100) / 100,
      description: descriptions[shotType] || '?',
      metrics
    };
  }

  /**
   * Get shot type difficulty (1-10, where 1 is easiest, 10 is hardest)
   * @param {string} shotType
   * @returns {number} Difficulty rating
   */
  static getShotDifficulty(shotType) {
    const difficulties = {
      [ShotType.DEFENSE_BLOCK]: 2,
      [ShotType.STRAIGHT_DRIVE]: 3,
      [ShotType.ON_DRIVE]: 4,
      [ShotType.COVER_DRIVE]: 4,
      [ShotType.CUT_SHOT]: 6,
      [ShotType.PULL_SHOT]: 7,
      [ShotType.LOFTED_DRIVE]: 8,
      [ShotType.HOOK_SHOT]: 9,
      [ShotType.EDGE]: 5,
      [ShotType.MIS_TIMED]: 1,
      [ShotType.UNKNOWN]: 0
    };

    return difficulties[shotType] || 0;
  }

  /**
   * Print shot classifier statistics
   */
  printDebugInfo() {
    console.group('📊 ShotClassifier Config');
    console.log('Velocity Threshold:', this.velocityThreshold);
    console.log('Straight Drive Angle:', `${this.straightDriveAngleMin}° to ${this.straightDriveAngleMax}°`);
    console.log('Cover Drive Angle:', `${this.coverDriveAngleMin}° to ${this.coverDriveAngleMax}°`);
    console.log('On Drive Angle:', `${this.onDriveAngleMin}° to ${this.onDriveAngleMax}°`);
    console.log('Cut Shot Angle:', `${this.cutShotAngleMin}° to ${this.cutShotAngleMax}°`);
    console.log('Pull Shot Height:', `< ${this.pullShotYMin}m`);
    console.groupEnd();
  }
}
