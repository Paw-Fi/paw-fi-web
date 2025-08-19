import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronUp, faMagicWandSparkles } from '@fortawesome/free-solid-svg-icons';
import { presetProfiles, PresetProfile } from '@/types/preset-profiles';

interface PresetProfileSelectorProps {
  onProfileSelect: (profileAnswers: Record<string, any>, profileName: string) => void;
}

export function PresetProfileSelector({ onProfileSelect }: PresetProfileSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleProfileSelect = (profile: PresetProfile) => {
    onProfileSelect(profile.answers, profile.name);
    setIsExpanded(false);
  };

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex mx-auto items-center gap-2 text-md font-bold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        <FontAwesomeIcon icon={faMagicWandSparkles} className="text-md" />
        <span>Quick fill with preset profile (Optional)</span>
        <FontAwesomeIcon 
          icon={isExpanded ? faChevronUp : faChevronDown} 
          className="text-md transition-transform" 
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
            <div className="bg-[#f1e8fd] dark:bg-[#1a0b2e] rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                Select a profile that matches your situation to auto-fill all questions:
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {presetProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => handleProfileSelect(profile)}
                    className="text-left p-3 bg-white dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 hover:border-primary dark:hover:border-primary hover:shadow-sm transition-all text-xs"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{profile.icon}</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200">{profile.name}</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-xs mb-1">{profile.description}</p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 italic">
                Note: You can still modify any answers after applying a preset profile.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}