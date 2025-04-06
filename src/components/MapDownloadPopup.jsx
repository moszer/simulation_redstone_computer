import React, { useState } from 'react';
import '../styles/MapDownloadPopup.css';

const MapDownloadPopup = ({ isOpen, onClose }) => {
  const [selectedMap, setSelectedMap] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const maps = [
    {
      id: 1,
      name: '8-bit Redstone Computer',
      size: '780 KB',
      description: 'A fully functional 8-bit redstone computer built in Minecraft created by Moszer',
      url: 'https://raw.githubusercontent.com/moszer/simulation_redstone_computer/main/src/minecraftWorld/8bit_redstone_com.mcworld'
    }
  ];

  const handleDownload = async (map) => {
    try {
      setIsDownloading(true);
      setSelectedMap(map);
      setDownloadProgress(0);

      const response = await fetch(map.url);
      if (!response.ok) throw new Error('Download failed');

      const contentLength = response.headers.get('content-length');
      const total = parseInt(contentLength, 10);
      let loaded = 0;

      const reader = response.body.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        loaded += value.length;
        const progress = (loaded / total) * 100;
        setDownloadProgress(Math.min(progress, 100));
      }

      const blob = new Blob(chunks, { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${map.name}.mcworld`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Simulate a small delay to show 100% completion
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download the map. Please try again.');
      setIsDownloading(false);
      setDownloadProgress(0);
    }
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
                <p className="map-size">Size: {map.size}</p>
              </div>
              <button
                className="download-button"
                onClick={() => handleDownload(map)}
                disabled={isDownloading && selectedMap?.id === map.id}
              >
                {isDownloading && selectedMap?.id === map.id ? 'Downloading...' : 'Download'}
              </button>
            </div>
          ))}
        </div>
        {isDownloading && (
          <div className="progress-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
            <span className="progress-text">{Math.round(downloadProgress)}%</span>
          </div>
        )}
        <button className="close-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default MapDownloadPopup; 