import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './mockFetch.ts'; // Client-side high-fidelity API mock layer for 100% serverless/static hosting
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
