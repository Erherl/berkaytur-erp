/**
 * Centralized Application Configuration
 * Decouples magic strings, default values, API links, and feature flags.
 */

import { APP_INFO, ACADEMIC_YEARS, MAP_CONFIG } from '../constants';

export const APP_CONFIG = {
  APP_NAME: APP_INFO.NAME,
  DEFAULT_ACADEMIC_YEARS: ACADEMIC_YEARS.DEFAULT_OPTIONS,
  ACTIVE_ACADEMIC_YEAR: ACADEMIC_YEARS.ACTIVE_DEFAULT,
  
  // Storage Options
  STORAGE_PREFIX: 'bkt_',
  MAX_LOG_ENTRIES: 150,

  // Map defaults (Turkey, Istanbul coordinates)
  MAP_DEFAULTS: {
    DEFAULT_LAT: MAP_CONFIG.ISTANBUL_LAT,
    DEFAULT_LNG: MAP_CONFIG.ISTANBUL_LNG,
    DEFAULT_ZOOM: MAP_CONFIG.DEFAULT_ZOOM,
  },

  // Production Fallback Settings (Configured dynamically on Server via env variables)
  API: {
    SIMULATED_LATENCY_MS: 150, // Slight visual latency for smooth UI loaders
    GOOGLE_SHEETS_EXEC_URL: '',
    GOOGLE_DRIVE_FOLDER_ID: '',
  },

  // Feature Flags
  FEATURES: {
    ENABLE_REALTIME_LOGGING: true,
    ENABLE_AUDIO_WELCOME: true,
  }
};

