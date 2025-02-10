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
import './App.css';

function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const theme = prefersDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<DesktopHomePage />} />
            <Route path="/play" element={<MobileJoinQuizRoom />} />
            <Route path="/mobile-game" element={<MobileGamePage />} />
            <Route path="/room" element={<RoomPage />} />
            <Route path="/game" element={<GamePage />} />
            <Route path="/scores" element={<ScorePage />} />
            <Route path="/final-score" element={<FinalScorePage />} />
          </Routes>
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}

export default App;


/*function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;*/
