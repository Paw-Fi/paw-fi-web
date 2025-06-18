import React, { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { useVoiceRecorder, VoiceRecordingState } from '../../hooks/use-voice-recorder';
import { createPortal } from 'react-dom';
import AIVoiceParticles, { VoiceAnimationState } from './ai-voice-particles';

interface VoiceConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export function VoiceConversationModal({ isOpen, onClose }: VoiceConversationModalProps) {
  const { recordingState, startRecording, stopRecording, error } = useVoiceRecorder();
  const [hasSpoken, setHasSpoken] = useState(false);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [animationState, setAnimationState] = useState<VoiceAnimationState>('listening');

  // Effect to handle automatic recording start and cleanup
  useEffect(() => {
    if (isOpen) {
      console.log('VoiceModal: Opened, starting recording...');
      setHasSpoken(false); // Reset speaking state
      setAnimationState('listening');
      startRecording();
    } else {
      console.log('VoiceModal: Closed, ensuring recording is stopped.');
      stopRecording(); // Ensure recording is stopped if modal is closed prematurely
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    }
    // Cleanup function for when the component unmounts or before re-running the effect if isOpen changes
    return () => {
      console.log('VoiceModal: Cleanup, stopping recording.');
      stopRecording();
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, [isOpen, startRecording, stopRecording]);

  // Effect to handle automatic stopping of recording after a duration
  useEffect(() => {
    let recordingStopTimer: NodeJS.Timeout | null = null;
    if (recordingState === VoiceRecordingState.Recording) {
      console.log('VoiceModal: Recording, will stop in 4s.');
      recordingStopTimer = setTimeout(() => {
        console.log('VoiceModal: 4s elapsed, stopping recording.');
        stopRecording();
      }, 4000); // Listen for 4 seconds then stop
    }
    return () => {
      if (recordingStopTimer) {
        clearTimeout(recordingStopTimer);
      }
    };
  }, [recordingState, stopRecording]);

  // Effect to handle auto-closing the modal after AI has spoken and update animation state
  useEffect(() => {
    // Update animation state based on recording state
    switch (recordingState) {
      case VoiceRecordingState.Recording:
        console.log('VoiceModal: User speaking...');
        setAnimationState('listening');
        break;
      case VoiceRecordingState.Processing:
        console.log('VoiceModal: Processing...');
        setAnimationState('thinking');
        break;
      case VoiceRecordingState.Speaking:
        console.log('VoiceModal: AI Speaking...');
        setAnimationState('speaking');
        setHasSpoken(true);
        break;
      case VoiceRecordingState.Error:
        console.log('VoiceModal: Error state');
        setAnimationState('unauthorized');
        break;
    }

    if (hasSpoken && recordingState === VoiceRecordingState.Idle) {
      console.log('VoiceModal: AI finished, auto-closing in 2s.');
      autoCloseTimerRef.current = setTimeout(() => {
        console.log('VoiceModal: Auto-closing now.');
        onClose();
      }, 2000); // Wait 2 seconds after AI finishes before closing
    }

    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, [recordingState, hasSpoken, onClose]);

  // This useEffect is now redundant with the first one and has been removed

  const handleModalClose = () => {
    console.log('VoiceModal: Close button clicked / backdrop clicked.');
    // stopRecording(); // Stop recording is handled by useEffect cleanup for isOpen
    onClose();
  };

  const renderContent = () => {
    // Show animation for all states
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6">
        <div className="w-64 h-64 flex items-center justify-center">
          <AIVoiceParticles state={animationState} />
        </div>
        
        {/* Display status text based on state */}
        <div className="text-center">
          {error ? (
            <p className="text-red-300 font-medium">{error}</p>
          ) : (
            <p className="text-purple-100 font-medium">
              {recordingState === VoiceRecordingState.Idle && 'Ready'}
              {recordingState === VoiceRecordingState.RequestingPermission && 'Requesting microphone access...'}
              {recordingState === VoiceRecordingState.Recording && 'Listening...'}
              {recordingState === VoiceRecordingState.Processing && 'Thinking...'}
              {recordingState === VoiceRecordingState.Speaking && 'Speaking...'}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    createPortal(
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed w-screen h-screen inset-0 z-50 flex items-center justify-center bg-purple-300/30 backdrop-blur-lg"
          >
            {/* Removed the inner motion.div that created the smaller modal appearance */}
            {/* Content is now directly inside the full-screen backdrop */}
            <div className="relative flex flex-col items-center justify-center w-full h-full text-white">
              <button
                onClick={handleModalClose} // Use the new handler
                className="absolute top-6 right-6 text-purple-100 hover:text-white transition-colors z-10"
                aria-label="Close voice chat"
              >
                <FontAwesomeIcon icon={faXmark} size="2x" />
              </button>
              <div className="flex flex-col items-center justify-center h-full w-full max-w-2xl mx-auto">
                {renderContent()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)
  );
}
