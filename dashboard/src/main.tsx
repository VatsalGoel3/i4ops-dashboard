import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { UIProvider } from './context/UIContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
    <UIProvider>
      <App />
    </UIProvider>
    </BrowserRouter>
  </React.StrictMode>
);