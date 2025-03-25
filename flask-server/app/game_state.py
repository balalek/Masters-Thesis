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

    def reset(self):
        self.__init__()
        
    def reset_question_state(self):
        """Reset state between questions"""
        self.answers_received = 0
        self.answer_counts = [0, 0, 0, 0]
        self.current_question_metadata_updated = False
        
        # Reset open answer specific state
        self.correct_players = set()
        self.revealed_positions = set()
        self.open_answer_stats = {
            'correct_count': 0,
            'player_answers': []
        }

# Create singleton instance
game_state = GameState()