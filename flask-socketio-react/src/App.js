import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DesktopHomePage from './pages/desktop/homePage/DesktopHomePage';
import MobileJoinQuizRoom from './pages/mobile/joinQuizRoom/MobileJoinQuizRoom';
import './App.css';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DesktopHomePage />} />
          <Route path="/play" element={<MobileJoinQuizRoom />} />
        </Routes>
      </BrowserRouter>
    </div>
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
