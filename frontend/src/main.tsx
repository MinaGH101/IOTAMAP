import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App' // No extension needed with "Bundler" mode
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)