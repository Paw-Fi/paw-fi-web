import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaperPlane,
  faRobot,
  faUser,
  faLightbulb,
  faChartLine,
  faGraduationCap,
  faShieldAlt,
  faClock,
  faThumbsUp,
  faThumbsDown,
  faSpinner,
  faMicrophone,
  faStop,
  faVolumeUp,
  faExpand,
  faCompress
} from '@fortawesome/free-solid-svg-icons';
import { supabase } from '@/lib/supabase';

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  context?: {
    goal_id?: string;
    portfolio_data?: any;
    market_context?: any;
    user_emotion?: 'neutral' | 'anxious' | 'excited' | 'confused' | 'frustrated';
  };
  ai_metadata?: {
    confidence_score: number;
    reasoning_chain: string[];
    data_sources: string[];
    educational_content?: {
      key_concepts: string[];
      learning_opportunities: string[];
      related_articles: string[];
    };
    suggested_actions?: string[];
  };
  feedback?: {
    helpful: boolean;
    rating: number;
    user_comment?: string;
  };
}

interface EnhancedAIConversationProps {
  userId?: string;
  goalId?: string;
  userPreferences?: any;
  intelligenceData?: any;
  recommendations?: any[];
  onConversationUpdate?: (messages: ConversationMessage[]) => void;
}

export const EnhancedAIConversation: React.FC<EnhancedAIConversationProps> = ({
  userId,
  goalId,
  userPreferences,
  intelligenceData,
  recommendations = [],
  onConversationUpdate
}) => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showEducationalContent, setShowEducationalContent] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize conversation with context-aware greeting
  useEffect(() => {
    if (userId && messages.length === 0) {
      initializeConversation();
    }
  }, [userId, goalId, recommendations]);

  const initializeConversation = async () => {
    const contextualGreeting = generateContextualGreeting();
    const initialMessage: ConversationMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: contextualGreeting.message,
      timestamp: new Date().toISOString(),
      context: {
        goal_id: goalId,
        user_emotion: 'neutral'
      },
      ai_metadata: {
        confidence_score: 1.0,
        reasoning_chain: contextualGreeting.reasoning,
        data_sources: ['user_profile', 'portfolio_analysis', 'market_data'],
        educational_content: contextualGreeting.educational_content,
        suggested_actions: contextualGreeting.suggested_actions
      }
    };

    setMessages([initialMessage]);
  };

  const generateContextualGreeting = () => {
    const hasRecommendations = recommendations.length > 0;
    const userLevel = intelligenceData?.learning?.overall_financial_literacy_level || 3;
    const isNewUser = !intelligenceData?.preferences;

    if (isNewUser) {
      return {
        message: "👋 Welcome to your AI Financial Assistant! I'm here to help you understand your investments and make informed decisions. What would you like to explore today?",
        reasoning: ["User is new to platform", "Providing welcoming introduction", "Offering open-ended assistance"],
        educational_content: {
          key_concepts: ["Portfolio Management", "Risk Assessment", "Goal Planning"],
          learning_opportunities: ["Basic Investment Principles", "Understanding Risk", "Setting Financial Goals"],
          related_articles: []
        },
        suggested_actions: ["Tell me about your financial goals", "Explain my portfolio", "How does AI help with investing?"]
      };
    }

    if (hasRecommendations) {
      const urgentRecs = recommendations.filter(r => r.priority === 'urgent' || r.priority === 'high');
      if (urgentRecs.length > 0) {
        return {
          message: `🚨 I've identified ${urgentRecs.length} important recommendation${urgentRecs.length > 1 ? 's' : ''} for your portfolio. Would you like me to explain what's happening and why these actions might help?`,
          reasoning: ["High priority recommendations detected", "User needs immediate attention", "Providing proactive assistance"],
          educational_content: {
            key_concepts: ["Portfolio Rebalancing", "Risk Management", "Market Timing"],
            learning_opportunities: ["Understanding Portfolio Drift", "When to Rebalance", "Managing Investment Risk"],
            related_articles: []
          },
          suggested_actions: ["Explain my recommendations", "Why is this urgent?", "What happens if I wait?"]
        };
      }
    }

    return {
      message: `Hello! 📊 Your portfolio is looking ${hasRecommendations ? 'good with a few optimization opportunities' : 'great'}. I'm here to answer any questions about your investments, explain market movements, or help you learn more about financial planning.`,
      reasoning: ["Regular check-in with established user", "Portfolio status is stable", "Offering educational support"],
      educational_content: {
        key_concepts: ["Portfolio Optimization", "Market Analysis", "Financial Planning"],
        learning_opportunities: ["Advanced Investment Strategies", "Market Trend Analysis", "Tax Optimization"],
        related_articles: []
      },
      suggested_actions: ["Review my portfolio performance", "Explain recent market changes", "Help me learn something new"]
    };
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ConversationMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString(),
      context: {
        goal_id: goalId,
        user_emotion: detectUserEmotion(inputMessage)
      }
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Call enhanced conversation engine
      const { data, error } = await supabase.functions.invoke('enhanced-conversation-engine', {
        body: {
          userId,
          goalId,
          message: inputMessage.trim(),
          conversationHistory: messages.slice(-10), // Last 10 messages for context
          userContext: {
            preferences: userPreferences,
            intelligence_data: intelligenceData,
            current_recommendations: recommendations
          }
        }
      });

      if (error) throw error;

      // Check if the response has the expected structure
      if (!data?.success || !data?.conversation?.response) {
        throw new Error('Invalid response structure from conversation engine');
      }

      const conversationResponse = data.conversation.response;
      
      const aiResponse: ConversationMessage = {
        id: `msg_${Date.now()}_ai`,
        role: 'assistant',
        content: conversationResponse.message,
        timestamp: new Date().toISOString(),
        context: {
          goal_id: goalId,
          portfolio_data: data.conversation.context?.portfolioState,
          market_context: data.conversation.context?.marketConditions,
          user_emotion: userMessage.context?.user_emotion
        },
        ai_metadata: {
          confidence_score: conversationResponse.confidence || 0.8,
          reasoning_chain: conversationResponse.personalizedElements?.map(el => el.content) || [],
          data_sources: ['user_profile', 'portfolio_analysis', 'conversation_history'],
          educational_content: conversationResponse.educationalResources ? {
            key_concepts: conversationResponse.educationalResources.map((r: any) => r.title) || [],
            learning_opportunities: conversationResponse.educationalResources.map((r: any) => r.description) || [],
            related_articles: []
          } : undefined,
          suggested_actions: conversationResponse.followUpSuggestions || []
        }
      };

      setMessages(prev => [...prev, aiResponse]);
      onConversationUpdate?.([...messages, userMessage, aiResponse]);

    } catch (error) {
      console.error('Conversation error:', error);
      
      // Fallback response
      const fallbackResponse: ConversationMessage = {
        id: `msg_${Date.now()}_ai_fallback`,
        role: 'assistant',
        content: "I apologize, but I'm having trouble processing your request right now. Could you please try rephrasing your question, or ask me something else about your portfolio?",
        timestamp: new Date().toISOString(),
        context: { goal_id: goalId },
        ai_metadata: {
          confidence_score: 0.5,
          reasoning_chain: ["System error occurred", "Providing fallback response", "Encouraging user to retry"],
          data_sources: ['system_fallback']
        }
      };

      setMessages(prev => [...prev, fallbackResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const detectUserEmotion = (message: string): 'neutral' | 'anxious' | 'excited' | 'confused' | 'frustrated' => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('worried') || lowerMessage.includes('scared') || lowerMessage.includes('nervous')) {
      return 'anxious';
    }
    if (lowerMessage.includes('excited') || lowerMessage.includes('great') || lowerMessage.includes('awesome')) {
      return 'excited';
    }
    if (lowerMessage.includes('confused') || lowerMessage.includes("don't understand") || lowerMessage.includes('unclear')) {
      return 'confused';
    }
    if (lowerMessage.includes('frustrated') || lowerMessage.includes('annoying') || lowerMessage.includes('stupid')) {
      return 'frustrated';
    }
    
    return 'neutral';
  };

  const handleMessageFeedback = async (messageId: string, helpful: boolean, rating?: number) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, feedback: { helpful, rating: rating || (helpful ? 5 : 1) } }
        : msg
    ));

    // Send feedback to backend for AI improvement
    try {
      await supabase.functions.invoke('conversation-feedback', {
        body: {
          messageId,
          userId,
          helpful,
          rating: rating || (helpful ? 5 : 1)
        }
      });
    } catch (error) {
      console.error('Feedback error:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestedQuestions = [
    "Explain my portfolio performance",
    "What should I do about market volatility?",
    "How can I optimize my investments?",
    "Teach me about diversification",
    "Should I rebalance now?"
  ];

  return (
    <div className={`flex flex-col h-full ${isExpanded ? 'fixed inset-4 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <FontAwesomeIcon icon={faRobot} className="text-white text-lg" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">AI Assistant</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Context-aware • Educational focus
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowEducationalContent(!showEducationalContent)}
            className={`p-2 rounded-lg transition-colors ${
              showEducationalContent 
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' 
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title="Toggle educational content"
          >
            <FontAwesomeIcon icon={faGraduationCap} />
          </button>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title={isExpanded ? "Minimize" : "Expand"}
          >
            <FontAwesomeIcon icon={isExpanded ? faCompress : faExpand} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: isExpanded ? 'calc(100vh - 200px)' : '400px' }}>
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                {/* Message Bubble */}
                <div className={`rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white ml-4'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white mr-4'
                }`}>
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  
                  {/* Timestamp */}
                  <div className={`flex items-center justify-between mt-2 text-xs ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                    
                    {/* AI Confidence Score */}
                    {message.role === 'assistant' && message.ai_metadata?.confidence_score && (
                      <span className="flex items-center space-x-1">
                        <FontAwesomeIcon icon={faShieldAlt} />
                        <span>{Math.round(message.ai_metadata.confidence_score * 100)}%</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Educational Content */}
                {message.role === 'assistant' && showEducationalContent && message.ai_metadata?.educational_content && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 mr-4"
                  >
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm">
                      <div className="flex items-center space-x-2 mb-2">
                        <FontAwesomeIcon icon={faGraduationCap} className="text-blue-600" />
                        <span className="font-medium text-blue-900 dark:text-blue-100">Learn More</span>
                      </div>
                      
                      {message.ai_metadata.educational_content.key_concepts.length > 0 && (
                        <div className="mb-2">
                          <span className="text-xs font-medium text-blue-800 dark:text-blue-200">Key Concepts:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {message.ai_metadata.educational_content.key_concepts.map((concept, idx) => (
                              <span key={idx} className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 px-2 py-1 rounded-full">
                                {concept}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Suggested Actions */}
                {message.role === 'assistant' && message.ai_metadata?.suggested_actions && (
                  <div className="mt-2 mr-4">
                    <div className="flex flex-wrap gap-2">
                      {message.ai_metadata.suggested_actions.slice(0, 3).map((action, idx) => (
                        <button
                          key={idx}
                          onClick={() => setInputMessage(action)}
                          className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full transition-colors"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feedback Buttons */}
                {message.role === 'assistant' && !message.feedback && (
                  <div className="flex items-center space-x-2 mt-2 mr-4">
                    <button
                      onClick={() => handleMessageFeedback(message.id, true)}
                      className="text-gray-400 hover:text-green-600 transition-colors"
                      title="Helpful"
                    >
                      <FontAwesomeIcon icon={faThumbsUp} className="text-sm" />
                    </button>
                    <button
                      onClick={() => handleMessageFeedback(message.id, false)}
                      className="text-gray-400 hover:text-red-600 transition-colors"
                      title="Not helpful"
                    >
                      <FontAwesomeIcon icon={faThumbsDown} className="text-sm" />
                    </button>
                  </div>
                )}
              </div>

              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === 'user' 
                  ? 'bg-blue-600 text-white order-1' 
                  : 'bg-gradient-to-br from-purple-500 to-blue-600 text-white order-2'
              }`}>
                <FontAwesomeIcon 
                  icon={message.role === 'user' ? faUser : faRobot} 
                  className="text-sm" 
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading Indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3 mr-4">
              <div className="flex items-center space-x-2">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-gray-500" />
                <span className="text-sm text-gray-500 dark:text-gray-400">AI is thinking...</span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions (when no messages) */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Suggested questions:</div>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, idx) => (
              <button
                key={idx}
                onClick={() => setInputMessage(question)}
                className="text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-full transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your portfolio..."
              className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={isLoading}
            />
            
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FontAwesomeIcon icon={faPaperPlane} className="text-sm" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedAIConversation;
