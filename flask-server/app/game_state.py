class GameState:
    def __init__(self):
        self.players = {}  # Dictionary of players with their score and color
        self.current_question = None  # Index aktuální otázky
        self.questions = []  # Seznam otázek
        self.answers_received = 0  # Počet přijatých odpovědí
        self.answer_counts = [0, 0, 0, 0]  # Initialize answer counts
        self.is_quiz_active = False  # Quiz state
        self.is_team_mode = False
        self.blue_team = []
        self.red_team = []
        self.blue_captain_index = 0  # Index of the blue team captain
        self.red_captain_index = 0   # Index of the red team captain
        self.team_scores = {'blue': 0, 'red': 0}
        self.question_start_time = None
        self.is_remote = False
        self.current_question_metadata_updated = False  # Track if we've already incremented times played
        
        # Open answer specific state
        self.correct_players = set()  # Set of players who answered correctly
        self.revealed_positions = set()  # Set of revealed positions in open answer
        self.open_answer_stats = {  # Stats for open answer questions
            'correct_count': 0,
            'player_answers': []
        }
        
        # Drawing specific state
        self.drawing_stats = {  # Stats for drawing questions
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
            'team_indexes': {'red': -1, 'blue': -1},  # Track current index in each team
            'eliminated_players': set(), # Players who ran out of time in free-for-all
            'previous_players': [],      # Last 2 players who played
            'next_players': []          # Next 2 players in rotation
        }
        
        # Math Quiz specific state
        self.math_quiz_state = {
            'current_sequence': 0,       # Current equation index
            'eliminated_players': set(),  # Players who answered incorrectly
            'player_answers': {},         # Map of sequence index -> array of player answers
            'team_answers': {},           # Map of team -> sequence index -> array of player answers
            'sequence_start_times': {}    # Map of sequence index -> start time
        }
        
        # Points specifically earned in the current math quiz question
        self.math_quiz_points = {
            'player_points': {},  # Map of player -> points earned in this quiz
            'team_points': {'blue': 0, 'red': 0}  # Points earned by each team in this quiz
        }
        
        # Guess a Number specific state
        self.number_guess_phase = 1  # 1 = first team guessing, 2 = second team more/less
        self.first_team_final_answer = None  # The final answer from the first team
        self.team_player_guesses = {  # Individual team player guesses
            'blue': [], 
            'red': []
        }
        self.active_team = None  # Currently active team ('blue' or 'red')
        self.voted_players = {}  # Players who have voted in the current question and what they voted for

    def reset(self):
        self.__init__()
        
    def reset_question_state(self):
        """Reset state between questions"""
        self.answers_received = 0
        self.answer_counts = [0, 0, 0, 0]  # We'll use indices 0 and 1 for more/less votes
        self.current_question_metadata_updated = False
        
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

    def reset_word_chain_state(self):
        """Reset state for word chain questions"""
        self.word_chain_state = {
            'current_letter': None,
            'used_words': set(),
            'word_chain': [],
            'player_timers': {},
            'current_player': None,
            'team_indexes': {'red': -1, 'blue': -1},  # Track current index in each team
            'eliminated_players': set(),
            'previous_players': [],
            'next_players': []
        }
        
# Create singleton instance
game_state = GameState()