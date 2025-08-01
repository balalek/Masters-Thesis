"""Application-wide constants for the quiz application.
             
This module defines centralized constants used throughout the application:

- UI constants (colors, player limits)
- Timing constants for game phases 
- Scoring rules for different question types
- Validation rules for user input
- Question and quiz type identifiers
- Content categories and metadata

Centralizing these values ensures consistency across the application
and makes configuration changes easier to manage.

Author: Bc. Martin Baláž
"""

# Available colors list
AVAILABLE_COLORS = [
    "#f44336",  # Red
    "#e91e63",  # Pink
    "#43a047",  # Green
    "#00796b",  # Teal
    "#2196f3",  # Blue
    "#3f51b5",  # Indigo
    "#827717",  # Yellow
    "#607d8b",  # Blue grey
    "#0097a7",  # Cyan
    "#ef6c00",  # Orange
    "#9c27b0",  # Purple
    "#4a148c",  # Dark purple
    "#33691e",  # Dark Green
    "#795548",  # Brown
    "#616161",  # Grey
]

# Maximum number of players that can join a quiz
MAX_PLAYERS = 10

# Preview time in milliseconds
PREVIEW_TIME = 5000
PREVIEW_TIME_DRAWING = 8000
START_GAME_TIME = 2000
PHASE_TRANSITION_TIME = 5000
WAITING_TIME = 17 # 12 score page + 5 question preview
WAITING_TIME_DRAWING = 20 # 12 score page + 8 word selection

# Points for ABCD, True/False, Open Answer questions
POINTS_FOR_CORRECT_ANSWER = 100
# Points for Word Chain
POINTS_FOR_WORD_CHAIN = 50
# Points for Math Quiz
POINTS_FOR_MATH_CORRECT_ANSWER = 75
# Team play for Guess a Number question
POINTS_FOR_CORRECT_ANSWER_GUESS_A_NUMBER = 150
POINTS_FOR_CORRECT_ANSWER_GUESS_A_NUMBER_FIRST_PHASE = 300 # Double points in First phase of Guess a Number
# Free-for-all for Guess a Number question
POINTS_FOR_PLACEMENT = 100
POINTS_FOR_EXACT_ANSWER = 200
# Free-for-all for word-chain question
POINTS_FOR_LETTER = 3
POINTS_FOR_SURVIVING_BOMB = 200
# Points for blind map quiz
ANAGRAM_PHASE_POINTS = 100
MAP_PHASE_POINTS = 100
BLIND_MAP_TEAM_MODE_POINTS = 200

# Quiz validation constants
QUIZ_VALIDATION = {
    "QUESTION_MAX_LENGTH": 100,
    "ANSWER_MAX_LENGTH": 50,
    "TIME_LIMIT_MIN": 5,
    "TIME_LIMIT_MAX": 120,
    "TIME_LIMIT_DEFAULT": 30,
    "TIME_LIMIT_MIN_MATH": 5,
    "TIME_LIMIT_MAX_MATH": 60,
    "TIME_LIMIT_DEFAULT_MATH": 10,
    'QUIZ_NAME_MAX_LENGTH': 200,
    # Guess a Number validation constants
    'MIN_SEQUENCES': 3,
    # Word Chain validation constants
    'WORD_CHAIN_MIN_ROUNDS': 1,
    'WORD_CHAIN_MAX_ROUNDS': 1,
    'WORD_CHAIN_MAX_ROUNDS_QUICK_PLAY': 10,
    'WORD_CHAIN_DEFAULT_ROUNDS': 1,
    'WORD_CHAIN_MIN_TIME': 20,
    'WORD_CHAIN_MAX_TIME': 60,
    'WORD_CHAIN_DEFAULT_TIME': 40,
    # Drawing Quiz validation constants
    'DRAWING_MIN_ROUNDS': 1,
    'DRAWING_MAX_ROUNDS': 3,
    'DRAWING_DEFAULT_ROUNDS': 1,
    'DRAWING_MIN_TIME': 30,
    'DRAWING_MAX_TIME': 120,
    'DRAWING_DEFAULT_TIME': 60,
    # Open Answer Quiz validation constants
    "MEDIA_FILE_SIZE_LIMIT": 5 * 1024 * 1024,  # 5MB
    "ALLOWED_IMAGE_TYPES": ["image/jpeg", "image/png", "image/gif"],
    "ALLOWED_AUDIO_TYPES": ["audio/mpeg", "audio/wav", "audio/ogg"],
    # Blind Map validation constants
    "BLIND_MAP_RADIUS_PRESETS": {
        "EASY": {"exact": 0.045}, # Bigger zone
        "HARD": {"exact": 0.03}
    },
    "BLIND_MAP_DEFAULT_PRESET": "HARD",
}

# Quiz type constants
QUIZ_TYPES = {
    "ABCD": "ABCD",
    "OPEN_ANSWER": "OPEN_ANSWER",
    "BLIND_MAP": "BLIND_MAP",
    "DRAWING": "DRAWING",
    "WORD_CHAIN": "WORD_CHAIN",
    "MATH_QUIZ": "MATH_QUIZ",
    "GUESS_A_NUMBER": "GUESS_A_NUMBER",
    "COMBINED_QUIZ": "COMBINED_QUIZ"
}

# Question type constants
QUESTION_TYPES = {
    "ABCD": "ABCD",
    "TRUE_FALSE": "TRUE_FALSE",
    "OPEN_ANSWER": "OPEN_ANSWER",
    "BLIND_MAP": "BLIND_MAP",
    "DRAWING": "DRAWING",
    "MATH_QUIZ": "MATH_QUIZ",
    "GUESS_A_NUMBER": "GUESS_A_NUMBER",
    "WORD_CHAIN": "WORD_CHAIN"
}

# Categories for questions with types ABCD, True/False, Open Answer, Guess a Number
QUIZ_CATEGORIES = [
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
]

# Flag to indicate if the application is online or offline
is_online = False  # Default to offline mode, will be updated by check_internet_connection