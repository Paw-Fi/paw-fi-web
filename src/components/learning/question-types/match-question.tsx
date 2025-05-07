'use client';

import { useState, useEffect } from 'react';
import classnames from 'classnames';
import type { MatchQuestion as MatchQuestionType, Item } from '@/types/learning';

interface MatchQuestionProps {
  question: MatchQuestionType;
  onAnswer: (answer: Record<string, string>) => void;
  value?: Record<string, string>;
}

function MatchQuestion({ question, onAnswer, value }: MatchQuestionProps) {
  // Track which items have been matched (itemId -> matchItemId)
  const [matches, setMatches] = useState<Record<string, string>>(value || {});
  // Track which item is currently selected
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  
  // Effect to call onAnswer when matches change
  useEffect(() => {
    // Only call onAnswer when all items have been matched
    if (Object.keys(matches).length === question.items.length) {
      onAnswer(matches);
    }
  }, [matches, onAnswer, question.items.length]);
  
  const handleItemClick = (itemId: string) => {
    // If we already have a selected item, don't allow selecting another item
    if (selectedItemId && question.items.find(item => item.id === itemId)) {
      return;
    }
    
    setSelectedItemId(itemId);
    
    // If we have a selected item and clicked a match item, create a match
    if (selectedItemId && question.matchItems.find(item => item.id === itemId)) {
      // Create a match
      setMatches(prev => ({
        ...prev,
        [selectedItemId]: itemId
      }));
      
      setSelectedItemId(null);
    }
  };
  
  const clearMatch = (itemId: string) => {
    setMatches(prev => {
      const newMatches = { ...prev };
      delete newMatches[itemId];
      return newMatches;
    });
  };
  
  // Function to get the matched item for an item
  const getMatchForItem = (itemId: string): Item | undefined => {
    const matchItemId = matches[itemId];
    return question.matchItems.find(item => item.id === matchItemId);
  };
  
  // Function to check if a match item is already matched
  const isMatchItemMatched = (matchItemId: string): boolean => {
    return Object.values(matches).includes(matchItemId);
  };
  
  return (
    <div className="match-question">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column - Items */}
        <div>
          <h3 className="font-medium mb-3">Items</h3>
          <div className="space-y-3">
            {question.items.map((item) => {
              const matchedItem = getMatchForItem(item.id);
              
              return (
                <div 
                  key={item.id}
                  onClick={() => !matchedItem && handleItemClick(item.id)}
                  className={classnames(
                    'p-4 rounded-lg border transition-all',
                    {
                      'border-primary bg-purple-50 cursor-default': matchedItem,
                      'border-gray-200 hover:border-gray-300 cursor-pointer': !matchedItem,
                      'border-purple-400 bg-purple-100': selectedItemId === item.id
                    }
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.content}</span>
                    
                    {matchedItem ? (
                      <div className="flex items-center">
                        <div className="text-gray-500 mr-2">→</div>
                        <div className="bg-purple-100 text-purple-800 text-sm py-1 px-2 rounded">
                          {matchedItem.content}
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            clearMatch(item.id);
                          }}
                          className="ml-2 text-gray-400 hover:text-red-500"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    ) : (
                      selectedItemId === item.id && (
                        <div className="text-primary font-medium">Select a match →</div>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Right column - Match items */}
        <div>
          <h3 className="font-medium mb-3">Matches</h3>
          <div className="space-y-3">
            {question.matchItems.map((matchItem) => {
              const isMatched = isMatchItemMatched(matchItem.id);
              
              return (
                <div 
                  key={matchItem.id}
                  onClick={() => selectedItemId && !isMatched && handleItemClick(matchItem.id)}
                  className={classnames(
                    'p-4 rounded-lg border transition-all',
                    {
                      'border-primary bg-purple-50 opacity-60 cursor-default': isMatched,
                      'border-gray-200 hover:border-gray-300 cursor-pointer': !isMatched && selectedItemId,
                      'border-gray-200 cursor-default': !isMatched && !selectedItemId,
                      'border-purple-400 bg-purple-100': selectedItemId && !isMatched
                    }
                  )}
                >
                  <span className="font-medium">{matchItem.content}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MatchQuestion;
