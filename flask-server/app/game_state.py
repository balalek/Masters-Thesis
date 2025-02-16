class GameState:
    def __init__(self):
        self.players = {}  # Dictionary of players with their score and color
        self.current_question = None  # Index aktuální otázky
        self.questions = []  # Seznam otázek
        self.answers_received = 0  # Počet přijatých odpovědí
        self.answer_counts = [0, 0, 0, 0]  # Initialize answer counts
        self.is_quiz_active = False  # Quiz state
        self.is_team_mode = False
        self.blue_team = []  # List of player names in blue team
        self.red_team = []   # List of player names in red team
        self.team_scores = {
            'blue': 0,
            'red': 0
        }

    def reset(self):
        self.__init__()

# Create singleton instance
game_state = GameState()