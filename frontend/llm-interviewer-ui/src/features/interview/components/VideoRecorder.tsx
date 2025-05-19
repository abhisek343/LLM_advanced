import React, { useState, useRef } from 'react';

interface VideoRecorderProps {
  onRecordingComplete: (videoUrl: string) => void; // In a real app, this would be a File or Blob
  disabled?: boolean;
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({ onRecordingComplete, disabled = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [videoURL, setVideoURL] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // In a real implementation, you'd use MediaRecorder API

  const handleStartRecording = () => {
    setIsRecording(true);
    setVideoURL(null);
    // Placeholder: Simulate recording and then provide a dummy URL
    console.log("Recording started (simulated)");
    setTimeout(() => {
      const dummyVideoUrl = 'https://www.w3schools.com/html/mov_bbb.mp4'; // Example video
      setVideoURL(dummyVideoUrl);
      setIsRecording(false);
      onRecordingComplete(dummyVideoUrl);
      console.log("Recording finished (simulated), video available at:", dummyVideoUrl);
    }, 5000); // Simulate 5 seconds recording
  };

  const handleStopRecording = () => {
    // This would be handled by the MediaRecorder API in a real scenario
    // For this placeholder, the timeout in handleStartRecording simulates completion
    console.log("Stop recording called (simulated)");
  };
  
  const handleRetake = () => {
    setVideoURL(null);
    // Potentially call onRecordingComplete with an empty string or null 
    // if the parent component needs to know the video was discarded.
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '10px', textAlign: 'center' }}>
      <h4>Video Answer</h4>
      {videoURL ? (
        <div>
          <video ref={videoRef} src={videoURL} controls width="320" height="240" />
          <div>
            <button onClick={handleRetake} style={{ marginRight: '10px' }} disabled={disabled}>Retake Video</button>
            <p>Video recorded. You can proceed or retake.</p>
          </div>
        </div>
      ) : isRecording ? (
        <div>
          <p>Recording in progress...</p>
          {/* Visual feedback for recording, e.g., a red dot or timer */}
          <button onClick={handleStopRecording} disabled>Stop Recording (Simulated)</button>
        </div>
      ) : (
        <button onClick={handleStartRecording} disabled={disabled}>Start Recording</button>
      )}
      <p style={{ fontSize: '0.8em', marginTop: '10px' }}>
        This is a placeholder for video recording. Clicking "Start Recording" will simulate a 5-second recording.
      </p>
    </div>
  );
};

export default VideoRecorder;
