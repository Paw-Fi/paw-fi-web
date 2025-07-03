import React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { FinancialHealthQuiz } from '@/components/financial-health/FinancialHealthQuiz';
import { Widget } from '@/components/profile/types/dashboard-data.typings';

export const Route = createFileRoute('/financial-health/')({
  component: FinancialHealthPage
});

function FinancialHealthPage() {
  const handleQuizComplete = (widgets: Widget[]) => {
    console.log('Quiz completed with widgets:', widgets);
    // The redirection is handled inside the quiz component
  };

  return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6 text-center">Financial Health Assessment</h1>
        <p className="text-lg mb-8 text-center text-gray-600">
          Answer a few questions to assess your financial health and get personalized recommendations.
        </p>
        
        <FinancialHealthQuiz />
      </div>
  );
}

export default FinancialHealthPage;
