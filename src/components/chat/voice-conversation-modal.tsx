import React, { useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import {
  useVoiceRecorder,
  VoiceRecordingState,
} from "../../hooks/use-voice-recorder";
import { createPortal } from "react-dom";
import AIVoiceParticles, { VoiceAnimationState } from "./ai-voice-particles";

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

export function VoiceConversationModal({
  isOpen,
  onClose,
}: VoiceConversationModalProps) {
  const { recordingState, startRecording, stopRecording, error } =
    useVoiceRecorder();
  const [hasSpoken, setHasSpoken] = useState(false);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [animationState, setAnimationState] =
    useState<VoiceAnimationState>("listening");

  // Effect to handle automatic recording start and cleanup
  useEffect(() => {
    if (isOpen) {
      setHasSpoken(false); // Reset speaking state
      setAnimationState("listening");
      startRecording();
    } else {
      stopRecording(); // Ensure recording is stopped if modal is closed prematurely
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    }
    // Cleanup function for when the component unmounts or before re-running the effect if isOpen changes
    return () => {
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
      recordingStopTimer = setTimeout(() => {
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
        setAnimationState("listening");
        break;
      case VoiceRecordingState.Processing:
        setAnimationState("thinking");
        break;
      case VoiceRecordingState.Speaking:
        setAnimationState("speaking");
        setHasSpoken(true);
        break;
      case VoiceRecordingState.Error:
        setAnimationState("unauthorized");
        break;
    }

    if (hasSpoken && recordingState === VoiceRecordingState.Idle) {
      autoCloseTimerRef.current = setTimeout(() => {
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
    // stopRecording(); // Stop recording is handled by useEffect cleanup for isOpen
    onClose();
  };

  const renderContent = () => {
    // Show animation for all states
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-6">
        <div className="flex h-64 w-64 items-center justify-center">
          <AIVoiceParticles state={animationState} />
        </div>

        {/* Display status text based on state */}
        <div className="text-center">
          {error ? (
            <p className="font-medium text-red-300">{error}</p>
          ) : (
            <p className="font-medium text-purple-100">
              {recordingState === VoiceRecordingState.Idle && "Ready"}
              {recordingState === VoiceRecordingState.RequestingPermission &&
                "Requesting microphone access..."}
              {recordingState === VoiceRecordingState.Recording &&
                "Listening..."}
              {recordingState === VoiceRecordingState.Processing &&
                "Thinking..."}
              {recordingState === VoiceRecordingState.Speaking && "Speaking..."}
            </p>
          )}
        </div>
      </div>
    );
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 flex h-screen w-screen items-center justify-center bg-purple-300/30 backdrop-blur-lg"
        >
          {/* Removed the inner motion.div that created the smaller modal appearance */}
          {/* Content is now directly inside the full-screen backdrop */}
          <div className="relative flex h-full w-full flex-col items-center justify-center text-white">
            <button
              onClick={handleModalClose} // Use the new handler
              className="absolute top-6 right-6 z-10 text-purple-100 transition-colors hover:text-white"
              aria-label="Close voice chat"
            >
              <FontAwesomeIcon icon={faXmark} size="2x" />
            </button>
            <div className="mx-auto flex h-full w-full max-w-2xl flex-col items-center justify-center">
              {renderContent()}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
