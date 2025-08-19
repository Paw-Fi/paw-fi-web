import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBrain, faChartLine, faCopy } from "@fortawesome/free-solid-svg-icons";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface StrategySection {
  title: string;
  content: string[];
}

export function StrategyModal({ 
  isOpen, 
  onClose, 
  goal 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  goal: any;
}) {
  if (!goal?.ai_generated_strategy) {
    return null;
  }

  // Parse the AI strategy into structured sections
  const parseStrategy = (strategy: string): StrategySection[] => {
    const paragraphs = strategy.split('\n\n').filter(p => p.trim());
    const sections: StrategySection[] = [];
    let currentSection: StrategySection | null = null;
    
    for (const paragraph of paragraphs) {
      const lines = paragraph.split('\n').filter(l => l.trim());
      
      // Check if this looks like a section header
      if (lines.length === 1 && (
        lines[0].includes(':') ||
        lines[0].match(/^\d+\./) ||
        lines[0].toLowerCase().includes('strategy') ||
        lines[0].toLowerCase().includes('step') ||
        lines[0].toLowerCase().includes('phase')
      )) {
        // Start new section
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          title: lines[0].replace(/^\d+\.\s*/, '').replace(/:$/, ''),
          content: []
        };
      } else {
        // Add to current section or create general section
        if (!currentSection) {
          currentSection = {
            title: 'Overview',
            content: []
          };
        }
        currentSection.content.push(paragraph);
      }
    }
    
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections.length > 0 ? sections : [{
      title: 'AI Strategy',
      content: [strategy]
    }];
  };

  const strategySections = parseStrategy(goal.ai_generated_strategy);
  const wordCount = goal.ai_generated_strategy.split(' ').length;
  const readingTime = Math.ceil(wordCount / 200); // ~200 words per minute

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete AI Strategy"
    >
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <FontAwesomeIcon icon={faBrain} className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-1">
                AI-Generated Strategy for "{goal.title}"
              </h3>
              <div className="flex items-center gap-4 text-sm text-indigo-800 dark:text-indigo-200">
                <span>{wordCount} words</span>
                <span>•</span>
                <span>{readingTime} min read</span>
                <span>•</span>
                <span>Target: ${goal.target_amount?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Content */}
        <div className="space-y-6">
          {strategySections.map((section, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-700/50 rounded-xl p-6 border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {section.title}
                </h3>
              </div>
              
              <div className="space-y-4">
                {section.content.map((paragraph, pIndex) => (
                  <div key={pIndex} className="prose prose-gray dark:prose-invert max-w-none">
                    {paragraph.split('\n').map((line, lIndex) => {
                      // Check if line is a bullet point or numbered item
                      if (line.trim().match(/^[-•*]\s/) || line.trim().match(/^\d+\./)) {
                        return (
                          <div key={lIndex} className="flex items-start gap-3 mb-2">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                              {line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '')}
                            </p>
                          </div>
                        );
                      } else {
                        return (
                          <p key={lIndex} className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3 last:mb-0">
                            {line}
                          </p>
                        );
                      }
                    })}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Key Metrics Summary */}
        {goal.target_amount && (
          <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-indigo-50/50 dark:from-gray-700/50 dark:to-indigo-900/20 rounded-xl border border-gray-200/50 dark:border-gray-600/50">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faChartLine} className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Goal Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  ${goal.target_amount.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Target Amount</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  ${goal.current_amount.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Current Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {goal.progress_percentage.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Complete</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="sm:order-1"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                // Copy strategy to clipboard
                navigator.clipboard.writeText(goal.ai_generated_strategy);
                // Could show a toast here
                onClose();
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white sm:order-2"
            >
              <FontAwesomeIcon icon={faCopy} className="w-4 h-4 mr-2" />
              Copy Strategy
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
