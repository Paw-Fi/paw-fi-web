"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faArrowRight,
  faTimes,
  faBookOpen,
  faLightbulb,
  faClose,
} from "@fortawesome/free-solid-svg-icons";
import { MessageSection, formatSectionContent } from "@/utils/message-parser";
import { Markdown } from "@/components/ui/markdown";
import { createMinimalMarkdownComponents } from "@/components/ui/markdown-components";

interface DetailedContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: MessageSection[];
  title?: string;
}

export function DetailedContentModal({
  isOpen,
  onClose,
  sections,
  title = "Detailed Information",
}: DetailedContentModalProps) {
  const [currentPage, setCurrentPage] = useState(0);

  const handleNext = () => {
    if (currentPage < sections.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleClose = () => {
    setCurrentPage(0);
    onClose();
  };

  if (!sections.length) return null;

  const currentSection = sections[currentPage];
  if(!isOpen)
    return null

  const renderSectionContent = (section: MessageSection) => {
    if (section.subsections && section.subsections.length > 0) {
      // Rendering with subsections
    } else {
      // No subsections, rendering main content only
    }

    // If section has subsections, render them as attractive cards
    if (section.subsections && section.subsections.length > 0) {
      return (
        <div className="space-y-6">
          {/* Section introduction */}
          {section.content && (
            <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 dark:border-blue-800/30 dark:from-blue-900/10 dark:to-indigo-900/10">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <FontAwesomeIcon
                    icon={faBookOpen}
                    className="mt-1 h-5 w-5 text-blue-600 dark:text-blue-400"
                  />
                </div>
                <div className="flex-1">
                  <Markdown
                    content={formatSectionContent(section.content)}
                    components={createMinimalMarkdownComponents()}
                    className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Render subsections as premium cards */}
          <div className="space-y-4">
            {section.subsections.map((subsection, index) => (
              <div
                key={index}
                className="group rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-sm font-bold text-white shadow-lg">
                      {index + 1}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {subsection.title}
                      <FontAwesomeIcon
                        icon={faLightbulb}
                        className="h-4 w-4 text-amber-500 opacity-60"
                      />
                    </h4>
                    <div className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300">
                      {subsection.content ? (
                        <Markdown
                          content={formatSectionContent(subsection.content)}
                          components={createMinimalMarkdownComponents()}
                          className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300 [&_ul]:my-4 [&_ul]:space-y-2 [&_li]:flex [&_li]:items-start [&_li]:gap-2"
                        />
                      ) : (
                        <div className="font-mono text-sm text-red-500">
                          DEBUG: No content found for subsection "
                          {subsection.title}"
                          <br />
                          Raw content: "{subsection.content}"
                          <br />
                          Content type: {typeof subsection.content}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Regular section content with better styling
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <Markdown
          content={formatSectionContent(section.content)}
          components={createMinimalMarkdownComponents()}
          className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300 [&_p]:mb-4 [&_p]:leading-relaxed [&_p:last-child]:mb-0 [&_ul]:my-4 [&_ul]:space-y-2 [&_li]:flex [&_li]:items-start [&_li]:gap-2 [&_h3]:mb-4 [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3:first-child]:mt-0 dark:[&_h3]:text-slate-100 [&_h4]:mb-3 [&_h4]:mt-5 [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-slate-800 [&_h4:first-child]:mt-0 dark:[&_h4]:text-slate-200"
        />
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      width="wide"
      contentClassName="bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800"
      footer={() => (
        <div className="grid w-full grid-cols-3 rounded-lg bg-white p-3 dark:bg-slate-800">
          <div className="" />

          {sections.length > 1 && (
            <div className="flex items-center justify-center gap-2">
              {sections.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index)}
                  className={`h-3 w-3 rounded-full transition-all duration-200 ${
                    index === currentPage
                      ? "scale-110 bg-gradient-to-br from-purple-500 to-indigo-600 shadow-md"
                      : "bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500"
                  }`}
                  aria-label={`Go to page ${index + 1}`}
                />
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              onClick={handlePrev}
              disabled={currentPage === 0}
              variant="outline"
              size="sm"
              className={` ${
                currentPage === 0 ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-1 h-3 w-3" />
              Previous
            </Button>
            {currentPage === sections.length - 1 ? (
              <Button onClick={handleClose} size="sm" className="bg-gradient-to-br from-green-500 to-green-600">
                Finish Reading
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={currentPage === sections.length - 1}
                variant="outline"
                size="sm"
                className={` ${
                  currentPage === sections.length - 1
                    ? "cursor-not-allowed opacity-50"
                    : ""
                }`}
              >
                Next
                <FontAwesomeIcon icon={faArrowRight} className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}
    >
      <div className="py-4">
        {/* Section header with page info */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {currentSection?.title}
            </h2>
            {sections.length > 1 && (
              <div className="rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 px-3 py-1 dark:from-purple-900/30 dark:to-indigo-900/30">
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  {currentPage + 1} of {sections.length}
                </span>
              </div>
            )}
          </div>
          <div className="h-px w-full bg-gradient-to-r from-purple-200 to-indigo-200 dark:from-purple-800 dark:to-indigo-800"></div>
        </div>

        {/* Section content */}
        {renderSectionContent(currentSection)}
      </div>
    </Modal>
  );
}
