/**
 * @fileoverview Main App component that sets up routing and theme handling.
 * @author Bc. Martin Baláž
 * @module App
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline, useMediaQuery } from '@mui/material';
import { lightTheme, darkTheme } from './themes';
import DesktopHomePage from './pages/desktop/homePage/DesktopHomePage';
import MobileJoinQuizRoom from './pages/mobile/joinQuizRoom/MobileJoinQuizRoom';
import RoomPage from './pages/desktop/room/RoomPage';
import GamePage from './pages/desktop/game/GamePage';
import MobileGamePage from './pages/mobile/game/MobileGamePage';
import ScorePage from './pages/desktop/scorePage/ScorePage';
import FinalScorePage from './pages/desktop/scorePage/FinalScorePage';
import RemoteGamePage from './pages/desktop/game/RemoteGamePage';
import CreateQuizPage from './pages/desktop/createQuiz/CreateQuizPage';
import './App.css';

/**
 * Main application component that handles routing and theme management
 * 
 * Sets up the application's route structure and provides theme context to all components.
 * Automatically detects user's preferred color scheme and applies appropriate theme.
 * 
 * @function App
 * @returns {React.ReactElement} The rendered application with router and theme provider
 */
function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = prefersDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="App">
        <BrowserRouter>
          <Routes>
            {/* Add route to prevent React from handling map SVG requests */}
            <Route path="/maps/*" element={null} />
            
            {/* Existing routes */}
            <Route path="/" element={<DesktopHomePage />} />
            <Route path="/play" element={<MobileJoinQuizRoom />} />
            <Route path="/mobile-game" element={<MobileGamePage />} />
            <Route path="/room" element={<RoomPage />} />
            <Route path="/game" element={<GamePage />} />
            <Route path="/scores" element={<ScorePage />} />
            <Route path="/final-score" element={<FinalScorePage />} />
            <Route path="/remote" element={<RemoteGamePage />} />
            <Route path ="/create-quiz" element={<CreateQuizPage />} />
          </Routes>
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}

export default App;