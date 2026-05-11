import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login.jsx';
import Register from './components/Register.jsx';
import ProjectsPage from './components/ProjectsPage.jsx';
import CreateProjectPage from './components/CreateProjectPage.jsx';
import MapView from './components/MapView.jsx'; // Import the Map from the new location
import './App.css';

function App() {
  return (
    <Router>
      <div className="main-wrapper">
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Main Upload Page */}
          {/* <Route path="/upload" element={<ProjectPage />} /> */}
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/create" element={<CreateProjectPage />} />
          
          {/* Add this new route for the Map */}
          <Route path="/map" element={<MapView />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;