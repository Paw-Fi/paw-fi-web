import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faShield, 
  faGraduationCap, 
  faInfoCircle, 
  faExclamationTriangle,
  faTimes,
  faCheckCircle
} from '@fortawesome/free-solid-svg-icons';

interface ComplianceDisclaimerProps {
  variant?: 'modal' | 'banner' | 'card';
  onAccept?: () => void;
  className?: string;
}

export function ComplianceDisclaimer({ variant = 'card', onAccept, className }: ComplianceDisclaimerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const content = (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <FontAwesomeIcon icon={faShield} className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
        <div>
          <h3 className="font-bold text-gray-900 mb-2">Educational Financial Analysis Tool</h3>
          <p className="text-gray-700 text-sm leading-relaxed">
            <strong>Paw-Fi provides educational financial analysis only.</strong> This platform is designed to help you learn about investing and portfolio management through AI-powered insights and educational content.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3 bg-red-50 border-l-4 border-red-400 rounded">
          <div className="flex items-center gap-2 mb-2">
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4 text-red-600" />
            <span className="font-semibold text-red-800 text-sm">Not Financial Advice</span>
          </div>
          <p className="text-red-700 text-xs leading-relaxed">
            AI recommendations are for educational purposes only. Always consult qualified financial advisors before making investment decisions.
          </p>
        </div>

        <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
          <div className="flex items-center gap-2 mb-2">
            <FontAwesomeIcon icon={faGraduationCap} className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-blue-800 text-sm">Learning Platform</span>
          </div>
          <p className="text-blue-700 text-xs leading-relaxed">
            Use our tools to understand portfolio theory, risk management, and investment strategies in a safe educational environment.
          </p>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3 pt-3 border-t border-gray-200">
          <h4 className="font-semibold text-gray-900 text-sm">Important Disclaimers:</h4>
          <ul className="space-y-2 text-xs text-gray-600">
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
              <span>Paw-Fi is not a registered investment advisor, broker-dealer, or financial planner</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
              <span>AI recommendations are based on general market data and algorithmic analysis</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
              <span>Past performance does not guarantee future results</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
              <span>All investments carry risk of loss, including potential loss of principal</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
              <span>Consider your financial situation, risk tolerance, and investment objectives</span>
            </li>
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          {isExpanded ? 'Show Less' : 'Read Full Disclaimer'}
        </button>
        
        {onAccept && (
          <Button onClick={onAccept} size="sm" className="bg-blue-600 hover:bg-blue-700">
            <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 mr-2" />
            I Understand
          </Button>
        )}
      </div>
    </div>
  );

  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 p-4 ${className}`}>
        {content}
      </div>
    );
  }

  if (variant === 'modal') {
    return (
      <Card className={`max-w-2xl mx-auto shadow-lg border-blue-200 ${className}`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faInfoCircle} className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg">Important Information</CardTitle>
            </div>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
              Required Reading
            </Badge>
          </div>
          <CardDescription>
            Please review these important disclaimers before using our portfolio analysis tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-blue-200 bg-blue-50/30 ${className}`}>
      <CardContent className="p-4">
        {content}
      </CardContent>
    </Card>
  );
}

// Pre-configured components for common use cases
export function PortfolioDisclaimer({ className }: { className?: string }) {
  return (
    <ComplianceDisclaimer 
      variant="banner" 
      className={`mb-6 ${className}`}
    />
  );
}

export function OnboardingDisclaimer({ onAccept }: { onAccept: () => void }) {
  return (
    <ComplianceDisclaimer 
      variant="modal" 
      onAccept={onAccept}
      className="mb-8"
    />
  );
}