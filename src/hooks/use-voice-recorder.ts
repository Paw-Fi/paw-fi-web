import { useState, useCallback, useEffect } from 'react';

export enum VoiceRecordingState {
  Idle,
  RequestingPermission,
  Recording,
  Processing,
  Speaking,
  Error,
}

export function useVoiceRecorder() {
  const [recordingState, setRecordingState] = useState<VoiceRecordingState>(VoiceRecordingState.Idle);
  const [error, setError] = useState<string | null>(null);
  // In a real app, you'd manage the MediaRecorder instance here

  const startRecording = useCallback(async () => {
    setRecordingState(VoiceRecordingState.RequestingPermission);
    setError(null);

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // In a real app, you would initialize MediaRecorder with this stream
      console.log('Microphone access granted');
      stream.getTracks().forEach(track => track.stop()); // Stop track immediately for this mock

      setRecordingState(VoiceRecordingState.Recording);

      // Mock user speaking for a few seconds
      setTimeout(() => {
        stopRecording();
      }, 4000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      if (err instanceof Error) {
          if (err.name === 'NotAllowedError') {
              setError('Microphone permission was denied. Please enable it in your browser settings.');
          } else {
              setError('Could not access the microphone. Please ensure it is connected and not in use by another application.');
          }
      } else {
        setError('An unknown error occurred while accessing the microphone.');
      }
      setRecordingState(VoiceRecordingState.Error);
    }
  }, []);

  const stopRecording = useCallback(() => {
    // In a real app, you would stop the MediaRecorder and get the audio data
    console.log('Recording stopped');
    setRecordingState(VoiceRecordingState.Processing);

    // Mock processing time
    setTimeout(() => {
      console.log('Processing complete, AI speaking');
      setRecordingState(VoiceRecordingState.Speaking);

      // Mock AI speaking time
      setTimeout(() => {
        console.log('AI finished speaking');
        setRecordingState(VoiceRecordingState.Idle);
      }, 5000);
    }, 2000);

  }, []);

  // Cleanup function
  useEffect(() => {
    return () => {
      // In a real app, ensure any active MediaRecorder is stopped here
    };
  }, []);

  return { recordingState, error, startRecording, stopRecording };
}
