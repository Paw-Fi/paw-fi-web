'use client';

import { useState, useEffect, useRef } from 'react';
import classnames from 'classnames';
import type { MatchQuestion as MatchQuestionType, Item } from '@/types/learning.types';

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
  
  // Reference to prevent infinite update loops
  const prevAnswerRef = useRef<string>('');
  
  // Get items from the question, with null safety
  const items: Item[] = Array.isArray(question.items) ? question.items : [];
  
  // Support both matchItems and options field names with fallback to empty array
  const matchOptions: Item[] = Array.isArray(question.matchItems) ? question.matchItems : 
                       Array.isArray((question as any).options) ? (question as any).options : [];
  
  // Effect to call onAnswer when matches change
  useEffect(() => {
    // Convert matches to string for comparison
    const currentMatches = JSON.stringify(matches);
    
    // Only call onAnswer when all items have been matched AND the matches have changed
    if (items.length > 0 && 
        Object.keys(matches).length === items.length && 
        currentMatches !== prevAnswerRef.current) {
      
      // Update the reference
      prevAnswerRef.current = currentMatches;
      
      // Use requestAnimationFrame to avoid state updates during render
      requestAnimationFrame(() => {
        onAnswer(matches);
      });
    }
  }, [matches, onAnswer, items.length]);
  
  const handleItemClick = (itemId: string) => {
    // If we already have a selected item, don't allow selecting another item
    if (selectedItemId && items.some(item => item.id === itemId)) {
      return;
    }
    
    setSelectedItemId(itemId);
    
    // If we have a selected item and clicked a match item, create a match
    if (selectedItemId && matchOptions.some((item: Item) => item.id === itemId)) {
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
    if (!matchItemId) return undefined;
    return matchOptions.find(item => item.id === matchItemId);
  };
  
  // Function to check if a match item is already matched
  const isMatchItemMatched = (matchItemId: string): boolean => {
    return Object.values(matches).includes(matchItemId);
  };
  
  // Check if we have the required data to render
  if (!items.length || !matchOptions.length) {
    return (
      <div className="p-4 rounded-lg border border-[var(--quiz-error-border)] bg-[var(--quiz-error-bg)] text-[var(--quiz-error-text)]">
        <p className="font-medium">Error: Match question is missing required data.</p>
        <p className="text-sm mt-1">The question needs both items and matching options.</p>
      </div>
    );
  }
  
  return (
    <div className="match-question">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column - Items */}
        <div>
          <h3 className="font-medium mb-3 text-[var(--question-text)]">Items</h3>
          <div className="space-y-3">
            {items.map((item: Item) => {
              const matchedItem = getMatchForItem(item.id);

              return (
                <div
                  key={item.id}
                  onClick={() => !matchedItem && handleItemClick(item.id)}
                  className={classnames(
                    'p-4 rounded-lg border transition-all',
                    {
                      'border-[var(--quiz-selected-border)] bg-[var(--quiz-selected-bg)] cursor-default': matchedItem,
                      'border-[var(--question-border)] hover:border-[var(--question-hover-border)] cursor-pointer': !matchedItem,
                      'border-[var(--quiz-selected-border)] bg-[var(--quiz-selected-bg)]': selectedItemId === item.id
                    }
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[var(--question-text)]">{item.content}</span>

                    {matchedItem ? (
                      <div className="flex items-center">
                        <div className="text-[var(--question-text-secondary)] mr-2">→</div>
                        <div className="bg-[var(--quiz-selected-bg)] text-[var(--quiz-selected-text)] text-sm py-1 px-2 rounded">
                          {matchedItem.content}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearMatch(item.id);
                          }}
                          className="ml-2 text-[var(--question-text-secondary)] hover:text-[var(--quiz-error-icon)]"
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
          <h3 className="font-medium mb-3 text-[var(--question-text)]">Matches</h3>
          <div className="space-y-3">
            {matchOptions.map((matchItem: Item) => {
              const isMatched = isMatchItemMatched(matchItem.id);

              return (
                <div
                  key={matchItem.id}
                  onClick={() => selectedItemId && !isMatched && handleItemClick(matchItem.id)}
                  className={classnames(
                    'p-4 rounded-lg border transition-all',
                    {
                      'border-[var(--quiz-selected-border)] bg-[var(--quiz-selected-bg)] opacity-60 cursor-default': isMatched,
                      'border-[var(--question-border)] hover:border-[var(--question-hover-border)] cursor-pointer': !isMatched && selectedItemId,
                      'border-[var(--question-border)] cursor-default': !isMatched && !selectedItemId,
                      'border-[var(--quiz-selected-border)] bg-[var(--quiz-selected-bg)]': selectedItemId && !isMatched
                    }
                  )}
                >
                  <span className="font-medium text-[var(--question-text)]">{matchItem.content}</span>
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
