from flask import request, session
from flask_socketio import emit, join_room
from . import socketio
from .game_state import game_state
from .constants import PREVIEW_TIME, WAITING_TIME, POINTS_FOR_CORRECT_ANSWER
from time import time
import re
from difflib import SequenceMatcher
from .services.quiz_service import QuizService
import random
import math

@socketio.on('join_room')
def handle_join_room(data):
    player_name = data['player_name']
    join_room(player_name)
    print(f'Player {player_name} joined room {player_name}')

@socketio.on('submit_answer')
def submit_answer(data):
    player_name = data['player_name']
    answer = data['answer']
    answer_time = data['answer_time']  # Get the answer time from the data
    current_question = game_state.current_question
    
    if current_question is None:
        emit('error', {"error": "Game not started"})
        return
        
    current_question_data = game_state.questions[current_question]
    correct_answer = current_question_data['answer']
    points_earned = POINTS_FOR_CORRECT_ANSWER if answer == correct_answer else 0
    
    QuizService.update_question_metadata(
        str(current_question_data['_id']), 
        is_correct=(answer == correct_answer),
        increment_times_played=not game_state.current_question_metadata_updated
    )
    game_state.current_question_metadata_updated = True
    
    # Calculate speed points
    question_start_time = game_state.question_start_time
    question_length = game_state.questions[current_question]['length'] * 1000  # Convert to milliseconds
    time_taken = answer_time - question_start_time
    speed_points = max(0, 100 - int((time_taken / question_length) * 100)) if answer == correct_answer else 0
    total_points_earned = points_earned + speed_points
    
    if game_state.is_team_mode:
        team = 'blue' if player_name in game_state.blue_team else 'red'
        team_players = game_state.blue_team if team == 'blue' else game_state.red_team
        
        if answer == correct_answer:
            game_state.team_scores[team] += total_points_earned
            
        # Send result to all team members (blocks them from answering)
        for team_player in team_players:
            emit('answer_correctness', {
                "correct": answer == correct_answer,
                "points_earned": total_points_earned,
                "total_points": game_state.team_scores[team],
                "is_team_score": True
            }, room=team_player)
    else:
        # Original individual scoring logic
        if answer == correct_answer:
            game_state.players[player_name]['score'] += total_points_earned
        
        emit('answer_correctness', {
            "correct": answer == correct_answer,
            "points_earned": total_points_earned,
            "total_points": game_state.players[player_name]['score'],
            "is_team_score": False
        }, room=player_name)
    
    # Update counts for everyone
    game_state.answers_received += 1
    game_state.answer_counts[answer] += 1
    socketio.emit('answer_submitted')
    
    # Check if we should proceed to next stage
    answers_needed = 2 if game_state.is_team_mode else len(game_state.players)
    if game_state.answers_received == answers_needed:
        show_buttons_at = int((time() + WAITING_TIME) * 1000)
        game_state.question_start_time = show_buttons_at
        
        scores = (
            {
                'is_team_mode': True,
                'teams': game_state.team_scores,
                'blue_team': game_state.blue_team,
                'red_team': game_state.red_team,
                'individual': game_state.players
            }
            if game_state.is_team_mode
            else game_state.players
        )
        
        socketio.emit('all_answers_received', {
            "scores": scores,
            "correct_answer": correct_answer,
            "answer_counts": game_state.answer_counts,
            "show_question_preview_at": show_buttons_at - PREVIEW_TIME,
            "show_buttons_at": show_buttons_at,
            "is_remote": game_state.is_remote  # Add this line
        })

@socketio.on('submit_open_answer')
def submit_open_answer(data):
    player_name = data['player_name']
    answer = data['answer'].strip()
    answer_time = data['answer_time']
    current_question = game_state.current_question
    
    if current_question is None:
        emit('error', {"error": "Game not started"})
        return
    
    # Skip processing if player already answered correctly
    if player_name in game_state.correct_players:
        emit('open_answer_feedback', {"message": "Už jsi odpověděl/a správně"}, room=player_name)
        return
    
    current_question_data = game_state.questions[current_question]
    
    # Change 'answer' to 'open_answer' for open answer questions
    correct_answer = str(current_question_data.get('open_answer', current_question_data.get('answer', ''))).strip()
    
    # Normalize both answers for comparison
    normalized_answer = answer.lower()
    normalized_correct = correct_answer.lower()
    
    # Check if answer is correct
    is_correct = normalized_answer == normalized_correct
    
    # Debug log to verify correctness
    print(f"Player: {player_name}, Answer: {answer}, Correct: {is_correct}")
    
    # If answer is correct
    if is_correct:
        # Calculate speed points
        question_start_time = game_state.question_start_time
        question_length = current_question_data['length'] * 1000  # Convert to milliseconds
        time_taken = answer_time - question_start_time
        speed_points = max(0, 100 - int((time_taken / question_length) * 100))
        total_points_earned = POINTS_FOR_CORRECT_ANSWER + speed_points
        
        # Add player to correct players set
        game_state.correct_players.add(player_name)
        
        # Update question metadata (only for correct answers)
        QuizService.update_question_metadata(
            str(current_question_data['_id']), 
            is_correct=True,
            increment_times_played=False  # Don't increment on each attempt
        )
        game_state.current_question_metadata_updated = True
        
        # Handle scoring based on game mode
        if game_state.is_team_mode:
            team = 'blue' if player_name in game_state.blue_team else 'red'
            game_state.team_scores[team] += total_points_earned
            
            # Notify all team members with the correct answer screen
            team_players = game_state.blue_team if team == 'blue' else game_state.red_team
            for team_player in team_players:
                emit('answer_correctness', {
                    "correct": True,
                    "points_earned": total_points_earned,
                    "total_points": game_state.team_scores[team],
                    "is_team_score": True
                }, room=team_player)
            
        else:
            # Individual mode
            game_state.players[player_name]['score'] += total_points_earned
            
            emit('answer_correctness', {
                "correct": True,
                "points_earned": total_points_earned,
                "total_points": game_state.players[player_name]['score'],
                "is_team_score": False
            }, room=player_name)
        
        # Update tracking for correct answers
        game_state.open_answer_stats['correct_count'] += 1
        game_state.open_answer_stats['player_answers'].append({
            'player_name': player_name,
            'answer': answer,
            'is_correct': True,
            'player_color': game_state.players[player_name]['color']
        })
        
        # Broadcast to update main screen
        socketio.emit('open_answer_submitted', {
            'player_count': len(game_state.players),
            'correct_count': game_state.open_answer_stats['correct_count']
        })
        
        # Check if everyone has answered correctly or time is up
        check_open_answer_completion()
    else:
        # Wrong answer - provide feedback
        feedback = analyze_answer(answer, correct_answer)
        
        # Log the attempt
        game_state.open_answer_stats['player_answers'].append({
            'player_name': player_name,
            'answer': answer,
            'is_correct': False,
            'player_color': game_state.players[player_name]['color']
        })
        
        emit('open_answer_feedback', {"message": feedback}, room=player_name)


def analyze_answer(answer, correct_answer):
    """Analyze how close an answer is to the correct one and provide feedback."""
    answer = answer.lower().strip()
    correct_answer = correct_answer.lower().strip()
    
    # If length differs significantly, give length hint
    if len(answer) < len(correct_answer) * 0.7:
        return "Tvoje odpověď je příliš krátká"
    
    if len(answer) > len(correct_answer) * 1.3:
        return "Tvoje odpověď je příliš dlouhá"
    
    # Calculate similarity ratio
    similarity = SequenceMatcher(None, answer, correct_answer).ratio()
    
    if similarity > 0.8:
        return "Už jsi skoro u cíle! Zkontroluj překlepy"
    elif similarity > 0.5:
        return "Blížíš se k správné odpovědi"
    else:
        return "To není správná odpověď"


def check_open_answer_completion():
    """Check if all players have answered correctly or if conditions are met to proceed."""
    player_count = len(game_state.players)
    correct_count = game_state.open_answer_stats['correct_count']
    
    # In team mode, we need one correct answer from each team
    if game_state.is_team_mode:
        blue_team_correct = any(p in game_state.correct_players for p in game_state.blue_team)
        red_team_correct = any(p in game_state.correct_players for p in game_state.red_team)
        
        if blue_team_correct and red_team_correct:
            show_open_answer_results()
    # In individual mode, proceed when all players answer correctly or half the time has passed and at least one answered
    elif correct_count == player_count:
        show_open_answer_results()


def show_open_answer_results():
    """Show results for open answer questions."""
    current_question_data = game_state.questions[game_state.current_question]
    show_buttons_at = int((time() + WAITING_TIME) * 1000)
    game_state.question_start_time = show_buttons_at
    
    if game_state.is_team_mode:
        scores = {
            'is_team_mode': True,
            'teams': game_state.team_scores,
            'blue_team': game_state.blue_team,
            'red_team': game_state.red_team,
            'individual': game_state.players
        }
    else:
        scores = game_state.players
    
    socketio.emit('all_answers_received', {
        "scores": scores,
        "correct_answer": current_question_data.get('open_answer', current_question_data.get('answer', '')),
        "player_answers": game_state.open_answer_stats['player_answers'],
        "show_question_preview_at": show_buttons_at - PREVIEW_TIME,
        "show_buttons_at": show_buttons_at,
        "is_remote": game_state.is_remote
    })

@socketio.on('submit_number_guess')
def submit_number_guess(data):
    """Handle number guesses for the Guess a Number quiz type"""
    player_name = data['player_name']
    value = data['value']
    current_question = game_state.current_question
    
    if current_question is None:
        emit('error', {"error": "Game not started"})
        return
        
    current_question_data = game_state.questions[current_question]
    
    # Check if we're in team mode
    if game_state.is_team_mode:
        # Store the player's guess for the team
        team = 'blue' if player_name in game_state.blue_team else 'red'
        
        # Only accept guesses from the active team in phase 1
        if game_state.number_guess_phase == 1 and team != game_state.active_team:
            emit('guess_feedback', {
                "message": "Nyní hádá druhý tým", 
                "severity": "warning"
            }, room=player_name)
            return
            
        # Only accept votes from the non-active team in phase 2
        if game_state.number_guess_phase == 2 and team == game_state.active_team:
            emit('guess_feedback', {
                "message": "Už jste tipovali v první fázi", 
                "severity": "warning"
            }, room=player_name)
            return
        
        # Process the guess for phase 1
        if game_state.number_guess_phase == 1:
            player_guess = {
                'playerName': player_name,
                'value': value
            }
            
            # Add to the team's guesses
            game_state.team_player_guesses[team].append(player_guess)
            
            # Update the captain of that team
            captain_name = game_state.blue_team[0] if team == 'blue' else game_state.red_team[0]
            
            # Send the guess to the main screen
            socketio.emit('team_guess_submitted', {
                'playerGuess': player_guess
            })
            
            # Send the updated list to the team captain
            emit('team_guesses_update', {
                'teamName': team,
                'guesses': game_state.team_player_guesses[team]
            }, room=captain_name)
            
            # Provide feedback to the player
            emit('guess_feedback', {
                "message": "Tvůj tip byl zaznamenán a odeslán kapitánovi", 
                "severity": "success"
            }, room=player_name)
            
            # Increment the guesses counter
            game_state.answers_received += 1
            socketio.emit('guess_submitted')
    else:
        # Free-for-all mode
        # Check if the player already answered
        if player_name in [g['playerName'] for g in game_state.team_player_guesses.get('all', [])]:
            emit('guess_feedback', {
                "message": "Už jsi odeslal/a svůj tip", 
                "severity": "warning"
            }, room=player_name)
            return
            
        # Add the guess to the list
        player_guess = {
            'playerName': player_name,
            'value': value,
            'playerColor': game_state.players[player_name]['color']
        }
        
        if 'all' not in game_state.team_player_guesses:
            game_state.team_player_guesses['all'] = []
            
        game_state.team_player_guesses['all'].append(player_guess)
        
        # Only increment the guesses counter and show "waiting" state
        game_state.answers_received += 1
        socketio.emit('guess_submitted')
        
        # Check if all players have answered
        if game_state.answers_received >= len(game_state.players):
            handle_all_number_guesses_received()

def handle_all_number_guesses_received():
    """Process all number guesses in free-for-all mode"""
    # Get the correct answer
    current_question_data = game_state.questions[game_state.current_question]
    correct_answer = float(current_question_data.get('number_answer', 0))
    # Sort guesses by proximity to correct answer
    guesses = game_state.team_player_guesses.get('all', [])
    
    # Add correct answer and distance to each guess
    for guess in guesses:
        guess['distance'] = abs(guess['value'] - correct_answer)
    
    # Sort by distance (closest first)
    sorted_guesses = sorted(guesses, key=lambda x: x['distance'])

    # Calculate and send individual placement results to players
    send_individual_guess_results(sorted_guesses, correct_answer)
    
    # Prepare question data for results page
    current_question_data['teamMode'] = False
    current_question_data['playerGuesses'] = sorted_guesses
    
    # Emit results
    show_buttons_at = int((time() + WAITING_TIME) * 1000)
    
    socketio.emit('all_answers_received', {
        "scores": game_state.players,
        "correct_answer": correct_answer,
        "show_question_preview_at": show_buttons_at - PREVIEW_TIME,
        "show_buttons_at": show_buttons_at,
        "is_remote": game_state.is_remote
    })

def send_individual_guess_results(sorted_guesses, correct_answer):
    """Send individual placement results to each player"""
    total_players = len(sorted_guesses)
    
    print(f"DEBUG: Sending individual results to {total_players} players")
    print(f"DEBUG: Correct answer is {correct_answer}")
    
    # Build a set of players who answered
    players_who_answered = {guess['playerName'] for guess in sorted_guesses}
    
    # Process the players who answered
    for index, guess in enumerate(sorted_guesses):
        player_name = guess['playerName']
        value = guess['value']
        distance = guess['distance']
        
        # Calculate position (1-based index)
        placement = index + 1
        
        # Calculate points based on how close the answer is
        # The closer to the correct answer, the higher the score
        max_difference = correct_answer * 1.0  # 100% difference gets 0 points
        normalized_diff = min(distance / max_difference, 1.0)
        score = int(POINTS_FOR_CORRECT_ANSWER * (1 - normalized_diff))
        
        print(f"DEBUG: Player {player_name} - value: {value}, distance: {distance}, score: {score}")
        
        # Add speed bonus if very close (within 5%)
        if normalized_diff < 0.05:
            # Use a fixed value for the speed bonus since we can't access answer_time here
            speed_points = 25  # Average speed bonus
            score += speed_points
        
        # Make sure score is at least 10 points if they answered
        score = max(10, score)
        
        # Update player's score
        game_state.players[player_name]['score'] += score
        
        # Calculate accuracy description
        if distance == 0:
            accuracy_text = "Přesně!"
        elif distance <= correct_answer * 0.01:
            accuracy_text = "Velmi přesné!"
        elif distance <= correct_answer * 0.05:
            accuracy_text = "Velmi blízko!"
        else:
            accuracy_percent = max(0, 100 - int((distance / max(correct_answer * 0.5, 1)) * 100))
            accuracy_text = f"{accuracy_percent}%"
        
        # Send placement and points to the player
        print(f"DEBUG: Sending answer_correctness to {player_name} with score {score}")
        
        emit('answer_correctness', {
            "correct": True,
            "points_earned": score,
            "total_points": game_state.players[player_name]['score'],
            "is_team_score": False,
            "guessResult": {
                "placement": placement,
                "totalPlayers": total_players,
                "accuracy": accuracy_text,
                "yourGuess": value,
                "correctAnswer": correct_answer
            }
        }, room=player_name)
    
    # Now handle players who didn't answer
    for player_name in game_state.players:
        if player_name not in players_who_answered:
            print(f"DEBUG: Player {player_name} didn't answer - sending too late message")
            
            # Send "too late" message to this player
            emit('answer_correctness', {
                "correct": None,  # null triggers the "too late" screen
                "points_earned": 0,
                "total_points": game_state.players[player_name]['score'],
                "is_team_score": False,
                "guessResult": {
                    "placement": total_players + 1,  # Place them after all other players
                    "totalPlayers": total_players,
                    "accuracy": "0%",
                    "yourGuess": "-",
                    "correctAnswer": correct_answer
                }
            }, room=player_name)

@socketio.on('submit_captain_choice')
def submit_captain_choice(data):
    """Handle the team captain's final answer choice"""
    player_name = data['player_name']
    team = data['team']
    final_answer = data['final_answer']
    
    # Get the correct captain name for the team using the stored index
    if team == 'blue':
        captain_index = game_state.blue_captain_index
        team_captain = game_state.blue_team[captain_index] if len(game_state.blue_team) > captain_index else None
    else:
        captain_index = game_state.red_captain_index
        team_captain = game_state.red_team[captain_index] if len(game_state.red_team) > captain_index else None
    
    # Verify this is the captain
    if team_captain != player_name:
        emit('guess_feedback', {
            "message": "Pouze kapitán může vybrat finální odpověď", 
            "severity": "error"
        }, room=player_name)
        return
    
    # Store the captain's choice
    game_state.first_team_final_answer = final_answer
    
    # Move to phase 2
    game_state.number_guess_phase = 2
    
    # Switch active team
    game_state.active_team = 'red' if game_state.active_team == 'blue' else 'blue'
    
    # Update all players with their roles for phase 2
    update_player_roles_for_phase2()
    
    # Notify the UI about the first team's answer and phase change
    socketio.emit('first_team_answer', {
        'answer': final_answer,
        'currentTeam': game_state.active_team
    })

@socketio.on('submit_more_less_vote')
def submit_more_less_vote(data):
    """Handle votes for the more/less phase"""
    player_name = data['player_name']
    team = data['team']
    vote = data['vote']  # 'more' or 'less'
    
    # Only players from the active team in phase 2 can vote
    if game_state.number_guess_phase != 2:
        return
    
    if (team == 'blue' and game_state.active_team != 'blue') or \
       (team == 'red' and game_state.active_team != 'red'):
        emit('guess_feedback', {
            "message": "Nyní je na řadě druhý tým", 
            "severity": "warning"
        }, room=player_name)
        return
    
    # Record the vote
    game_state.second_team_votes[vote] += 1
    
    # Track which players have voted to prevent duplicate votes
    if not hasattr(game_state, 'voted_players'):
        game_state.voted_players = set()
    
    if player_name in game_state.voted_players:
        # Remove previous vote (basic implementation)
        game_state.second_team_votes['more' if vote == 'less' else 'less'] -= 1
    else:
        game_state.voted_players.add(player_name)
        # Increment counter for UI
        game_state.answers_received += 1
        socketio.emit('guess_submitted')
    
    # Update the vote counts
    socketio.emit('second_team_vote', {
        'votes': game_state.second_team_votes
    })
    
    # Check if all players in the active team have voted
    active_team_players = game_state.blue_team if game_state.active_team == 'blue' else game_state.red_team
    if len(game_state.voted_players) >= len(active_team_players):
        handle_all_votes_completed()

def handle_all_votes_completed():
    """Process the results of the voting phase"""
    # Get the majority vote
    more_votes = game_state.second_team_votes['more']
    less_votes = game_state.second_team_votes['less']
    
    # In case of a tie, use the captain's vote
    active_team_captain = game_state.blue_team[0] if game_state.active_team == 'blue' else game_state.red_team[0]
    final_vote = 'more' if more_votes > less_votes else 'less'
    
    # Get the correct answer
    current_question_data = game_state.questions[game_state.current_question]
    correct_answer = float(current_question_data.get('number_answer', 0))
    
    # Check if the vote is correct
    is_correct = (correct_answer > game_state.first_team_final_answer and final_vote == 'more') or \
                 (correct_answer < game_state.first_team_final_answer and final_vote == 'less')
    
    # Award points to the correct team
    points = POINTS_FOR_CORRECT_ANSWER
    
    if is_correct:
        # Second team earns points
        game_state.team_scores[game_state.active_team] += points
        winning_team = game_state.active_team
    else:
        # First team earns points
        first_team = 'red' if game_state.active_team == 'blue' else 'blue'
        game_state.team_scores[first_team] += points
        winning_team = first_team
    
    # Prepare question data for results page
    current_question_data['teamMode'] = True
    current_question_data['firstTeamAnswer'] = game_state.first_team_final_answer
    current_question_data['secondTeamVote'] = final_vote
    current_question_data['playerGuesses'] = game_state.team_player_guesses['blue'] + game_state.team_player_guesses['red']
    
    # Emit results
    show_buttons_at = int((time() + WAITING_TIME) * 1000)
    
    scores = {
        'is_team_mode': True,
        'teams': game_state.team_scores,
        'blue_team': game_state.blue_team,
        'red_team': game_state.red_team,
        'individual': game_state.players
    }
    
    socketio.emit('all_answers_received', {
        "scores": scores,
        "correct_answer": correct_answer,
        "show_question_preview_at": show_buttons_at - PREVIEW_TIME,
        "show_buttons_at": show_buttons_at,
        "is_remote": game_state.is_remote
    })

def update_player_roles_for_phase2():
    """Update player roles for phase 2 of Guess a Number"""
    # First team becomes inactive, second team becomes active voters
    for player_name in game_state.players:
        if player_name in game_state.blue_team:
            is_in_active_team = game_state.active_team == 'blue'
            # Get the blue captain using the stored index, safely
            if len(game_state.blue_team) > game_state.blue_captain_index:
                blue_captain = game_state.blue_team[game_state.blue_captain_index]
            else:
                # Default to first player if index is invalid
                blue_captain = game_state.blue_team[0] if game_state.blue_team else None
                print(f"WARNING: Invalid blue_captain_index {game_state.blue_captain_index}, defaulting to first player")
                
            # Determine role based on team and active status
            if is_in_active_team:
                role = 'voter'
            else:
                role = 'captain' if player_name == blue_captain else 'player'
        elif player_name in game_state.red_team:
            is_in_active_team = game_state.active_team == 'red'
            # Get the red captain using the stored index, safely
            if len(game_state.red_team) > game_state.red_captain_index:
                red_captain = game_state.red_team[game_state.red_captain_index]
            else:
                # Default to first player if index is invalid
                red_captain = game_state.red_team[0] if game_state.red_team else None
                print(f"WARNING: Invalid red_captain_index {game_state.red_captain_index}, defaulting to first player")
                
            # Determine role based on team and active status
            if is_in_active_team:
                role = 'voter'
            else:
                role = 'captain' if player_name == red_captain else 'player'
        else:
            role = 'player'
        
        # Send role update to player
        emit('player_role_update', {
            'role': role,
            'team': 'blue' if player_name in game_state.blue_team else 'red',
            'quizPhase': 2,
            'firstTeamAnswer': game_state.first_team_final_answer
        }, room=player_name)

@socketio.on('reveal_open_answer_letter')
def reveal_open_answer_letter():
    """Reveal a random letter in the open answer, up to maximum 50% of letters."""
    if game_state.current_question is None:
        return
    
    current_question_data = game_state.questions[game_state.current_question]
    
    # Change 'answer' to 'open_answer' for open answer questions
    correct_answer = current_question_data.get('open_answer', current_question_data.get('answer', ''))

    # Count actual letters (excluding spaces)
    actual_letters = sum(1 for char in correct_answer if char != ' ')
    
    # Calculate maximum number of letters to reveal (50% rounded down)
    max_reveals = actual_letters // 2  # Integer division automatically rounds down
    
    # Check if we've already reached the maximum number of reveals
    if len(game_state.revealed_positions) >= max_reveals:
        # Already reached maximum reveals, don't reveal more
        return
    
    # Find valid positions (not spaces, not already revealed)
    valid_positions = [i for i in range(len(correct_answer)) 
                      if correct_answer[i] != ' ' and i not in game_state.revealed_positions]
    
    # If no valid positions, do nothing
    if not valid_positions:
        return
    
    # Choose a random position
    position = random.choice(valid_positions)
    game_state.revealed_positions.add(position)
    
    # Create mask with revealed letters
    mask = ['_' if i not in game_state.revealed_positions and char != ' ' else char 
            for i, char in enumerate(correct_answer)]
    
    # Send the updated mask
    socketio.emit('open_answer_letter_revealed', {
        'mask': ''.join(mask),
        'position': position
    })

@socketio.on('time_up')
def handle_time_up():
    """Handle when time is up for any question type."""
    current_question = game_state.questions[game_state.current_question]
    show_buttons_at = int((time() + WAITING_TIME) * 1000)
    game_state.question_start_time = show_buttons_at
    
    # Detect question type to provide appropriate response
    question_type = current_question.get('type', 'ABCD')

    # check question type
    print(f"Question type: {question_type}")
    
    # Handle team/individual scoring the same for all question types
    if game_state.is_team_mode:
        scores = {
            'is_team_mode': True,
            'teams': game_state.team_scores,
            'blue_team': game_state.blue_team,
            'red_team': game_state.red_team,
            'individual': game_state.players
        }
    else:
        scores = game_state.players
    
    # Special handling for different question types
    if question_type == 'OPEN_ANSWER':
        # Emit open answer results
        socketio.emit('all_answers_received', {
            "scores": scores,
            "correct_answer": current_question.get('open_answer', current_question.get('answer', '')),
            "player_answers": game_state.open_answer_stats['player_answers'],
            "show_question_preview_at": show_buttons_at - PREVIEW_TIME,
            "show_buttons_at": show_buttons_at,
            "is_remote": game_state.is_remote
        })
    elif question_type == 'GUESS_A_NUMBER':
        # Handle Guess a Number time up
        correct_answer = float(current_question.get('number_answer', 0))
        
        if game_state.is_team_mode:
            # Ensure active_team is set, default to 'blue' if None
            if game_state.active_team is None:
                print("WARNING: active_team was None, defaulting to 'blue'")
                game_state.active_team = 'blue'
                
            # Ensure we have entries for both teams in the dictionary
            if 'blue' not in game_state.team_player_guesses:
                game_state.team_player_guesses['blue'] = []
            if 'red' not in game_state.team_player_guesses:
                game_state.team_player_guesses['red'] = []
            
            # For team mode, handle based on phase
            if game_state.number_guess_phase == 1:
                # If phase 1 timed out, use average of team guesses as final answer
                active_team_guesses = game_state.team_player_guesses[game_state.active_team]
                
                if active_team_guesses:
                    avg_guess = sum(g['value'] for g in active_team_guesses) / len(active_team_guesses)
                    game_state.first_team_final_answer = avg_guess
                    
                    # Move to phase 2
                    game_state.number_guess_phase = 2
                    game_state.active_team = 'red' if game_state.active_team == 'blue' else 'blue'
                    update_player_roles_for_phase2()
                    
                    # Notify about phase change
                    socketio.emit('first_team_answer', {
                        'answer': avg_guess,
                        'currentTeam': game_state.active_team
                    })
                    
                    # Don't show results yet
                    return
                else:
                    # No guesses were made, move to next question
                    current_question['teamMode'] = True
                    current_question['playerGuesses'] = []
            else:  # Phase 2
                # If phase 2 timed out, use the majority vote
                more_votes = game_state.second_team_votes['more']
                less_votes = game_state.second_team_votes['less']
                final_vote = 'more' if more_votes >= less_votes else 'less'
                
                # Determine if vote was correct
                is_correct = (correct_answer > game_state.first_team_final_answer and final_vote == 'more') or \
                            (correct_answer < game_state.first_team_final_answer and final_vote == 'less')
                
                # Award points
                points = POINTS_FOR_CORRECT_ANSWER
                if is_correct:
                    game_state.team_scores[game_state.active_team] += points
                else:
                    first_team = 'red' if game_state.active_team == 'blue' else 'blue'
                    game_state.team_scores[first_team] += points
                
                # Prepare question data for results
                current_question['teamMode'] = True
                current_question['firstTeamAnswer'] = game_state.first_team_final_answer
                current_question['secondTeamVote'] = final_vote
                current_question['playerGuesses'] = game_state.team_player_guesses['blue'] + game_state.team_player_guesses['red']
        else:  # Free-for-all mode
            # Prepare guesses for display
            guesses = game_state.team_player_guesses.get('all', [])
            for guess in guesses:
                guess['distance'] = abs(guess['value'] - correct_answer)
            
            sorted_guesses = sorted(guesses, key=lambda x: x['distance'])
            
            print(f"DEBUG: IS SOMEONE THERE??")

            # Send individual results to players
            send_individual_guess_results(sorted_guesses, correct_answer)
            
            current_question['teamMode'] = False
            current_question['playerGuesses'] = sorted_guesses
        
        # Emit the question with updated data regardless of mode
        socketio.emit('all_answers_received', {
            "scores": scores,
            "correct_answer": correct_answer,
            "show_question_preview_at": show_buttons_at - PREVIEW_TIME,
            "show_buttons_at": show_buttons_at,
            "is_remote": game_state.is_remote
        })
    else:
        # For ABCD and TRUE_FALSE questions, use the original logic
        socketio.emit('all_answers_received', {
            "scores": scores,
            "correct_answer": current_question.get('answer', ''),
            "answer_counts": game_state.answer_counts,
            "show_question_preview_at": show_buttons_at - PREVIEW_TIME,
            "show_buttons_at": show_buttons_at,
            "is_remote": game_state.is_remote
        })

@socketio.on('show_final_score')
def handle_show_final_score():
    if game_state.is_team_mode:
        # For team mode, find winning team and send team results
        for player_name in game_state.players:
            team_name = 'blue' if player_name in game_state.blue_team else 'red'
            emit('navigate_to_final_score', {
                'playerName': player_name,
                'score': game_state.team_scores[team_name],
                'team_name': team_name,
                'is_team_mode': True,
                'team_scores': game_state.team_scores,
                'color': game_state.players[player_name]['color']
            }, room=player_name)
    else:
        # Original individual scoring logic
        sorted_players = sorted(
            game_state.players.items(),
            key=lambda x: x[1]['score'],
            reverse=True
        )
        
        for index, (player_name, data) in enumerate(sorted_players):
            emit('navigate_to_final_score', {
                'playerName': player_name,
                'score': data['score'],
                'placement': index + 1,
                'color': data['color'],
                'is_team_mode': False
            }, room=player_name)

@socketio.on('connect')
def handle_connect():
    is_server = request.remote_addr == '127.0.0.1'
    if is_server:
        session['server'] = True
    print(f'Client connected from {request.remote_addr}. Is server: {is_server}')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')
    if 'server' in session:
        del session['server']

@socketio.on('send_message')
def handle_message(data):
    print('Received message: ' + data)
    socketio.emit('receive_message', data)

@socketio.on('remote_display_connected')
def handle_remote_display_connected():
    socketio.emit('remote_display_connected')

@socketio.on('is_remote_connected')
def handle_is_remote_connected():
    socketio.emit('is_remote_connected')