// Quiz validation constants
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
    MAX_ROUNDS: 1,     // Changed max to 1
    MAX_ROUNDS_QUICK_PLAY: 10,
    DEFAULT_ROUNDS: 1,
    MIN_TIME: 20,
    MAX_TIME: 60,      // Changed max to 60
    DEFAULT_TIME: 40
  },
  DRAWING: {
    MIN_ROUNDS: 1,
    MAX_ROUNDS: 3,
    MAX_ROUNDS_QUICK_PLAY: 10,
    DEFAULT_ROUNDS: 1,
    MIN_TIME: 10,
    MAX_TIME: 120, //120
    DEFAULT_TIME: 60
  },
  QUIZ_NAME_MAX_LENGTH: 200,
  MEDIA_FILE_SIZE_LIMIT: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  ALLOWED_AUDIO_TYPES: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  
  // Add Blind Map validation constants
  BLIND_MAP: {
    RADIUS_PRESETS: {
      EASY: { exact: 0.045 },    // One extra scoring zone
      HARD: { exact: 0.03 }                  // Only exact scoring
    },
    DEFAULT_PRESET: 'HARD'
  },
};

export const MAX_PLAYERS = 10;

// Extra time for the drawer in seconds - must be consistent with the server PREVIEW_TIME_DRAWING
export const DRAWER_EXTRA_TIME = 10000; 

// Categories for questions with types ABCD, True/False, Open Answer, Guess a Number
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

// Quiz types constants
export const QUIZ_TYPES = {
  ABCD: 'ABCD',
  OPEN_ANSWER: 'OPEN_ANSWER',
  BLIND_MAP: 'BLIND_MAP',
  DRAWING: 'DRAWING',
  WORD_CHAIN: 'WORD_CHAIN',
  MATH_QUIZ: 'MATH_QUIZ',
  GUESS_A_NUMBER: 'GUESS_A_NUMBER',
  COMBINED_QUIZ: 'COMBINED_QUIZ'
};

// Question types constants
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

// Translated quiz types to Czech
export const QUIZ_TYPE_TRANSLATIONS = {
  [QUIZ_TYPES.ABCD]: 'ABCD kvíz',
  [QUIZ_TYPES.OPEN_ANSWER]: 'Otevřené odpovědi',
  [QUIZ_TYPES.BLIND_MAP]: 'Slepá mapa',
  [QUIZ_TYPES.DRAWING]: 'Kreslení',
  [QUIZ_TYPES.WORD_CHAIN]: 'Slovní řetěz',
  [QUIZ_TYPES.MATH_QUIZ]: 'Matematický kvíz',
  [QUIZ_TYPES.GUESS_A_NUMBER]: 'Hádej číslo',
  [QUIZ_TYPES.COMBINED_QUIZ]: 'Kombinovaný kvíz'
};
