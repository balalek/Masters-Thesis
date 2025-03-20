# Available colors list (tested for black theme)
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

# Maximum number of players
MAX_PLAYERS = 10

# Preview time in milliseconds
PREVIEW_TIME = 3000  # 5 seconds in milliseconds
START_GAME_TIME = 2000  # 5 seconds in milliseconds
WAITING_TIME = 10

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
    'MIN_SEQUENCES': 3,
    'WORD_CHAIN_MIN_ROUNDS': 1,
    'WORD_CHAIN_MAX_ROUNDS': 1, # TODO carreful with this, if you change it, it may break the code (check it)
    'WORD_CHAIN_DEFAULT_ROUNDS': 1,
    'WORD_CHAIN_MIN_TIME': 20,
    'WORD_CHAIN_MAX_TIME': 60,
    'WORD_CHAIN_DEFAULT_TIME': 40,
    # Add Drawing Quiz validation constants
    'DRAWING_MIN_ROUNDS': 1,
    'DRAWING_MAX_ROUNDS': 3,
    'DRAWING_DEFAULT_ROUNDS': 1,
    'DRAWING_MIN_TIME': 30,
    'DRAWING_MAX_TIME': 120,
    'DRAWING_DEFAULT_TIME': 60,
    "MEDIA_FILE_SIZE_LIMIT": 5 * 1024 * 1024,  # 5MB
    "ALLOWED_IMAGE_TYPES": ["image/jpeg", "image/png", "image/gif"],
    "ALLOWED_AUDIO_TYPES": ["audio/mpeg", "audio/wav", "audio/ogg"]
}

# Quiz and question type constants
QUIZ_TYPES = {
    "ABCD": "ABCD",
    "OPEN_ANSWER": "OPEN_ANSWER",
    "BLIND_MAP": "BLIND_MAP",  # TODO: Implement BlindMapQuestionHandler
    "DRAWING": "DRAWING",      # TODO: Implement DrawingQuestionHandler
    "WORD_CHAIN": "WORD_CHAIN",  # TODO: Implement WordChainQuestionHandler
    "MATH_QUIZ": "MATH_QUIZ",    # TODO: Implement MathQuizQuestionHandler
    "GUESS_A_NUMBER": "GUESS_A_NUMBER",  # TODO: Implement GuessANumberQuestionHandler
    "COMBINED_QUIZ": "COMBINED_QUIZ"     # TODO: Implement CombinedQuizHandler
}

QUESTION_TYPES = {
    "ABCD": "ABCD",
    "TRUE_FALSE": "TRUE_FALSE",
    "OPEN_ANSWER": "OPEN_ANSWER",
    "BLIND_MAP": "BLIND_MAP",    # TODO: Implement BlindMapQuestionHandler
    "DRAWING": "DRAWING",        # TODO: Implement DrawingQuestionHandler
    "MATH_QUIZ": "MATH_QUIZ",    # TODO: Implement MathQuizQuestionHandler
    "GUESS_A_NUMBER": "GUESS_A_NUMBER",  # TODO: Implement GuessANumberQuestionHandler
    "WORD_CHAIN": "WORD_CHAIN"
}

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