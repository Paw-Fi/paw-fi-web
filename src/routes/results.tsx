'use client';

import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import classnames from 'classnames';
import { Button } from '@/components/ui/button';
import { useQuestionnaire } from '@/contexts/questionnaire-context';

export const Route = createFileRoute('/results')({
  component: Results,
});

function Results() {
  const { state } = useQuestionnaire();
  const navigate = useNavigate();
  
  // Removed the auto-redirect that was causing the navigation loop
  // Instead, just log the state for debugging purposes
  useEffect(() => {
    console.log('Results page state:', state);
  }, [state]);
  
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Back button */}
      <button 
        onClick={() => navigate({ to: '/questionnaire' })}
        className={classnames(
          'absolute top-4 left-4 flex items-center font-medium cursor-pointer text-gray-600'
        )}
      >
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 16 16" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="mr-1"
        >
          <path 
            d="M10 4L6 8L10 12" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
        Back
      </button>
      
      <div className="flex-1 flex justify-center items-center p-4">
        <div className="bg-white rounded-3xl shadow-lg max-w-2xl w-full p-8">
          <p className="text-test text-center mb-8">
            Based on our preferences, I've created a personalized financial journey for you.
          </p>

          {/* Grid layout for feature cards */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            {/* Goal-Based Saving card */}
            <div className="bg-purple-100 rounded-xl p-6">
              <div className="bg-white rounded-full w-12 h-12 flex items-center justify-center mb-3">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="purple">
                  <path d="M15.5 12a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z"/>
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z"/>
                  <path d="M12 4a8 8 0 0 0-8 8h2a6 6 0 1 1 6 6v2a8 8 0 0 0 0-16z"/>
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Goal-Based Saving</h3>
              <p className="text-sm text-gray-600">Create savings goals and track your progress with playful milestones.</p>
            </div>

            {/* Smart Suggestions card */}
            <div className="bg-green-100 rounded-xl p-6">
              <div className="bg-white rounded-full w-12 h-12 flex items-center justify-center mb-3">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="green">
                  <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6A4.997 4.997 0 0 1 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/>
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Smart Suggestions</h3>
              <p className="text-sm text-gray-600">Get personalized tips to improve your financial habits, tailored to your needs.</p>
            </div>

            {/* Learn Your Way card */}
            <div className="bg-blue-100 rounded-xl p-6">
              <div className="bg-white rounded-full w-12 h-12 flex items-center justify-center mb-3">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="blue">
                  <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/>
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Learn Your Way</h3>
              <p className="text-sm text-gray-600">Access bite-sized financial lessons that make money management fun.</p>
            </div>

            {/* Motivational Progress card */}
            <div className="bg-yellow-100 rounded-xl p-6">
              <div className="bg-white rounded-full w-12 h-12 flex items-center justify-center mb-3">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="orange">
                  <path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/>
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Motivational Progress</h3>
              <p className="text-sm text-gray-600">Watch your progress with encouraging visual trackers and celebrations.</p>
            </div>
          </div>

          {/* Action button */}
          <div className="flex justify-center">
            <Link to="/learning">
            <Button variant="primary" size="md">
              Try the Demo Course
            </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
