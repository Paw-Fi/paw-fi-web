import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp, faMagicWandSparkles } from '@fortawesome/free-solid-svg-icons';
import { presetProfiles, PresetProfile } from '@/types/preset-profiles';

interface PresetProfileSelectorProps {
  onProfileSelect: (profileAnswers: Record<string, any>, profileName: string) => void;
}

export function PresetProfileSelector({ onProfileSelect }: PresetProfileSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleProfileSelect = (profile: PresetProfile) => {
    onProfileSelect(profile.answers, profile.name);
    setIsExpanded(false);
  };

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        <FontAwesomeIcon icon={faMagicWandSparkles} className="text-xs" />
        <span>Quick fill with preset profile</span>
        <FontAwesomeIcon 
          icon={isExpanded ? faChevronUp : faChevronDown} 
          className="text-xs transition-transform" 
        />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 overflow-hidden"
          >
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-600 mb-3">
                Select a profile that matches your situation to auto-fill all questions:
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {presetProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => handleProfileSelect(profile)}
                    className="text-left p-3 bg-white rounded-md border border-gray-200 hover:border-primary hover:shadow-sm transition-all text-xs"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{profile.icon}</span>
                      <span className="font-medium text-gray-800">{profile.name}</span>
                    </div>
                    <p className="text-gray-600 text-xs mb-1">{profile.description}</p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3 italic">
                Note: You can still modify any answers after applying a preset profile.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}