"""
Socket.IO events for Guess a Number questions
"""
from flask_socketio import emit
from .. import socketio
from ..game_state import game_state
from ..constants import PHASE_TRANSITION_TIME, POINTS_FOR_CORRECT_ANSWER_GUESS_A_NUMBER, POINTS_FOR_CORRECT_ANSWER_GUESS_A_NUMBER_FIRST_PHASE
from time import time
from .utils import emit_all_answers_received, get_scores_data

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
            if team not in game_state.team_player_guesses:
                game_state.team_player_guesses[team] = []
            game_state.team_player_guesses[team].append(player_guess)
            
            # Get the team captain index
            captain_index = game_state.blue_captain_index if team == 'blue' else game_state.red_captain_index
            
            # Get the captain name using the index
            if team == 'blue' and len(game_state.blue_team) > captain_index:
                captain_name = game_state.blue_team[captain_index]
            elif team == 'red' and len(game_state.red_team) > captain_index:
                captain_name = game_state.red_team[captain_index]
            else:
                # Fallback to first player if index is invalid
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
        if 'all' not in game_state.team_player_guesses:
            game_state.team_player_guesses['all'] = []
            
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
        
        game_state.team_player_guesses['all'].append(player_guess)
        
        # Increment the guesses counter and show "waiting" state
        game_state.answers_received += 1
        socketio.emit('guess_submitted')
        
        # Check if all players have answered
        if game_state.answers_received >= len(game_state.players):
            handle_all_number_guesses_received()

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
    
    # Get the correct answer
    current_question_data = game_state.questions[game_state.current_question]
    correct_answer = float(current_question_data.get('number_answer', 0))
    
    # Check if the answer is exactly correct - special case!
    if abs(final_answer - correct_answer) < 0.0001:  # Use small epsilon for floating point comparison
        # The first team guessed exactly right! Award double points and end the question
        double_points = POINTS_FOR_CORRECT_ANSWER_GUESS_A_NUMBER_FIRST_PHASE
        game_state.team_scores[team] += double_points
        
        # Prepare question data for results page
        current_question_data['teamMode'] = True
        current_question_data['exactGuess'] = True  # Mark as exact guess for UI
        current_question_data['firstTeamAnswer'] = final_answer
        current_question_data['playerGuesses'] = game_state.team_player_guesses['blue'] + game_state.team_player_guesses['red']
        
        # Send correctness info to all players
        for player in game_state.players:
            player_team = 'blue' if player in game_state.blue_team else 'red'
            is_winning_team = player_team == team
            
            # Get team scores
            team_scores = {
                'blue': game_state.team_scores.get('blue', 0),
                'red': game_state.team_scores.get('red', 0)
            }
            
            emit('answer_correctness', {
                "correct": is_winning_team,  # Only the exact-guessing team gets "correct"
                "points_earned": double_points if is_winning_team else 0,
                "total_points": team_scores[player_team],
                "is_team_score": True,
                "team_scores": team_scores,
                "exactGuess": True,  # Special flag for UI
                "guessResult": {
                    "exactGuess": True,
                    "correctAnswer": correct_answer,
                    "yourGuess": final_answer
                }
            }, room=player)
        
        # Reset answers_received to prevent it from carrying over to the next question
        game_state.answers_received = 0
        
        # Emit results and end the question
        scores = get_scores_data()
        emit_all_answers_received(
            scores=scores,
            correct_answer=correct_answer
        )
        return
    
    # If we're here, it wasn't an exact match - continue with regular phase 2
    
    # Calculate absolute timestamps instead of durations
    current_time = int(time() * 1000)
    transition_end_time = current_time + PHASE_TRANSITION_TIME
    
    # Move to phase 2
    game_state.number_guess_phase = 2
    
    # Switch active team
    game_state.active_team = 'red' if game_state.active_team == 'blue' else 'blue'
    
    # Reset the answer counts for the second phase (more/less votes)
    game_state.answer_counts = [0, 0, 0, 0]  # Reset all counts
    
    # Initialize voted_players as a dictionary to track votes properly
    game_state.voted_players = {}
    
    # Reset answers_received for phase 2
    game_state.answers_received = 0
    
    # Notify the UI about the phase transition - sending absolute timestamp
    socketio.emit('phase_transition', {
        'firstTeamAnswer': final_answer,
        'activeTeam': game_state.active_team,
        'transitionEndTime': transition_end_time  # Absolute timestamp, not duration
    })
    
    # Update all players with their roles for phase 2
    update_player_roles_for_phase2()
    
    # Set the new question end time based on the original question length
    current_question = game_state.questions[game_state.current_question]
    question_length = current_question.get('length', 30)  # Default to 30 seconds
    game_state.question_end_time = transition_end_time + (question_length * 1000)  # Set new end time after transition

@socketio.on('submit_more_less_vote')
def submit_more_less_vote(data):
    """Handle votes for the more/less phase"""
    player_name = data['player_name']
    team = data['team']
    vote = data['vote']  # 'more' or 'less'
    
    # Only players from the active team in phase 2 can vote
    if game_state.number_guess_phase != 2:
        return
    
    if team != game_state.active_team:
        emit('guess_feedback', {
            "message": "Nyní je na řadě druhý tým", 
            "severity": "warning"
        }, room=player_name)
        return
    
    # Record the vote - use answer_counts instead of second_team_votes
    # answer_counts[0] = more votes, answer_counts[1] = less votes
    vote_index = 0 if vote == 'more' else 1
    
    # Check if the player has voted before
    if player_name in game_state.voted_players:
        # Get their previous vote
        previous_vote = game_state.voted_players[player_name]
        previous_index = 0 if previous_vote == 'more' else 1
        
        # Only update if the vote changed
        if previous_vote != vote:
            # Decrement previous vote count
            game_state.answer_counts[previous_index] -= 1
            
            # Increment new vote count
            game_state.answer_counts[vote_index] += 1
    else:
        # New vote
        game_state.voted_players[player_name] = vote
        # Increment the guesses counter for UI
        game_state.answers_received += 1
        socketio.emit('guess_submitted')
        # Increment the vote count
        game_state.answer_counts[vote_index] += 1
    
    # Always update the player's vote choice
    game_state.voted_players[player_name] = vote
    
    # Update the vote counts - convert to dictionary format for the UI
    socketio.emit('second_team_vote', {
        'votes': {
            'more': game_state.answer_counts[0],
            'less': game_state.answer_counts[1]
        }
    })

    print(f"DEBUG: answers received: {game_state.answers_received}")
    # Check if all players in active team have voted
    if game_state.answers_received >= len(game_state.blue_team if game_state.active_team == 'blue' else game_state.red_team):
        # All players have voted, handle the results
        handle_all_votes_completed()

def handle_tied_votes(captain_name):
    """Handle tied votes in phase 2 of Guess a Number questions"""
    # Get the correct answer and first team answer
    current_question_data = game_state.questions[game_state.current_question]
    correct_answer = float(current_question_data.get('number_answer', 0))
    first_team_answer = game_state.first_team_final_answer
    
    # In case of a tie, check if captain voted
    if captain_name and captain_name in game_state.voted_players:
        # Use captain's vote to break the tie
        final_vote = game_state.voted_players[captain_name]
        print(f"DEBUG: Tie broken by captain {captain_name} voting {final_vote}")
    else:
        # If captain didn't vote or doesn't exist, give points to first team
        # Just set final_vote to the opposite of what would be correct
        if correct_answer > first_team_answer:
            # Correct would be 'more', so set to 'less' to give points to first team
            final_vote = 'less'
        else:
            # Correct would be 'less', so set to 'more' to give points to first team
            final_vote = 'more'
        print(f"DEBUG: Tie with no captain vote, defaulting to give points to first team")
    
    return final_vote

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
    scores = get_scores_data()
    emit_all_answers_received(
        scores=scores,
        correct_answer=correct_answer
    )

# Free-for-all mode function to send individual results after all guesses are in or time is up
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
        max_difference = correct_answer * 1.0  # 100% difference gets 0 points
        normalized_diff = min(distance / max_difference, 1.0)
        score = int(POINTS_FOR_CORRECT_ANSWER_GUESS_A_NUMBER * (1 - normalized_diff))
        
        print(f"DEBUG: Player {player_name} - value: {value}, distance: {distance}, score: {score}")
        
        # Add speed bonus if very close (within 5%)
        if normalized_diff < 0.05:
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

def handle_all_votes_completed():
    """Process the results of the voting phase"""
    # Get the vote counts
    more_votes = game_state.answer_counts[0]
    less_votes = game_state.answer_counts[1]
    
    # Get the active team's captain
    captain_index = game_state.blue_captain_index if game_state.active_team == 'blue' else game_state.red_captain_index
    captain_name = (game_state.blue_team[captain_index] if game_state.active_team == 'blue' and captain_index < len(game_state.blue_team) 
                  else game_state.red_team[captain_index] if game_state.active_team == 'red' and captain_index < len(game_state.red_team)
                  else None)
    
    # Check for a tie
    if more_votes == less_votes:
        final_vote = handle_tied_votes(captain_name)
    else:
        # No tie, use majority vote
        final_vote = 'more' if more_votes > less_votes else 'less'
    
    # Get the correct answer
    current_question_data = game_state.questions[game_state.current_question]
    correct_answer = float(current_question_data.get('number_answer', 0))
    
    # Check if the vote is correct
    is_correct = (correct_answer > game_state.first_team_final_answer and final_vote == 'more') or \
                 (correct_answer < game_state.first_team_final_answer and final_vote == 'less')
    
    # Award points to the correct team
    points = POINTS_FOR_CORRECT_ANSWER_GUESS_A_NUMBER
    
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
    scores = get_scores_data()
    
    # Send correctness info to each player
    send_team_correctness_results(winning_team)
    
    emit_all_answers_received(
        scores=scores,
        correct_answer=correct_answer
    )

def send_team_correctness_results(winning_team):
    """Send correctness results to team players for guess number phase 2"""
    first_team = 'red' if game_state.active_team == 'blue' else 'blue'
    
    # For all players in the winning team, send true
    winning_team_players = game_state.blue_team if winning_team == 'blue' else game_state.red_team
    losing_team_players = game_state.blue_team if winning_team == 'red' else game_state.red_team
    losing_team = 'blue' if winning_team == 'red' else 'red'
    
    # Get team scores
    team_scores = {
        'blue': game_state.team_scores.get('blue', 0),
        'red': game_state.team_scores.get('red', 0)
    }
    
    # Points earned in this round
    points = POINTS_FOR_CORRECT_ANSWER_GUESS_A_NUMBER
    
    # Send correctness to winning team
    for player_name in winning_team_players:
        emit('answer_correctness', {
            "correct": True,
            "points_earned": points,
            "total_points": team_scores[winning_team],
            "is_team_score": True,
            "team_scores": team_scores
        }, room=player_name)
    
    # Send correctness to losing team
    for player_name in losing_team_players:
        emit('answer_correctness', {
            "correct": False,
            "points_earned": 0,
            "total_points": team_scores[losing_team],  # Fixed: Use the player's team score
            "is_team_score": True, 
            "team_scores": team_scores
        }, room=player_name)

def update_player_roles_for_phase2():
    """Update player roles for phase 2 of Guess a Number"""
    # Just update all players with the phase change and first team answer
    for player_name in game_state.players:
        # Send role update to player - the team and role information 
        # is already known, we just need to update the phase and add the answer
        emit('player_role_update', {
            'quizPhase': 2,
            'firstTeamAnswer': game_state.first_team_final_answer
        }, room=player_name)

def handle_guess_number_time_up(scores):
    """Handle time up for Guess a Number questions"""
    current_question = game_state.questions[game_state.current_question]
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
                
                # Check if the average guess is exactly correct - special case!
                if abs(avg_guess - correct_answer) < 0.0001:  # Use small epsilon for floating point comparison
                    # The first team's average guess was exactly right! Award double points and end the question
                    double_points = POINTS_FOR_CORRECT_ANSWER_GUESS_A_NUMBER_FIRST_PHASE
                    game_state.team_scores[game_state.active_team] += double_points
                    
                    # Prepare question data for results page
                    current_question['teamMode'] = True
                    current_question['exactGuess'] = True  # Mark as exact guess for UI
                    current_question['firstTeamAnswer'] = avg_guess
                    current_question['playerGuesses'] = game_state.team_player_guesses['blue'] + game_state.team_player_guesses['red']
                    
                    # Send correctness info to all players
                    for player in game_state.players:
                        player_team = 'blue' if player in game_state.blue_team else 'red'
                        is_winning_team = player_team == game_state.active_team
                        
                        # Get team scores
                        team_scores = {
                            'blue': game_state.team_scores.get('blue', 0),
                            'red': game_state.team_scores.get('red', 0)
                        }
                        
                        emit('answer_correctness', {
                            "correct": is_winning_team,  # Only the exact-guessing team gets "correct"
                            "points_earned": double_points if is_winning_team else 0,
                            "total_points": team_scores[player_team],
                            "is_team_score": True,
                            "team_scores": team_scores,
                            "exactGuess": True,  # Special flag for UI
                            "guessResult": {
                                "exactGuess": True,
                                "correctAnswer": correct_answer,
                                "yourGuess": avg_guess
                            }
                        }, room=player)
                    
                    # Emit results and return without proceeding to phase 2
                    emit_all_answers_received(
                        scores=scores,
                        correct_answer=correct_answer
                    )
                    return
                
                # If not exact, continue with phase 2 normally
                # Move to phase 2
                game_state.number_guess_phase = 2
                game_state.active_team = 'red' if game_state.active_team == 'blue' else 'blue'
                update_player_roles_for_phase2()

                # Calculate absolute timestamps instead of durations
                current_time = int(time() * 1000)
                transition_end_time = current_time + PHASE_TRANSITION_TIME

                game_state.voted_players = {}  # Reset voted players for the new phase
                
                # Notify the UI about the phase transition - sending absolute timestamp
                socketio.emit('phase_transition', {
                    'firstTeamAnswer': avg_guess,
                    'activeTeam': game_state.active_team,
                    'transitionEndTime': transition_end_time  # Absolute timestamp, not duration
                })
                
                # Don't show results yet
                return
            else:
                # No guesses were made, move to next question
                current_question['teamMode'] = True
                current_question['playerGuesses'] = []
        else:  # Phase 2
            # Get the vote counts
            more_votes = game_state.answer_counts[0]
            less_votes = game_state.answer_counts[1]
            
            # Get the active team's captain
            captain_index = game_state.blue_captain_index if game_state.active_team == 'blue' else game_state.red_captain_index
            captain_name = (game_state.blue_team[captain_index] if game_state.active_team == 'blue' and captain_index < len(game_state.blue_team) 
                          else game_state.red_team[captain_index] if game_state.active_team == 'red' and captain_index < len(game_state.red_team)
                          else None)
            
            # Check if anyone voted
            if more_votes == 0 and less_votes == 0:
                # No one voted, first team wins by default
                first_team = 'red' if game_state.active_team == 'blue' else 'blue'
                winning_team = first_team
                
                # Award points to first team
                game_state.team_scores[first_team] += POINTS_FOR_CORRECT_ANSWER_GUESS_A_NUMBER
                
                # Send team correctness results
                send_team_correctness_results(winning_team)
                
                # Prepare question data 
                final_vote = "No votes" # Special case
            else:
                # Check for a tie
                if more_votes == less_votes:
                    final_vote = handle_tied_votes(captain_name)
                else:
                    # No tie, use majority vote
                    final_vote = 'more' if more_votes > less_votes else 'less'
                
                # Determine if vote was correct
                is_correct = (correct_answer > game_state.first_team_final_answer and final_vote == 'more') or \
                            (correct_answer < game_state.first_team_final_answer and final_vote == 'less')
                
                # Award points
                points = POINTS_FOR_CORRECT_ANSWER_GUESS_A_NUMBER
                if is_correct:
                    game_state.team_scores[game_state.active_team] += points
                    winning_team = game_state.active_team
                else:
                    first_team = 'red' if game_state.active_team == 'blue' else 'blue'
                    game_state.team_scores[first_team] += points
                    winning_team = first_team
                
                # Send team correctness results
                send_team_correctness_results(winning_team)
            
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

        # Send individual results to players
        send_individual_guess_results(sorted_guesses, correct_answer)
        
        current_question['teamMode'] = False
        current_question['playerGuesses'] = sorted_guesses
    
    # Emit the question with updated data regardless of mode
    emit_all_answers_received(
        scores=scores,
        correct_answer=correct_answer
    )
