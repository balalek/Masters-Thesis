/**
 * @fileoverview Validation constants for quiz forms and game configuration
 * 
 * This module provides:
 * - Validation rules for quiz creation (length limits, time bounds)
 * - Game type-specific configuration parameters
 * - Media file validation constraints
 * - Quiz type definitions and translations
 * - Categories for quiz classification
 * 
 * @module Constants/QuizValidation
 */

/**
 * Validation rules for quiz forms and content
 * 
 * Contains nested objects with constraints for:
 * - Text field lengths
 * - Time limits for questions and sequences
 * - Game mode configuration (rounds, timing)
 * - Media size and format restrictions
 * - Map precision settings
 * 
 * @constant
 * @type {Object}
 */
export const QUIZ_VALIDATION = {
  QUESTION_MAX_LENGTH: 100,
  ANSWER_MAX_LENGTH: 50,
  MIN_SEQUENCES: 3,
  TIME_LIMIT: {
    MIN: 5,
    MAX: 120,
    DEFAULT: 30
  },
  MATH_SEQUENCES_TIME_LIMIT: {
    MIN: 5,
    MAX: 60,
    DEFAULT: 10
  },
  WORD_CHAIN: {
    MIN_ROUNDS: 1,
    MAX_ROUNDS: 1,
    MAX_ROUNDS_QUICK_PLAY: 10,
    DEFAULT_ROUNDS: 1,
    MIN_TIME: 20,
    MAX_TIME: 60,
    DEFAULT_TIME: 40
  },
  DRAWING: {
    MIN_ROUNDS: 1,
    MAX_ROUNDS: 3,
    MAX_ROUNDS_QUICK_PLAY: 10,
    DEFAULT_ROUNDS: 1,
    MIN_TIME: 30,
    MAX_TIME: 120,
    DEFAULT_TIME: 60
  },
  QUIZ_NAME_MAX_LENGTH: 200,
  MEDIA_FILE_SIZE_LIMIT: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  ALLOWED_AUDIO_TYPES: ['audio/mpeg', 'audio/wav', 'audio/ogg'],

  BLIND_MAP: {
    RADIUS_PRESETS: {
      EASY: { exact: 0.045 },    // One extra scoring zone
      HARD: { exact: 0.03 }      // Only exact scoring
    },
    DEFAULT_PRESET: 'HARD'
  },
};

/**
 * Maximum number of players allowed in a game
 * 
 * @constant
 * @type {number}
 */
export const MAX_PLAYERS = 10;

/**
 * Extra time given to drawing players for word selection
 * Must be consistent with server-side PREVIEW_TIME_DRAWING value
 * 
 * @constant
 * @type {number}
 */
export const DRAWER_EXTRA_TIME = 8000; 

/**
 * Available categories for question classification
 * 
 * Used for categorizing questions of types:
 * - ABCD
 * - True/False
 * - Open Answer
 * - Guess a Number
 * 
 * @constant
 * @type {string[]}
 */
export const QUIZ_CATEGORIES = [
  'Historie',
  'Zeměpis',
  'Kultura',
  'Věda a technologie',
  'Sport',
  'Filmy a seriály',
  'Hudba',
  'Příroda',
  'Gastronomie',
  'Móda',
  'Slavné osobnosti',
  'Literatura',
  'Technika',
  'Mýty a legendy',
  'Různé'
];

/**
 * Quiz type identifiers used throughout the application
 * 
 * Defines the supported quiz types with string constants
 * that match the backend question type identifiers.
 * 
 * @constant
 * @type {Object}
 */
export const QUIZ_TYPES = {
  ABCD: 'ABCD',
  TRUE_FALSE: 'TRUE_FALSE',
  OPEN_ANSWER: 'OPEN_ANSWER',
  BLIND_MAP: 'BLIND_MAP',
  DRAWING: 'DRAWING',
  WORD_CHAIN: 'WORD_CHAIN',
  MATH_QUIZ: 'MATH_QUIZ',
  GUESS_A_NUMBER: 'GUESS_A_NUMBER',
  COMBINED_QUIZ: 'COMBINED_QUIZ'
};

/**
 * Question type identifiers for API interactions
 * 
 * Maps to the backend question type identifiers for
 * consistent type handling between frontend and backend.
 * 
 * @constant
 * @type {Object}
 */
export const QUESTION_TYPES = {
  ABCD: 'ABCD',
  TRUE_FALSE: 'TRUE_FALSE',
  OPEN_ANSWER: 'OPEN_ANSWER',
  WORD_CHAIN: 'WORD_CHAIN',
  BLIND_MAP: 'BLIND_MAP',
  DRAWING: 'DRAWING',
  MATH_QUIZ: 'MATH_QUIZ',
  GUESS_A_NUMBER: 'GUESS_A_NUMBER'
};

/**
 * Czech translations of quiz type names for display
 * 
 * Maps quiz type identifiers to human-readable Czech names
 * for UI presentation.
 * 
 * @constant
 * @type {Object}
 */
export const QUIZ_TYPE_TRANSLATIONS = {
  [QUIZ_TYPES.ABCD]: 'ABCD kvíz',
  [QUIZ_TYPES.TRUE_FALSE]: 'Pravda/lež',
  [QUIZ_TYPES.OPEN_ANSWER]: 'Otevřené odpovědi',
  [QUIZ_TYPES.BLIND_MAP]: 'Slepá mapa',
  [QUIZ_TYPES.DRAWING]: 'Kreslení',
  [QUIZ_TYPES.WORD_CHAIN]: 'Slovní řetěz',
  [QUIZ_TYPES.MATH_QUIZ]: 'Matematický kvíz',
  [QUIZ_TYPES.GUESS_A_NUMBER]: 'Hádej číslo',
  [QUIZ_TYPES.COMBINED_QUIZ]: 'Kombinovaný kvíz'
};