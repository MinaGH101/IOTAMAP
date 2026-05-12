// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// 1. ADDED EXPLICIT EXTENSIONS
// Use .js even though the source files are .tsx
import Login from './components/Login.js';
import Register from './components/Register.js';
import CreateProjectPage from './components/CreateProjectPage.js';
import UpdateProjectPage from './components/UpdateProjectPage.js';
import MapView from './components/Map/MapView.js'; 
import ProjectsPage from './components/ProjectsPage.js';

import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className="main-wrapper">
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/create" element={<CreateProjectPage />} />
          <Route path="/projects/update/:projectId" element={<UpdateProjectPage />} />
          
          <Route path="/map" element={<MapView />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;