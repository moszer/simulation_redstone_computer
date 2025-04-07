import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';
import ReactGA from "react-ga4";

// Initialize ReactGA with your GA4 measurement ID
ReactGA.initialize("G-1CHYMV53DN");

// Send an initial pageview event
ReactGA.send({ hitType: "pageview", page: window.location.pathname });

// --- Time on Page Tracking ---
let startTime = Date.now(); // Record start time

const sendTimeOnPage = () => {
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000); // Duration in seconds

  ReactGA.event({
    category: "Engagement",
    action: "Time on Page",
    value: duration, // Send duration as a value
    nonInteraction: true, // This event does not affect bounce rate
  });
};

// Listen for beforeunload event (user leaving the page)
window.addEventListener('beforeunload', sendTimeOnPage);

// Clean up the event listener when the component unmounts
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
