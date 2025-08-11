"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Modal } from "@/components/ui/modal";
import { ListSection } from "@/utils/chat-list-parser";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faListOl, 
  faListUl, 
  faCheckCircle, 
  faBullseye,
  faLightbulb,
  faGift,
  faClipboard,
  faChevronDown,
  faChevronRight
} from "@fortawesome/free-solid-svg-icons";
import { motion, Variants } from "framer-motion";

interface ListModalProps {
  isOpen: boolean;
  onClose: () => void;
  listSection: ListSection | null;
}

export const ListModal: React.FC<ListModalProps> = ({
  isOpen,
  onClose,
  listSection
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  if (!listSection) return null;

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const getListIcon = () => {
    if (listSection.type === 'section') {
      return faClipboard;
    } else if (listSection.type === 'numbered') {
      return faListOl;
    }
    
    // For bullet lists, choose icon based on content
    const firstItemContent = listSection.items[0]?.content.toLowerCase() || '';
    if (firstItemContent.includes('benefit') || firstItemContent.includes('advantage')) {
      return faGift;
    } else if (firstItemContent.includes('tip') || firstItemContent.includes('advice')) {
      return faLightbulb;
    } else if (firstItemContent.includes('action') || firstItemContent.includes('step')) {
      return faCheckCircle;
    } else {
      return faListUl;
    }
  };

  const getCardIcon = (index: number) => {
    if (listSection.type === 'numbered') {
      return (
        <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-full text-sm font-bold">
          {index + 1}
        </div>
      );
    } else {
      return (
        <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-full">
          <FontAwesomeIcon icon={faBullseye} className="w-3 h-3" />
        </div>
      );
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const cardVariants: Variants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 25
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      width="wide"
      title=""
      contentClassName="dark:bg-slate-900/95 backdrop-blur-xl"
    >
      {/* Enhanced Header with Gradient Background */}
      <div className="relative -mx-6 -mt-6 mb-8 px-6 pt-6 pb-8 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-900/30 dark:via-indigo-900/30 dark:to-blue-900/30 border-b border-purple-200/50 dark:border-purple-700/50">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-2xl shadow-lg">
            <FontAwesomeIcon icon={getListIcon()} className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              {listSection.title}
            </h2>
            <div className="flex items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/60 dark:bg-slate-800/60 rounded-full text-slate-600 dark:text-slate-300 backdrop-blur-sm">
                <FontAwesomeIcon icon={faListOl} className="w-3 h-3" />
                {listSection.items.length} {listSection.type === 'numbered' ? 'steps' : 'points'}
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100/60 dark:bg-emerald-900/30 rounded-full text-emerald-700 dark:text-emerald-300 backdrop-blur-sm">
                <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3" />
                Actionable guidance
              </span>
            </div>
          </div>
        </div>
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-indigo-500/5 pointer-events-none rounded-t-xl" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {listSection.type === 'section' ? (
          // Enhanced section content with better typography and spacing
          <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
            <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:text-slate-800 dark:prose-headings:text-slate-100 prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-strong:text-slate-900 dark:prose-strong:text-slate-100 prose-li:text-slate-700 dark:prose-li:text-slate-300 prose-li:leading-relaxed prose-ul:space-y-3 prose-ol:space-y-3">
              <ReactMarkdown
                components={{
                  a: ({ href, children }) => {
                    if (href?.startsWith('#')) {
                      const sectionId = href.substring(1);
                      const isExpanded = expandedSections.has(sectionId);
                      
                      return (
                        <button
                          onClick={() => toggleSection(sectionId)}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg font-medium transition-all duration-200 border border-purple-200 dark:border-purple-700"
                        >
                          <FontAwesomeIcon 
                            icon={isExpanded ? faChevronDown : faChevronRight} 
                            className="w-3 h-3" 
                          />
                          {children}
                        </button>
                      );
                    }
                    return <a href={href} className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300">{children}</a>;
                  },
                  // Enhanced list item rendering
                  li: ({ children }) => {
                    const content = children?.toString() || '';
                    if (content.includes('View') && content.includes('important points')) {
                      const sectionId = `list-item-${Math.random()}`;
                      const isExpanded = expandedSections.has(sectionId);
                      
                      return (
                        <li className="mb-4">
                          <button
                            onClick={() => toggleSection(sectionId)}
                            className="flex items-center gap-3 p-3 w-full text-left bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 hover:from-purple-100 dark:hover:from-purple-900/30 hover:to-indigo-100 dark:hover:to-indigo-900/30 rounded-xl border border-purple-200/50 dark:border-purple-700/50 transition-all duration-200"
                          >
                            <FontAwesomeIcon 
                              icon={isExpanded ? faChevronDown : faChevronRight} 
                              className="w-4 h-4 text-purple-600 dark:text-purple-400" 
                            />
                            <span className="font-medium text-purple-700 dark:text-purple-300">{children}</span>
                          </button>
                          {isExpanded && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 ml-6 p-4 bg-white/80 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-600 backdrop-blur-sm"
                            >
                              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                💡 This section would contain detailed explanations, examples, and actionable insights related to the main point.
                              </p>
                            </motion.div>
                          )}
                        </li>
                      );
                    }
                    return (
                      <li className="flex items-start gap-3 py-2">
                        <div className="flex items-center justify-center w-2 h-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full mt-3 flex-shrink-0" />
                        <span className="flex-1">{children}</span>
                      </li>
                    );
                  },
                  // Enhanced paragraph styling
                  p: ({ children }) => (
                    <p className="mb-4 text-slate-700 dark:text-slate-300 leading-relaxed">{children}</p>
                  ),
                  // Enhanced strong text
                  strong: ({ children }) => (
                    <strong className="font-semibold text-slate-900 dark:text-slate-100 bg-yellow-100/50 dark:bg-yellow-900/20 px-1 py-0.5 rounded">{children}</strong>
                  )
                }}
              >
                {listSection.originalText}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          // Enhanced card-based list items
          <div className="grid gap-4">
            {listSection.items.map((item, index) => (
              <motion.div
                key={index}
                variants={cardVariants}
                className="group relative overflow-hidden"
              >
                <div className="flex gap-4 p-6 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 hover:border-purple-300/50 dark:hover:border-purple-500/50 hover:-translate-y-1">
                  <div className="flex-shrink-0">
                    {getCardIcon(index)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-800 dark:text-slate-100 leading-relaxed text-base">
                      {item.content}
                    </div>
                    
                    {/* Enhanced step indicator */}
                    {listSection.type === 'numbered' && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        <span className="font-medium">Step {index + 1} of {listSection.items.length}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Enhanced hover effect with gradient */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/5 via-indigo-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none" />
                  
                  {/* Subtle border glow on hover */}
                  <div className="absolute inset-0 rounded-2xl border border-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
        
        {/* Enhanced Summary Footer */}
        <div className="mt-8 p-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20 rounded-2xl border border-emerald-200/50 dark:border-emerald-700/50 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl shadow-md">
              <FontAwesomeIcon icon={faLightbulb} className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">
                {listSection.type === 'numbered' ? '💡 Pro Tip' : '🎯 Key Insight'}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {listSection.type === 'numbered' 
                  ? 'Follow these steps in sequential order for optimal results. Each step builds upon the previous one to ensure comprehensive implementation.'
                  : 'These carefully curated points provide comprehensive coverage of the topic. Review each one to gain a complete understanding.'
                }
              </p>
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3 text-emerald-500" />
                  {listSection.items.length} items covered
                </span>
                <span className="flex items-center gap-1">
                  <FontAwesomeIcon icon={faBullseye} className="w-3 h-3 text-purple-500" />
                  Actionable guidance
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </Modal>
  );
};
