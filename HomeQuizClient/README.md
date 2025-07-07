# Home Quiz: Interactive Multiplayer Quiz Platform

A real-time multiplayer quiz platform built with React, Flask, and Socket.IO that allows participants to join and play quiz games together in one room across multiple devices by being one the same Wi-Fi.

## Features

- **Real-time Multiplayer Gameplay**: Supports team and free-for-all modes
- **Responsive Design**: Optimized for both desktop (host) and mobile (players) interfaces
- **Multiple Quiz Types**:
  - Multiple Choice (ABCD, True/False)
  - Open Answer Text Questions 
  - Drawing & Guessing
  - Word Chain
  - Mathematical Sequences
  - Blind map with anagrams
  - Numerical Guessing
- **Team-based Gameplay**: Team formation, captains, and collaborative features
- **Real-time Statistics**: Live scoring and performance tracking
- **Visual Feedback**: Dynamic UI responses to player actions

## Architecture

The application is divided into two main components:

### Frontend (React)
- **Desktop Interface**: Main screen for hosts showing questions, timers, and results
- **Mobile Interface**: Player interface for answering questions and participating in games
- **Material UI**: Modern, responsive components with custom styling
- **Socket.IO Client**: Real-time communication with the server

### Backend (Flask)
- **Routes**: Handles HTTP requests and serves the application
- **Socket.IO**: Manages real-time events and game state
- **Game Logic**: Question generation, scoring, and game flow

## Installation

### Prerequisites
- Node.js (v14+)
- Python (v3.8+)
- pip (Python package manager)

### Frontend Setup
```bash
# Navigate to project directory
cd HomeQuizClient

# Install dependencies (only first time)
npm install

# Start development server
npm start
```

### Backend Setup
```bash
# Navigate to server directory
cd HomeQuizServer

# Install dependencies (only first time)
pip install -r requirements.txt

# Start Flask server
python app.py
```

## Usage

Use HomeQuiz.exe file

or

1. Check comments in app.py
2. Start both frontend and backend servers
3. Open http://localhost:3000 on a desktop/laptop (host device)
4. Start some quiz, which will open waiting room
5. Players join by opening the provided URL or scanning QR code on mobile devices
6. Host selects game mode and begins the quiz
7. Players answer questions on their devices, while they are watching the main screen with questions

## Project Structure

```
HomeQuizClient/
├── public/            # Static files
├── src/
│   ├── assets/        # Maps
│   ├── components/    # Reusable UI components
│   │   ├── desktop/   # Components for host display
│   │   └── mobile/    # Components for player devices
│   ├── pages/         # Full page components
│   ├── utils/         # Helper functions
│   └── constants/     # Configuration constants
├── HomeQuizServer/
│   ├── app/
│   │   ├── routes/    # HTTP endpoints
│   │   ├── socketio_events/ # Socket.IO event handlers
│   │   ├── services/  # Business logic
│   │   └── game_state.py # Game state management
│   └── app.py         # Server entry point
```

## Technologies

- **React**: Frontend library
- **Socket.IO**: Real-time communication
- **Flask**: Backend framework
- **Material UI**: Component library
- **HTML5 Canvas**: Drawing functionalities
- **CSS3**: Styling and animations

## License

This project is part of a Master's Thesis by Martin Baláž.