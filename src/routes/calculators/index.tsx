import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { 
  faChartLine, 
  faHome, 
  faMoneyBillWave,
  faPercent,
  faPiggyBank,
  faCreditCard,
  faArrowRight
} from '@fortawesome/free-solid-svg-icons';
import { seo } from '@/utils/seo';

export const Route = createFileRoute('/calculators/')({
  component: CalculatorsPage,
  head: () => {
    const meta = seo({
      title: 'Financial Calculators | PawFi',
      description: 'Explore our suite of financial calculators to help you make informed decisions about your money, investments, loans, and more.',
      keywords: 'financial calculators, investment, mortgage, savings, auto loan, retirement, compound interest, loan amortization',
      image: 'https://paw-fi.app/og-img.png',
    });
    return {
      meta  
    };
  },
});



interface CalculatorCard {
  title: string;
  description: string;
  icon: IconDefinition;
  path: string;
  available: boolean;
}

function CalculatorsPage() {
  const calculators: CalculatorCard[] = [
    {
      title: 'Compound Interest',
      description: 'Calculate how your investments grow over time with compound interest.',
      icon: faChartLine,
      path: '/calculators/compound-calculator',
      available: true
    },
    {
      title: 'Mortgage',
      description: 'Estimate your monthly mortgage payments and view amortization schedules.',
      icon: faHome,
      path: '/calculators/mortgage-calculator',
      available: true
    },
    {
      title: 'Savings Goal',
      description: 'Plan how to reach your savings goals with regular contributions.',
      icon: faPiggyBank,
      path: '/calculators/saving-goals-calculator',
      available: true
    },
    {
      title: 'Investment',
      description: 'Explore how your investments can grow and compare different scenarios.',
      icon: faPercent,
      path: '/calculators/investment-calculator',
      available: true
    },
    {
      title: 'Auto Loan',
      description: 'Calculate payments and costs for your auto loan including taxes and fees.',
      icon: faMoneyBillWave,
      path: '/calculators/auto-loan-calculator',
      available: true
    },
    {
      title: 'Retirement',
      description: 'Estimate your retirement needs, savings, and withdrawal strategies.',
      icon: faCreditCard,
      path: '/calculators/retirement-calculator',
      available: true
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-4">Financial Calculators</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Explore our suite of financial calculators to help you make informed decisions about 
          your money, investments, loans, and more.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {calculators.map((calculator, index) => (
          <div
            key={index}
            className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 flex flex-col ${calculator.available
              ? 'hover:shadow-2xl hover:-translate-y-1.5 border border-purple-200 hover:border-purple-300'
              : 'opacity-50 cursor-not-allowed bg-gray-50'}`}
          >
            {calculator.available ? (
              <Link to={calculator.path} className="h-full flex flex-col" aria-label={`Try the ${calculator.title} calculator`}>
                <div className="p-6 flex-grow flex flex-col">
                  <div className="flex items-center mb-2">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mr-3">
                      <FontAwesomeIcon icon={calculator.icon} size="lg" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800">{calculator.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 flex-grow leading-relaxed">{calculator.description}</p>
                  <div className="mt-auto pt-4">
                    <span className="inline-flex items-center text-sm font-semibold text-purple-600 hover:text-purple-800 transition-colors duration-200">
                      Try Calculator
                      <FontAwesomeIcon icon={faArrowRight} className="ml-1.5 w-4 h-4" />
                    </span>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="p-4 h-full flex flex-col">
                <div className="flex items-center mb-2">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mr-2">
                    <FontAwesomeIcon icon={calculator.icon} size="lg" />
                  </div>
                  <h3 className="text-lg font-semibold">{calculator.title}</h3>
                </div>
                <p className="text-gray-500 flex-grow text-sm">{calculator.description}</p>
                <div className="mt-2 text-gray-500 font-medium text-sm">
                  Coming Soon
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
