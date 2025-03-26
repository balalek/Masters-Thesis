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
        
        # Guess a Number specific state
        self.number_guess_phase = 1  # 1 = first team guessing, 2 = second team more/less
        self.first_team_final_answer = None  # The final answer from the first team
        self.second_team_votes = {'more': 0, 'less': 0}  # Votes from second team
        self.team_player_guesses = {  # Individual team player guesses
            'blue': [], 
            'red': []
        }
        self.active_team = None  # Currently active team ('blue' or 'red')
        self.team_captain_guesses = {}  # To store captain guesses
        self.player_roles = {}  # Roles for guess-a-number (player, captain, voter)

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
        
        # Reset guess-a-number specific state
        self.number_guess_phase = 1
        self.first_team_final_answer = None
        self.second_team_votes = {'more': 0, 'less': 0}
        self.team_player_guesses = {'blue': [], 'red': []}
        self.active_team = None
        self.team_captain_guesses = {}
        self.player_roles = {}

# Create singleton instance
game_state = GameState()