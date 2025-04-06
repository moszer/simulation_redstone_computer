import React, { useState } from 'react';
import '../styles/MapDownloadPopup.css';

const MapDownloadPopup = ({ isOpen, onClose }) => {
  const [selectedMap, setSelectedMap] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);

  const maps = [
    { id: 1, name: 'Redstone Computer Map', size: '2.5MB', description: 'A complex redstone computer simulation map' },
    { id: 2, name: 'Basic Logic Gates', size: '1.2MB', description: 'Collection of basic logic gates' },
    { id: 3, name: 'Advanced Circuits', size: '3.8MB', description: 'Advanced redstone circuits and components' },
  ];

  const handleDownload = (map) => {
    setSelectedMap(map.name);
    // Simulate download progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setDownloadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    }, 500);
  };

  if (!isOpen) return null;

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <h2>Download Minecraft Maps</h2>
        <div className="maps-list">
          {maps.map((map) => (
            <div key={map.id} className="map-item">
              <div className="map-info">
                <h3>{map.name}</h3>
                <p>{map.description}</p>
                <span className="map-size">Size: {map.size}</span>
              </div>
              <button 
                className="download-button"
                onClick={() => handleDownload(map)}
                disabled={selectedMap === map.name}
              >
                {selectedMap === map.name ? (
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                ) : (
                  'Download'
                )}
              </button>
            </div>
          ))}
        </div>
        <button className="close-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default MapDownloadPopup; 