import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faLightbulb, 
  faArrowRight, 
  faExternalLinkAlt,
  faCheckCircle,
  faInfoCircle,
  faGraduationCap,
  faDollarSign,
  faChartLine,
  faShield,
  faCalculator,
  faBookOpen,
  faHandsHelping
} from '@fortawesome/free-solid-svg-icons';

interface ImplementationGuideProps {
  holdings: Array<{
    symbol: string;
    name: string;
    allocation: number;
    category: string;
    reasoning: string;
    expenseRatio?: number;
  }>;
  className?: string;
}

export function ImplementationGuide({ holdings, className }: ImplementationGuideProps) {
  const [activeStep, setActiveStep] = useState(1);

  const steps = [
    {
      id: 1,
      title: "Understand Your Recommendations",
      icon: faGraduationCap,
      description: "Learn why these ETFs were selected for your goals",
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">What You're Looking At:</h4>
            <p className="text-blue-800 text-sm leading-relaxed">
              Your AI-generated portfolio consists of Exchange-Traded Funds (ETFs) - professionally managed 
              investment funds that trade like stocks. Each ETF gives you diversified exposure to hundreds 
              or thousands of underlying investments.
            </p>
          </div>
          
          <div className="space-y-3">
            {holdings.map((holding, index) => (
              <div key={index} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h5 className="font-semibold text-gray-900">{holding.symbol}</h5>
                    <p className="text-sm text-gray-600">{holding.name}</p>
                    <Badge variant="outline" className="text-xs mt-1">{holding.category}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-600">{holding.allocation.toFixed(1)}%</p>
                    {holding.expenseRatio && (
                      <p className="text-xs text-gray-500">Fee: {holding.expenseRatio.toFixed(2)}%</p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{holding.reasoning}</p>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "Choose Your Investment Account",
      icon: faShield,
      description: "Understand different account types and their benefits",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border-2 border-green-200 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                <FontAwesomeIcon icon={faShield} className="w-4 h-4" />
                Tax-Advantaged Accounts (Recommended)
              </h4>
              <ul className="space-y-2 text-sm text-green-800">
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span><strong>401(k)/403(b):</strong> Employer-sponsored, often with matching</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span><strong>Traditional IRA:</strong> Tax deduction now, taxed in retirement</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span><strong>Roth IRA:</strong> After-tax contributions, tax-free growth</span>
                </li>
              </ul>
            </div>
            
            <div className="p-4 border-2 border-blue-200 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <FontAwesomeIcon icon={faDollarSign} className="w-4 h-4" />
                Taxable Brokerage Account
              </h4>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>No contribution limits</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Access funds anytime</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1 h-1 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Taxed on gains and dividends</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex items-center gap-2 mb-2">
              <FontAwesomeIcon icon={faInfoCircle} className="w-4 h-4 text-yellow-600" />
              <span className="font-semibold text-yellow-800">Pro Tip</span>
            </div>
            <p className="text-yellow-800 text-sm">
              Start with tax-advantaged accounts first to maximize your tax benefits. Many employers offer 401(k) matching - that's free money!
            </p>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Select a Brokerage Platform",
      icon: faHandsHelping,
      description: "Popular platforms to implement your portfolio",
      content: (
        <div className="space-y-4">
          <p className="text-gray-700 text-sm mb-4">
            Choose a reputable brokerage to buy your recommended ETFs. Most major brokerages offer commission-free ETF trading.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <h4 className="font-semibold text-gray-900 mb-2">Popular Brokerages</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3 text-green-500" />
                  <span>Fidelity - No account minimums</span>
                </li>
                <li className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3 text-green-500" />
                  <span>Charles Schwab - Excellent research</span>
                </li>
                <li className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3 text-green-500" />
                  <span>Vanguard - Low-cost leader</span>
                </li>
                <li className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3 text-green-500" />
                  <span>E*TRADE - User-friendly platform</span>
                </li>
              </ul>
            </div>
            
            <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <h4 className="font-semibold text-gray-900 mb-2">What to Look For</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3 text-blue-500" />
                  <span>Commission-free ETF trades</span>
                </li>
                <li className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3 text-blue-500" />
                  <span>Low or no account fees</span>
                </li>
                <li className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3 text-blue-500" />
                  <span>Good mobile app</span>
                </li>
                <li className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3 text-blue-500" />
                  <span>Educational resources</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-blue-800 text-sm">
              <strong>Note:</strong> Paw-Fi is not affiliated with any brokerage. We recommend comparing fees, features, and user experience to find the best fit for your needs.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: "Implement Your Portfolio",
      icon: faChartLine,
      description: "Step-by-step implementation process",
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <div>
                <h5 className="font-semibold text-gray-900">Open Your Account</h5>
                <p className="text-sm text-gray-600">Create account and complete identity verification</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <div>
                <h5 className="font-semibold text-gray-900">Fund Your Account</h5>
                <p className="text-sm text-gray-600">Transfer money via bank transfer, check, or rollover</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <div>
                <h5 className="font-semibold text-gray-900">Buy Your ETFs</h5>
                <p className="text-sm text-gray-600">Purchase each ETF according to your recommended allocation</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
              <div>
                <h5 className="font-semibold text-gray-900">Set Up Automatic Investing</h5>
                <p className="text-sm text-gray-600">Automate monthly contributions to stay on track</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 border-l-4 border-green-400 p-4">
            <div className="flex items-center gap-2 mb-2">
              <FontAwesomeIcon icon={faCalculator} className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-green-800">Portfolio Calculator</span>
            </div>
            <p className="text-green-800 text-sm mb-2">
              If you have $1,000 to invest based on your recommended allocation:
            </p>
            <div className="text-xs text-green-700 space-y-1">
              {holdings.map((holding, index) => (
                <div key={index} className="flex justify-between">
                  <span>{holding.symbol}:</span>
                  <span>${((holding.allocation / 100) * 1000).toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentStep = steps.find(step => step.id === activeStep);

  return (
    <Card className={`border-purple-200 ${className}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <FontAwesomeIcon icon={faLightbulb} className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <CardTitle className="text-xl">Implementation Guide</CardTitle>
            <CardDescription>
              Learn how to actually implement your AI-generated portfolio recommendations
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Step Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeStep === step.id
                  ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-gray-200'
              }`}
            >
              <FontAwesomeIcon icon={step.icon} className="w-4 h-4" />
              <span className="hidden sm:inline">{step.title}</span>
              <span className="sm:hidden">Step {step.id}</span>
            </button>
          ))}
        </div>

        {/* Current Step Content */}
        {currentStep && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <FontAwesomeIcon icon={currentStep.icon} className="w-5 h-5 text-purple-600" />
                {currentStep.title}
              </h3>
              <p className="text-gray-600 text-sm mb-4">{currentStep.description}</p>
            </div>
            
            {currentStep.content}
            
            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => setActiveStep(Math.max(1, activeStep - 1))}
                disabled={activeStep === 1}
              >
                Previous
              </Button>
              
              {activeStep < steps.length ? (
                <Button 
                  onClick={() => setActiveStep(Math.min(steps.length, activeStep + 1))}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Next Step
                  <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => window.open('https://www.investor.gov/introduction-investing', '_blank')}
                >
                  <FontAwesomeIcon icon={faBookOpen} className="w-4 h-4 mr-2" />
                  Learn More
                  <FontAwesomeIcon icon={faExternalLinkAlt} className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}