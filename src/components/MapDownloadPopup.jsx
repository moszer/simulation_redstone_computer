import React, { useState, useEffect } from 'react';
import '../styles/MapDownloadPopup.css';

const MapDownloadPopup = ({ isOpen, onClose }) => {
  const [selectedMap, setSelectedMap] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSpeed, setDownloadSpeed] = useState('0 KB/s');
  const [timeRemaining, setTimeRemaining] = useState('Calculating...');
  const [fileSize, setFileSize] = useState('Calculating...');
  const [lastUpdateTime, setLastUpdateTime] = useState('Fetching...');

  const maps = [
    {
      id: 1,
      name: '8-bit Redstone Computer',
      description: 'A fully functional 8-bit redstone computer built in Minecraft',
      url: 'https://raw.githubusercontent.com/moszer/simulation_redstone_computer/main/src/minecraftWorld/8bit_redstone_com.mcworld'
    }
  ];

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const fetchFileSize = async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok) throw new Error('Failed to fetch file size');
      const size = response.headers.get('content-length');
      if (size) {
        setFileSize(formatBytes(parseInt(size, 10)));
      } else {
        setFileSize('Unknown');
      }
    } catch (error) {
      console.error('Error fetching file size:', error);
      setFileSize('Unknown');
    }
  };

  const fetchLastUpdateTime = async () => {
    try {
      const responseContent = await fetch('https://api.github.com/repos/moszer/simulation_redstone_computer/contents/src/minecraftWorld/8bit_redstone_com.mcworld');
      if (!responseContent.ok) throw new Error('Failed to fetch file content data');
      const dataContent = await responseContent.json();
      const sha = dataContent.sha;

      const responseCommit = await fetch(`https://api.github.com/repos/moszer/simulation_redstone_computer/commits?path=src/minecraftWorld/8bit_redstone_com.mcworld&sha=main`);
      if (!responseCommit.ok) throw new Error('Failed to fetch commit data');
      const dataCommit = await responseCommit.json();

      if (dataCommit.length > 0) {
        const lastCommit = dataCommit[0];
        const date = new Date(lastCommit.commit.committer.date);
        setLastUpdateTime(date.toLocaleString());
      } else {
        setLastUpdateTime('Unknown');
      }
    } catch (error) {
      console.error('Error fetching last update time:', error);
      setLastUpdateTime('Unknown');
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFileSize(maps[0].url);
      fetchLastUpdateTime();
    }
  }, [isOpen]);

  const handleDownload = async (map) => {
    try {
      setIsDownloading(true);
      setSelectedMap(map);
      setDownloadProgress(0);
      setDownloadSpeed('0 KB/s');
      setTimeRemaining('Calculating...');

      const startTime = Date.now();
      const response = await fetch(map.url);
      if (!response.ok) throw new Error('Download failed');

      const contentLength = response.headers.get('content-length');
      const total = parseInt(contentLength, 10);
      let loaded = 0;
      let lastLoaded = 0;
      let lastTime = startTime;

      const reader = response.body.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        loaded += value.length;
        
        // Calculate progress
        const progress = (loaded / total) * 100;
        setDownloadProgress(Math.min(progress, 100));

        // Calculate speed
        const currentTime = Date.now();
        const timeDiff = (currentTime - lastTime) / 1000; // in seconds
        if (timeDiff >= 1) { // Update every second
          const bytesPerSecond = (loaded - lastLoaded) / timeDiff;
          setDownloadSpeed(`${formatBytes(bytesPerSecond)}/s`);

          // Calculate time remaining
          const remainingBytes = total - loaded;
          const remainingSeconds = remainingBytes / bytesPerSecond;
          setTimeRemaining(formatTime(remainingSeconds));

          lastLoaded = loaded;
          lastTime = currentTime;
        }
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

      // Show completion for a moment before closing
      setDownloadProgress(100);
      setDownloadSpeed('Complete!');
      setTimeRemaining('0s');
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
        setDownloadSpeed('0 KB/s');
        setTimeRemaining('Calculating...');
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download the map. Please try again.');
      setIsDownloading(false);
      setDownloadProgress(0);
      setDownloadSpeed('0 KB/s');
      setTimeRemaining('Calculating...');
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
                <p className="map-size">Size: {fileSize}</p>
                <p className="map-update-time">Last updated: {lastUpdateTime}</p>
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
            <div className="progress-details">
              <span className="progress-text">{Math.round(downloadProgress)}%</span>
              <span className="download-speed">{downloadSpeed}</span>
              <span className="time-remaining">ETA: {timeRemaining}</span>
            </div>
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
