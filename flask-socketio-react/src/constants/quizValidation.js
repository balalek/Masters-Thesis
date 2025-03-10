export const QUIZ_VALIDATION = {
  QUESTION_MAX_LENGTH: 100,
  ANSWER_MAX_LENGTH: 50,
  TIME_LIMIT: {
    MIN: 5,
    MAX: 120,
    DEFAULT: 30
  },
  QUIZ_NAME_MAX_LENGTH: 200,
  MEDIA_FILE_SIZE_LIMIT: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  ALLOWED_AUDIO_TYPES: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
};

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

// Add constant quiz types
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

// Add constant question types
export const QUESTION_TYPES = {
  ABCD: 'ABCD',
  TRUE_FALSE: 'TRUE_FALSE',
  OPEN_ANSWER: 'OPEN_ANSWER',
  OPEN_ANSWER_AUDIO: 'OPEN_ANSWER_AUDIO',
  OPEN_ANSWER_IMAGE: 'OPEN_ANSWER_IMAGE',
  BLIND_MAP_CZECH: 'BLIND_MAP_CZECH',
  BLIND_MAP_EUROPE: 'BLIND_MAP_EUROPE',
  DRAWING: 'DRAWING',
  MATH_QUIZ: 'MATH_QUIZ',
  GUESS_A_NUMBER: 'GUESS_A_NUMBER'
};
