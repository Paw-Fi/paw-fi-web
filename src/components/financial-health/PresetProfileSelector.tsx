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
    <div className="mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex mx-auto items-center gap-3 font-semibold text-foreground hover:text-primary transition-colors duration-200"
      >
        <FontAwesomeIcon icon={faMagicWandSparkles} className="w-5 h-5" />
        <span>Quick fill with preset profile (Optional)</span>
        <FontAwesomeIcon 
          icon={isExpanded ? faChevronUp : faChevronDown} 
          className="w-4 h-4 transition-transform duration-200" 
        />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-6 overflow-hidden"
          >
            <div className="bg-subtle-background rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-muted-foreground-color mb-4">
                Select a profile that matches your situation to auto-fill all questions:
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {presetProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => handleProfileSelect(profile)}
                    className="text-left p-4 bg-card rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{profile.icon}</span>
                      <span className="font-semibold text-foreground text-sm">{profile.name}</span>
                    </div>
                    <p className="text-muted-foreground-color text-xs leading-relaxed">{profile.description}</p>
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground-color mt-4">
                Note: You can still modify any answers after applying a preset profile.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}