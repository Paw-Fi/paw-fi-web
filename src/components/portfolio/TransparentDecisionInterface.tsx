import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface DecisionReasoning {
  id: string;
  decision_type: string;
  primary_reasoning: string[];
  market_context: Record<string, any>;
  risk_assessment: Record<string, any>;
  confidence_score: number;
  data_sources: string[];
  alternative_options: any[];
  expected_outcomes: Record<string, any>;
  created_at: string;
  explanations?: {
    simple: string;
    detailed: string;
    technical: string;
  };
}

interface TransparentDecisionInterfaceProps {
  userId: string;
  goalId?: string;
  recommendations?: any[];
  className?: string;
}

export const TransparentDecisionInterface: React.FC<TransparentDecisionInterfaceProps> = ({
  userId,
  goalId,
  recommendations = [],
  className = ''
}) => {
  const [selectedDecision, setSelectedDecision] = useState<DecisionReasoning | null>(null);
  const [explanationLevel, setExplanationLevel] = useState<'simple' | 'detailed' | 'technical'>('detailed');
  const [showDataSources, setShowDataSources] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  // Fetch recent decision reasoning
  const { data: recentDecisions, isLoading } = useQuery({
    queryKey: ['decision-reasoning', userId, goalId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('ai_decision_reasoning')
        .select(`
          *,
          decision_explanations!ai_decision_reasoning_id_fkey (
            explanation_type,
            explanation_content,
            key_concepts
          )
        `)
        .eq('user_id', userId)
        .eq(goalId ? 'goal_id' : 'id', goalId || userId) // Conditional filter
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      // Transform the data to include explanations
      return data?.map(decision => ({
        ...decision,
        explanations: decision.decision_explanations?.reduce((acc: any, exp: any) => {
          acc[exp.explanation_type] = exp.explanation_content.text || exp.explanation_content;
          return acc;
        }, {})
      })) || [];
    },
    enabled: !!userId
  });

  // Set the first decision as selected by default
  useEffect(() => {
    if (recentDecisions && recentDecisions.length > 0 && !selectedDecision) {
      setSelectedDecision(recentDecisions[0]);
    }
  }, [recentDecisions, selectedDecision]);

  if (isLoading) {
    return (
      <div className={`${className} animate-pulse`}>
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!recentDecisions || recentDecisions.length === 0) {
    return (
      <div className={`${className} text-center py-8`}>
        <div className="text-gray-500 dark:text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h3 className="text-lg font-medium mb-2">No Recent AI Decisions</h3>
          <p className="text-sm">
            Once our AI makes recommendations for your portfolio, you'll see detailed explanations here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Decision Selector */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Decision Transparency
          </h3>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Explanation Level:
            </label>
            <select
              value={explanationLevel}
              onChange={(e) => setExplanationLevel(e.target.value as any)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700"
            >
              <option value="simple">Simple</option>
              <option value="detailed">Detailed</option>
              <option value="technical">Technical</option>
            </select>
          </div>
        </div>

        {/* Decision List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Decision List */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Recent Decisions
            </h4>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {recentDecisions.map((decision) => (
                <motion.button
                  key={decision.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedDecision(decision)}
                  className={`
                    w-full text-left p-3 rounded-lg border transition-all
                    ${selectedDecision?.id === decision.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {decision.decision_type.replace('_', ' ')}
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className={`
                        w-2 h-2 rounded-full
                        ${decision.confidence_score >= 0.8 ? 'bg-green-500' :
                          decision.confidence_score >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}
                      `} />
                      <span className="text-xs text-gray-500">
                        {Math.round(decision.confidence_score * 100)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    {decision.primary_reasoning?.[0] || 'AI analysis completed'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(decision.created_at).toLocaleDateString()}
                  </p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Right Column - Decision Details */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {selectedDecision && (
                <motion.div
                  key={selectedDecision.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Decision Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900 dark:text-white capitalize">
                        {selectedDecision.decision_type.replace('_', ' ')} Decision
                      </h4>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Confidence:</span>
                          <div className="flex items-center space-x-1">
                            <div className={`
                              w-3 h-3 rounded-full
                              ${selectedDecision.confidence_score >= 0.8 ? 'bg-green-500' :
                                selectedDecision.confidence_score >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}
                            `} />
                            <span className="text-sm font-medium">
                              {Math.round(selectedDecision.confidence_score * 100)}%
                            </span>
                          </div>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(selectedDecision.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AI Explanation */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      AI Explanation ({explanationLevel})
                    </h5>
                    <div className="text-blue-800 dark:text-blue-200 text-sm leading-relaxed">
                      {selectedDecision.explanations?.[explanationLevel] || (
                        <div className="space-y-2">
                          <p className="font-medium">Primary Reasoning:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {selectedDecision.primary_reasoning?.map((reason, idx) => (
                              <li key={idx}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expandable Sections */}
                  <div className="space-y-4">
                    {/* Data Sources */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                      <button
                        onClick={() => setShowDataSources(!showDataSources)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <span className="font-medium text-gray-900 dark:text-white">
                          Data Sources ({selectedDecision.data_sources?.length || 0})
                        </span>
                        <motion.svg
                          animate={{ rotate: showDataSources ? 180 : 0 }}
                          className="w-5 h-5 text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </motion.svg>
                      </button>
                      <AnimatePresence>
                        {showDataSources && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700/50"
                          >
                            <div className="grid grid-cols-2 gap-2">
                              {selectedDecision.data_sources?.map((source, idx) => (
                                <div key={idx} className="flex items-center space-x-2">
                                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                                    {source.replace('_', ' ')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Alternative Options */}
                    {selectedDecision.alternative_options && selectedDecision.alternative_options.length > 0 && (
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                        <button
                          onClick={() => setShowAlternatives(!showAlternatives)}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <span className="font-medium text-gray-900 dark:text-white">
                            Alternative Options Considered ({selectedDecision.alternative_options.length})
                          </span>
                          <motion.svg
                            animate={{ rotate: showAlternatives ? 180 : 0 }}
                            className="w-5 h-5 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </motion.svg>
                        </button>
                        <AnimatePresence>
                          {showAlternatives && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-700/50"
                            >
                              <div className="space-y-3">
                                {selectedDecision.alternative_options.map((option, idx) => (
                                  <div key={idx} className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                                    <h6 className="font-medium text-gray-900 dark:text-white">
                                      {option.name}
                                    </h6>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {option.description}
                                    </p>
                                    <div className="flex items-center justify-between mt-2 text-xs">
                                      <span className="text-green-600 dark:text-green-400">
                                        Pros: {option.pros?.join(', ')}
                                      </span>
                                      <span className="text-red-600 dark:text-red-400">
                                        Cons: {option.cons?.join(', ')}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Expected Outcomes */}
                    {selectedDecision.expected_outcomes && (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                        <h5 className="font-medium text-green-900 dark:text-green-100 mb-2">
                          Expected Outcomes
                        </h5>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {Object.entries(selectedDecision.expected_outcomes).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-green-700 dark:text-green-300 capitalize">
                                {key.replace('_', ' ')}:
                              </span>
                              <span className="text-green-800 dark:text-green-200 font-medium">
                                {typeof value === 'number' ? value.toFixed(2) : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                      Ask Questions About This Decision
                    </button>
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      Learn More About {selectedDecision.decision_type.replace('_', ' ')}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransparentDecisionInterface;