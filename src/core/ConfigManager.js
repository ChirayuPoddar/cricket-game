/**
 * ConfigManager - Centralized configuration management
 * Loads physics.config.json and provides typed access to all game constants
 * 
 * Usage:
 *   const gravity = ConfigManager.get('physics.gravity')
 *   const handDistance = ConfigManager.get('collision.hand.distanceX')
 *   const presets = ConfigManager.getDifficulty('hard')
 */

export default class ConfigManager {
  static #config = null;
  static #configPath = './src/config/physics.config.json';
  static #isLoaded = false;
  static #observers = [];

  /**
   * Load configuration from JSON file
   * @returns {Promise<void>}
   */
  static async load() {
    if (this.#isLoaded) return;
    
    try {
      const response = await fetch(this.#configPath);
      if (!response.ok) {
        console.error(`Failed to load config: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP ${response.status}`);
      }
      
      this.#config = await response.json();
      this.#isLoaded = true;
      console.log('✓ ConfigManager loaded successfully', this.#config);
      this.#notifyObservers('loaded', this.#config);
    } catch (error) {
      console.error('✗ ConfigManager failed to load:', error);
      this.#initializeDefaults();
    }
  }

  /**
   * Initialize default config if file load fails
   * Ensures game can run without config file (with defaults)
   * @private
   */
  static #initializeDefaults() {
    this.#config = {
      physics: {
        gravity: -9.8,
        ballDiameter: 0.072,
        ballMass: 0.156
      },
      collision: {
        hand: { distanceX: 0.35, distanceY: 0.35, distanceZ: 0.30 },
        wicket: { distanceZ: 0.15, distanceX: 0.12 },
        boundary: { radius: 40.0 }
      },
      physics_behavior: {
        bounceCoefficient: 0.65,
        strikeForceMultiplier: 2.5
      },
      difficulty_presets: {
        easy: { gravityScale: 0.8, speedScale: 0.8 },
        normal: { gravityScale: 1.0, speedScale: 1.0 },
        hard: { gravityScale: 1.2, speedScale: 1.3 }
      }
    };
    
    this.#isLoaded = true;
    console.warn('⚠️  ConfigManager using default values (config file not found)');
  }

  /**
   * Get configuration value using dot notation
   * @param {string} path - Path to config value (e.g., 'physics.gravity', 'collision.hand.distanceX')
   * @param {*} defaultValue - Value to return if path not found
   * @returns {*} Configuration value
   */
  static get(path, defaultValue = null) {
    if (!this.#isLoaded) {
      console.warn('ConfigManager not yet loaded. Call ConfigManager.load() first.');
      return defaultValue;
    }

    const keys = path.split('.');
    let value = this.#config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        console.warn(`Config path not found: ${path}. Using default: ${defaultValue}`);
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * Get entire configuration object (read-only)
   * @returns {object} Full configuration
   */
  static getAll() {
    if (!this.#isLoaded) {
      console.warn('ConfigManager not yet loaded.');
      return {};
    }
    return JSON.parse(JSON.stringify(this.#config)); // Return deep copy
  }

  /**
   * Get difficulty preset by name
   * @param {string} difficulty - 'easy', 'normal', or 'hard'
   * @returns {object} Difficulty preset configuration
   */
  static getDifficulty(difficulty = 'normal') {
    return this.get(`difficulty_presets.${difficulty}`, this.get('difficulty_presets.normal'));
  }

  /**
   * Get all difficulty presets
   * @returns {object} All difficulty presets
   */
  static getAllDifficulties() {
    return this.get('difficulty_presets', {});
  }

  /**
   * Set a configuration value at runtime
   * Useful for dynamic difficulty scaling or testing
   * 
   * @param {string} path - Path to config value
   * @param {*} value - New value
   * @returns {boolean} Success status
   */
  static set(path, value) {
    if (!this.#isLoaded) {
      console.error('ConfigManager not loaded.');
      return false;
    }

    const keys = path.split('.');
    const lastKey = keys.pop();
    let obj = this.#config;

    // Navigate to parent object
    for (const key of keys) {
      if (!(key in obj)) {
        obj[key] = {};
      }
      obj = obj[key];
    }

    const oldValue = obj[lastKey];
    obj[lastKey] = value;
    
    console.log(`Config updated: ${path} = ${value} (was: ${oldValue})`);
    this.#notifyObservers('changed', { path, oldValue, newValue: value });
    
    return true;
  }

  /**
   * Subscribe to configuration changes
   * @param {Function} callback - Called when config changes: callback(eventType, data)
   * @returns {Function} Unsubscribe function
   */
  static onChange(callback) {
    this.#observers.push(callback);
    
    return () => {
      const index = this.#observers.indexOf(callback);
      if (index > -1) {
        this.#observers.splice(index, 1);
      }
    };
  }

  /**
   * Notify all observers of configuration changes
   * @private
   */
  static #notifyObservers(eventType, data) {
    for (const observer of this.#observers) {
      try {
        observer(eventType, data);
      } catch (error) {
        console.error('Error in config observer:', error);
      }
    }
  }

  /**
   * Reset configuration to file defaults
   * Useful for testing or hard reset
   */
  static async reset() {
    this.#isLoaded = false;
    this.#config = null;
    await this.load();
    this.#notifyObservers('reset', null);
  }

  /**
   * Export current configuration for debugging
   * @returns {string} JSON string of config
   */
  static export() {
    return JSON.stringify(this.#config, null, 2);
  }

  /**
   * Check if configuration is loaded
   * @returns {boolean}
   */
  static isReady() {
    return this.#isLoaded;
  }
}
