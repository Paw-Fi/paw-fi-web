"use client";

import { Fragment } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLightbulb } from "@fortawesome/free-solid-svg-icons";

interface HelpTipsProps {
  questionType: string;
  helpTips?: string;
  hint?: string;
  categories?: Array<{ id: string; name: string }>;
  helpTipsData?: Array<{ col1: string; col2: string }>;
}

export function HelpTips({ 
  questionType, 
  helpTips, 
  hint, 
  categories, 
  helpTipsData 
}: HelpTipsProps) {
  if (!helpTips && !hint) return null;

  return (
    <div className="relative rounded-3xl bg-green-50 p-6 shadow-md">
      {/* Triangle pointing from help tips toward main content */}
      <div
        className="hidden lg:block lg:absolute top-10 left-[-8px] h-4 w-4 rotate-45 transform bg-green-50"
        style={{ boxShadow: "-2px 2px 2px rgba(0, 0, 0, 0.1)" }}
      ></div>
      <div className="mb-4 flex items-center">
        <div className="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-success">
          <FontAwesomeIcon icon={faLightbulb} className="text-white" />
        </div>
        <h3 className="font-medium text-green-800">Help Tips:</h3>
      </div>

      {questionType === "sort-categories" && (
        <div>
          {/* For category comparison help tips */}
          {categories?.length === 2 && (
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div className="text-center font-medium text-green-800">
                {categories[0].name}
              </div>
              <div className="text-center font-medium text-green-800">
                {categories[1].name}
              </div>

              {helpTipsData?.map(
                (
                  tip: { col1: string; col2: string },
                  index: number,
                ) => (
                  <Fragment key={index}>
                    <div className="border-t border-green-200 pt-2 text-sm text-green-700">
                      {tip.col1}
                    </div>
                    <div className="border-t border-green-200 pt-2 text-sm text-green-700">
                      {tip.col2}
                    </div>
                  </Fragment>
                ),
              )}
            </div>
          )}

          {/* Fallback for when we don't have structured tips data */}
          {(!helpTipsData ||
            categories?.length !== 2) && (
            <p className="text-sm text-green-700">
              {helpTips}
            </p>
          )}
        </div>
      )}

      {questionType !== "sort-categories" && (
        <p className="text-sm whitespace-pre-line text-green-700">
          {helpTips}
          {hint}
        </p>
      )}
    </div>
  );
}
