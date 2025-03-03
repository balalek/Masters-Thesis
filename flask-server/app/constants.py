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
    "TIME_LIMIT_MAX": 90,
    'QUIZ_NAME_MAX_LENGTH': 200
}

# Quiz and question type constants
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

QUESTION_TYPES = {
    "ABCD": "ABCD",
    "TRUE_FALSE": "TRUE_FALSE",
    "OPEN_ANSWER": "OPEN_ANSWER",
    "OPEN_ANSWER_AUDIO": "OPEN_ANSWER_AUDIO",
    "OPEN_ANSWER_IMAGE": "OPEN_ANSWER_IMAGE",
    "BLIND_MAP_CZECH": "BLIND_MAP_CZECH",
    "BLIND_MAP_EUROPE": "BLIND_MAP_EUROPE",
    "DRAWING": "DRAWING",
    "MATH_QUIZ": "MATH_QUIZ",
    "GUESS_A_NUMBER": "GUESS_A_NUMBER"
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