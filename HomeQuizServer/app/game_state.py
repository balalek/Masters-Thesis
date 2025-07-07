"""Game state management for the quiz application.

This module implements a singleton GameState class that serves as the central
in-memory store for all game-related data during quiz sessions. It tracks players,
questions, scores, teams, and specialized state for different question types.

Author: Bc. Martin Baláž
"""

class GameState:
    """
    Central game state manager implemented as a singleton.
    
    This class maintains the complete state of an active quiz game session including:

    - Player tracking and scoring
    - Question progression
    - Team management
    - Game mode settings (team/individual, remote/local)
    - Specialized state for each question type (drawing, word chain, math quiz, etc.)
    
    The singleton instance is accessed throughout the application to read
    and update the current game state.
    """
    
    def __init__(self):
        """
        Initialize a new game state with default values.
        
        Sets up data structures for tracking:

        - Players and their properties
        - Questions and progress
        - Teams and team scores
        - Answer tracking
        - Specialized state for each question type
        """
        self.players = {}  # Dictionary of players with their score and color
        self.current_question = None  # Index of current question
        self.questions = []  # List of questions in the quiz
        self.answers_received = 0  # How many players have answered the current question
        self.answer_counts = [0, 0, 0, 0]  # How many players answered each option (0-3)
        self.is_game_running = False  # Is the game currently running?
        self.is_quiz_active = False  # Is the quiz currently active? (meaning we are in RoomPage in the frontend)
        self.is_team_mode = False
        self.blue_team = []
        self.red_team = []
        self.blue_captain_index = 0  # Index of the blue team captain
        self.red_captain_index = 0   # Index of the red team captain
        self.team_scores = {'blue': 0, 'red': 0}
        self.question_start_time = None
        self.is_remote = False  # Playing on a remote device (e.g., TV)
        
        # Open answer specific state
        self.correct_players = set()  # Set of players who answered correctly
        self.revealed_positions = set()  # Set of revealed positions in open answer
        self.open_answer_stats = {  # Stats for open answer questions
            'correct_count': 0,
            'player_answers': []
        }
        
        # Drawing specific state
        self.drawing_stats = {
            'correct_count': 0,
            'player_answers': []
        }
        
        # Word Chain specific state
        self.word_chain_state = {
            'current_letter': None,     # Current letter players must start with
            'used_words': set(),        # Set of already used words
            'word_chain': [],           # List of words in the chain
            'player_timers': {},        # Dictionary of player name -> remaining time
            'current_player': None,     # Player who is currently on turn
            'player_order': [],         # Order of players in free-for-all
            'team_order': [],           # Order of players in team mode
            'team_indexes': {'red': -1, 'blue': -1},  # Track current index of player order in each team
            'eliminated_players': set(), # Players who ran out of time in free-for-all
            'previous_players': [],      # Last 2 players who played
            'next_players': []           # Next 2 players in rotation
        }
        
        # Math Quiz specific state
        self.math_quiz_state = {
            'current_sequence': 0,        # Current equation index
            'eliminated_players': set(),  # Players who answered incorrectly, or ran out of time
            'player_answers': {},         # Map of sequence index -> array of player answers
            'team_answers': {},           # Map of team -> sequence index -> array of player answers
            'sequence_start_times': {}    # Map of sequence index -> start time
        }
        
        # Points specifically earned in the current math quiz question, so it can be seen in real time in frontend
        self.math_quiz_points = {
            'player_points': {},  # Map of player -> points earned in this quiz
            'team_points': {'blue': 0, 'red': 0}  # Points earned by each team in this quiz
        }
        
        # Guess a Number specific state
        self.number_guess_phase = 1  # 1 = first team guessing, 2 = second team more/less voting
        self.first_team_final_answer = None  # The final answer from the first team
        self.team_player_guesses = {  # Individual team player guesses
            'blue': [], 
            'red': []
        }
        self.active_team = None  # Currently active team ('blue' or 'red')
        self.voted_players = {}  # Players who have voted in the current question and what they voted for

        # Blind Map specific state
        self.blind_map_state = {
            'phase': 1,                   # Current phase (1 or 2 or 3)
            'correct_players': set(),     # Set of players who solved the anagram
            'correct_order': [],          # Order in which players solved the anagram
            'anagram_points': {},         # Points earned in anagram phase by player
            'player_locations': {},       # Player locations in map phase
            'location_results': {},       # Results of location submissions
            'winning_team': None,         # Team that solved the anagram first (team mode)
            'team_guesses': {},           # Team member guesses on map
            'captain_guesses': {},        # Team captains' final guesses
            'clue_index': 0,              # Current clue index (0-2)
            'results': {}                 # Final results for score page
        }

    def reset(self):
        """
        Reset the game state to initial values.
        
        Completely clears all game data and returns to a fresh state,
        equivalent to starting a new game session.
        """
        self.__init__()
        
    def reset_question_state(self):
        """
        Reset state between questions while preserving game-level state.
        
        Clears question-specific tracking data while maintaining:

        - Player list and overall scores
        - Team assignments and team scores
        - Question list and progress tracking
        
        Called when advancing to a new question in a quiz.
        """
        self.answers_received = 0
        self.answer_counts = [0, 0, 0, 0]  # We'll use indices 0 and 1 for more/less votes
        
        # Reset open answer specific state
        self.correct_players = set()
        self.revealed_positions = set()
        self.open_answer_stats = {
            'correct_count': 0,
            'player_answers': []
        }
        
        # Reset drawing specific state
        self.drawing_stats = {
            'correct_count': 0,
            'player_answers': []
        }
        
        # Reset guess-a-number specific state
        self.number_guess_phase = 1
        self.first_team_final_answer = None
        self.team_player_guesses = {'blue': [], 'red': []}
        self.voted_players = {}

        # Reset math quiz specific state
        self.math_quiz_state = {
            'current_sequence': 0,
            'eliminated_players': set(),
            'player_answers': {},
            'team_answers': {},
            'sequence_start_times': {}
        }
        
        # Reset math quiz points
        self.math_quiz_points = {
            'player_points': {},
            'team_points': {'blue': 0, 'red': 0}
        }

        # Reset blind map specific state
        self.blind_map_state = {
            'phase': 1,
            'correct_players': set(),
            'correct_order': [],
            'anagram_points': {},
            'player_locations': {},
            'location_results': {},
            'winning_team': None,
            'team_guesses': {},
            'captain_guesses': {},
            'clue_index': 0,
            'results': {}
        }

    def reset_word_chain_state(self):
        """
        Reset state for word chain questions.
        
        Initializes the specialized state used for word chain questions including:
        
        - Letter tracking
        - Word usage history
        - Player turn management
        - Team tracking
        
        Called when starting a new word chain question or round.
        """
        self.word_chain_state = {
            'current_letter': None,
            'used_words': set(),
            'word_chain': [],
            'player_timers': {},
            'current_player': None,
            'team_indexes': {'red': -1, 'blue': -1},
            'eliminated_players': set(),
            'previous_players': [],
            'next_players': []
        }
        
# Create singleton instance
game_state = GameState()