import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faGraduationCap, 
  faLightbulb, 
  faChartLine,
  faArrowRight,
  faCheckCircle,
  faBookOpen,
  faCalculator,
  faBrain,
  faShield,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

interface ValuePropositionCardProps {
  userTier: 'free' | 'premium' | 'plus';
  className?: string;
}

export function ValuePropositionCard({ userTier, className }: ValuePropositionCardProps) {
  const content = {
    free: {
      title: "Learn Portfolio Management with AI",
      subtitle: "Educational investment analysis to build your financial knowledge",
      benefits: [
        {
          icon: faGraduationCap,
          title: "Learn Investment Basics",
          description: "Understand how professional portfolios are constructed using modern portfolio theory"
        },
        {
          icon: faCalculator,
          title: "See Sample Portfolio",
          description: "View 3 ETF recommendations with detailed explanations of why they were selected"
        },
        {
          icon: faLightbulb,
          title: "AI Educational Insights",
          description: "Monthly educational content about your portfolio's risk and return characteristics"
        }
      ],
      limitations: [
        "Limited to 1 educational goal scenario",
        "Portfolio preview shows 3 sample ETFs only",
        "Basic educational explanations"
      ],
      callToAction: "Perfect for beginners who want to learn investing fundamentals"
    },
    premium: {
      title: "Advanced Portfolio Education",
      subtitle: "Comprehensive investment learning with detailed AI analysis",
      benefits: [
        {
          icon: faChartLine,
          title: "Complete Portfolio Transparency", 
          description: "See full portfolio breakdown with all recommended ETFs and detailed reasoning"
        },
        {
          icon: faBrain,
          title: "Weekly AI Analysis",
          description: "Regular educational insights about market conditions and portfolio optimization"
        },
        {
          icon: faShield,
          title: "Advanced Risk Analysis",
          description: "Learn about scenario analysis, rebalancing strategies, and risk management"
        }
      ],
      limitations: [
        "Educational analysis only - not personalized financial advice",
        "Requires self-directed implementation at your chosen brokerage",
        "General market analysis, not specific to your complete financial picture"
      ],
      callToAction: "Ideal for motivated learners who want comprehensive investment education"
    },
    plus: {
      title: "Professional-Level Education",
      subtitle: "Advanced investment education with interactive AI coaching",
      benefits: [
        {
          icon: faBrain,
          title: "AI Conversation Mode",
          description: "Interactive Q&A sessions to deepen your understanding of investment concepts"
        },
        {
          icon: faBookOpen,
          title: "Advanced Education",
          description: "Learn sophisticated concepts like tax optimization, life event planning, and advanced strategies"
        },
        {
          icon: faCalculator,
          title: "Comprehensive Analysis",
          description: "Educational analysis covering multiple goals, family planning, and complex scenarios"
        }
      ],
      limitations: [
        "Educational platform - not a substitute for professional financial planning",
        "AI conversations are educational, not personalized financial advice",
        "Users responsible for implementation and compliance with regulations"
      ],
      callToAction: "For serious investors who want graduate-level financial education"
    }
  };

  const tierContent = content[userTier];

  return (
    <Card className={`border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 ${className}`}>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FontAwesomeIcon icon={faGraduationCap} className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-xl text-blue-900">{tierContent.title}</CardTitle>
            <CardDescription className="text-blue-700">{tierContent.subtitle}</CardDescription>
          </div>
        </div>
        
        <div className="bg-blue-100 border-l-4 border-blue-500 p-3 rounded">
          <div className="flex items-center gap-2 mb-1">
            <FontAwesomeIcon icon={faBookOpen} className="w-4 h-4 text-blue-700" />
            <span className="font-semibold text-blue-900 text-sm">What You Get</span>
          </div>
          <p className="text-blue-800 text-sm">{tierContent.callToAction}</p>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Benefits */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 text-green-600" />
            Educational Benefits
          </h4>
          <div className="space-y-3">
            {tierContent.benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-100">
                <FontAwesomeIcon icon={benefit.icon} className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h5 className="font-medium text-gray-900 text-sm">{benefit.title}</h5>
                  <p className="text-gray-700 text-xs leading-relaxed">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Important Limitations */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4 text-yellow-600" />
            <span className="font-semibold text-yellow-800 text-sm">Important to Know</span>
          </div>
          <ul className="space-y-1">
            {tierContent.limitations.map((limitation, index) => (
              <li key={index} className="text-yellow-800 text-xs flex items-start gap-2">
                <span className="w-1 h-1 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></span>
                <span>{limitation}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* How It Works */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">How It Works</h4>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span>Create educational goal scenarios to explore</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span>Receive AI-generated educational portfolio analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <span>Learn investment concepts through detailed explanations</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <span>Use implementation guide to apply learnings independently</span>
            </div>
          </div>
        </div>

        {/* Educational Resources */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FontAwesomeIcon icon={faBookOpen} className="w-4 h-4 text-green-600" />
            <span className="font-semibold text-green-800 text-sm">Learning Resources Included</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-green-800">
            <div className="flex items-center gap-1">
              <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3" />
              <span>Portfolio theory basics</span>
            </div>
            <div className="flex items-center gap-1">
              <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3" />
              <span>Risk management concepts</span>
            </div>
            <div className="flex items-center gap-1">
              <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3" />
              <span>Asset allocation principles</span>
            </div>
            <div className="flex items-center gap-1">
              <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3" />
              <span>Implementation guidance</span>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button className="flex-1 bg-blue-600 hover:bg-blue-700" size="sm">
            <FontAwesomeIcon icon={faLightbulb} className="w-4 h-4 mr-2" />
            Start Learning
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4 mr-2" />
            View Sample Portfolio
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Pre-configured components for different contexts
export function OnboardingValueProp({ userTier }: { userTier: 'free' | 'premium' | 'plus' }) {
  return (
    <div className="mb-8">
      <ValuePropositionCard userTier={userTier} />
    </div>
  );
}

export function DashboardValueProp({ userTier }: { userTier: 'free' | 'premium' | 'plus' }) {
  return (
    <ValuePropositionCard userTier={userTier} className="mb-6" />
  );
}