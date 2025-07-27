import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
// PieChart component will be implemented as a simple visual representation
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBrain, 
  faChartLine, 
  faExclamationTriangle, 
  faCheckCircle, 
  faLock, 
  faDollarSign,
  faBullseye,
  faCalendar,
  faChartBar,
  faInfoCircle,
  faExternalLinkAlt,
  faLightbulb,
  faShield
} from '@fortawesome/free-solid-svg-icons';
import { supabase } from '@/lib/supabase';

interface AIPortfolioDisplayProps {
  goalId: string;
  userId: string;
  userTier: 'free' | 'premium' | 'premium_pro';
}

interface Portfolio {
  id: string;
  allocation: {
    stocks: number;
    bonds: number;
    alternatives: number;
    cash?: number;
  };
  recommended_holdings: Array<{
    symbol: string;
    name: string;
    allocation: number;
    category: string;
    reasoning: string;
    expenseRatio?: number;
    dividendYield?: number;
  }>;
  risk_score: number;
  expected_return: number;
  confidence_score: number;
  scenario_analysis: {
    best_case: { probability: number; value: number; };
    expected_case: { probability: number; value: number; };
    worst_case: { probability: number; value: number; };
  };
  ai_reasoning: string;
}

export function AIPortfolioDisplay({ goalId, userId, userTier }: AIPortfolioDisplayProps) {
  const [showFullReasoning, setShowFullReasoning] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: portfolioData, isLoading, error } = useQuery({
    queryKey: ['ai-portfolio', goalId, userId],
    queryFn: async () => {
      const { data, error: functionError } = await supabase.functions.invoke('ai-portfolio-generator', {
        body: {
          goalId,
          userId
        }
      });
      
      if (functionError) {
        throw new Error(functionError.message || 'Failed to generate portfolio');
      }
      
      if (!data?.success) {
        throw new Error(data?.error || 'Portfolio generation failed');
      }
      
      return data.portfolio as Portfolio;
    },
    enabled: !!goalId && !!userId,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  if (isLoading) {
    return <PortfolioLoadingSkeleton />;
  }

  if (error || !portfolioData) {
    return (
      <Card className="p-8 text-center">
        <FontAwesomeIcon icon={faExclamationTriangle} className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Portfolio Not Available</h3>
        <p className="text-gray-600 mb-4">
          We couldn't load your portfolio. Please try generating it again.
        </p>
        <Button onClick={() => {
          // Clear the error and retry the query
          queryClient.invalidateQueries({ queryKey: ['ai-portfolio', goalId, userId] });
        }}>
          Retry Loading
        </Button>
      </Card>
    );
  }

  const freeHoldings = portfolioData.recommended_holdings?.slice(0, 1) || [];
  const premiumHoldings = portfolioData.recommended_holdings || [];
  const displayHoldings = userTier === 'free' ? freeHoldings : premiumHoldings;

  // Prepare data for pie chart
  const allocationData = [
    { name: 'Stocks', value: portfolioData.allocation.stocks, color: '#3B82F6' },
    { name: 'Bonds', value: portfolioData.allocation.bonds, color: '#10B981' },
    { name: 'Alternatives', value: portfolioData.allocation.alternatives, color: '#F59E0B' },
    ...(portfolioData.allocation.cash ? [{ name: 'Cash', value: portfolioData.allocation.cash, color: '#6B7280' }] : [])
  ];

  const getRiskBadgeColor = (riskScore: number) => {
    if (riskScore <= 0.3) return 'success';
    if (riskScore <= 0.7) return 'warning';
    return 'destructive';
  };

  const getRiskLabel = (riskScore: number) => {
    if (riskScore <= 0.3) return 'Conservative';
    if (riskScore <= 0.7) return 'Moderate';
    return 'Aggressive';
  };

  return (
    <div className="space-y-8">
      {/* AI Analysis Header */}
      <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            <FontAwesomeIcon icon={faBrain} className="w-8 h-8" />
            <CardTitle className="text-2xl text-white">Your AI-Optimized Portfolio</CardTitle>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-blue-100 text-sm mb-1">AI Confidence</p>
              <p className="text-3xl font-bold">{Math.round(portfolioData.confidence_score * 100)}%</p>
            </div>
            <div className="text-center">
              <p className="text-blue-100 text-sm mb-1">Expected Return</p>
              <p className="text-3xl font-bold">{portfolioData.expected_return}% / year</p>
            </div>
            <div className="text-center">
              <p className="text-blue-100 text-sm mb-1">Risk Level</p>
              <Badge 
                variant={getRiskBadgeColor(portfolioData.risk_score)}
                className="text-lg px-3 py-1"
              >
                {getRiskLabel(portfolioData.risk_score)}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Portfolio Allocation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faChartBar} className="w-5 h-5" />
            Asset Allocation
          </CardTitle>
          <CardDescription>
            Recommended distribution of your investments across asset classes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Asset Allocation Visual */}
            <div className="flex justify-center">
              <div className="w-64 h-64 relative">
                <div className="absolute inset-0 rounded-full border-8 border-gray-100">
                  {/* Simple pie chart visualization using CSS */}
                  <div className="w-full h-full relative overflow-hidden rounded-full">
                    {allocationData.map((item, index) => {
                      const rotation = allocationData.slice(0, index).reduce((sum, prev) => sum + (prev.value * 3.6), 0);
                      const angle = item.value * 3.6;
                      return (
                        <div
                          key={item.name}
                          className="absolute w-full h-full"
                          style={{
                            background: `conic-gradient(from ${rotation}deg, ${item.color} 0deg, ${item.color} ${angle}deg, transparent ${angle}deg)`,
                            clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 50% 100%)'
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800">Portfolio</div>
                    <div className="text-sm text-gray-600">Allocation</div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Allocation Breakdown */}
            <div className="space-y-4">
              {allocationData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${item.value}%`,
                          backgroundColor: item.color
                        }}
                      />
                    </div>
                    <span className="font-semibold text-lg min-w-[3ch]">{item.value}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investment Holdings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FontAwesomeIcon icon={faBullseye} className="w-5 h-5" />
                Recommended Holdings
              </CardTitle>
              <CardDescription>
                Specific investments selected by our AI for your goals
              </CardDescription>
            </div>
            {userTier === 'free' && portfolioData.recommended_holdings.length > 1 && (
              <Badge variant="secondary">
                Showing 1 of {portfolioData.recommended_holdings.length} holdings
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {displayHoldings.map((holding, index) => (
              <HoldingCard key={holding.symbol} holding={holding} />
            ))}
            
            {userTier === 'free' && portfolioData.recommended_holdings.length > 1 && (
              <UpgradePromptCard 
                title="Complete Portfolio Access"
                description={`${portfolioData.recommended_holdings.length - 1} more holdings available with detailed analysis and reasoning`}
                features={[
                  'Full portfolio breakdown',
                  'Individual investment reasoning',
                  'Expense ratio analysis',
                  'Tax optimization guidance'
                ]}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scenario Analysis - Premium Feature */}
      {userTier !== 'free' && portfolioData.scenario_analysis ? (
        <ScenarioAnalysisCard scenarios={portfolioData.scenario_analysis} />
      ) : userTier === 'free' ? (
        <UpgradePromptCard 
          title="Portfolio Scenario Analysis"
          description="See how your portfolio might perform in different market conditions"
          features={[
            'Best case projections (90th percentile)',
            'Expected case projections (50th percentile)', 
            'Worst case projections (10th percentile)',
            'Monte Carlo simulations'
          ]}
        />
      ) : null}

      {/* AI Reasoning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faLightbulb} className="w-5 h-5" />
            AI Portfolio Reasoning
          </CardTitle>
          <CardDescription>
            Understanding the logic behind your personalized recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed">
              {showFullReasoning 
                ? portfolioData.ai_reasoning
                : `${portfolioData.ai_reasoning.slice(0, 200)}${portfolioData.ai_reasoning.length > 200 ? '...' : ''}`
              }
            </p>
            {portfolioData.ai_reasoning.length > 200 && (
              <Button
                variant="outline"
                onClick={() => setShowFullReasoning(!showFullReasoning)}
                className="mt-2 p-0 h-auto font-normal"
              >
                {showFullReasoning ? 'Show Less' : 'Read More'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          size="lg" 
          className="flex-1"
          onClick={async () => {
            try {
              await supabase.from('financial_goals').update({
                portfolio_accepted: true,
                portfolio_data: portfolioData,
                updated_at: new Date().toISOString()
              }).eq('id', goalId);
              
              alert('Portfolio accepted! You can now start investing.');
              router.navigate({ to: '/dashboard/portfolio', search: { goalId } });
            } catch (error) {
              alert('Failed to accept portfolio');
            }
          }}
        >
          <FontAwesomeIcon icon={faCheckCircle} className="w-4 h-4 mr-2" />
          Accept This Portfolio
        </Button>
        <Button 
          variant="outline" 
          size="lg" 
          className="flex-1"
          onClick={async () => {
            try {
              setIsRegenerating(true);
              const { data } = await supabase.functions.invoke('ai-portfolio-generator', {
                body: { goalId, userId, regenerate: true }
              });
              
              if (data?.success) {
                alert('New portfolio generated!');
                // Refresh the component data
                queryClient.invalidateQueries({ queryKey: ['ai-portfolio', goalId, userId] });
              }
            } catch (error) {
              alert('Failed to regenerate portfolio');
            } finally {
              setIsRegenerating(false);
            }
          }}
          disabled={isRegenerating}
        >
          {isRegenerating ? 'Generating...' : 'Regenerate Portfolio'}
        </Button>
        <Button 
          variant="outline" 
          size="lg"
          onClick={() => {
            // Track feature usage
            supabase.from('feature_usage').insert({
              user_id: userId,
              feature: 'professional_review_request',
              context: { goalId, portfolioData }
            });
            
            router.navigate({ 
              to: '/services/professional-review',
              search: { goalId, source: 'portfolio' }
            });
          }}
        >
          <FontAwesomeIcon icon={faExternalLinkAlt} className="w-4 h-4 mr-2" />
          Get Professional Review
        </Button>
      </div>
    </div>
  );
}

function HoldingCard({ holding }: { holding: any }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-lg">{holding.symbol}</h3>
            <Badge variant="outline">{holding.category}</Badge>
          </div>
          <p className="font-medium text-gray-900 mb-1">{holding.name}</p>
          <p className="text-sm text-gray-600">{holding.reasoning}</p>
        </div>
        <div className="text-right ml-4">
          <p className="text-2xl font-bold text-blue-600">{holding.allocation}%</p>
          <p className="text-xs text-gray-500">of portfolio</p>
        </div>
      </div>
      
      {(holding.expenseRatio || holding.dividendYield) && (
        <div className="flex gap-4 text-sm text-gray-600 pt-2 border-t border-gray-100">
          {holding.expenseRatio && (
            <span>Expense Ratio: {holding.expenseRatio}%</span>
          )}
          {holding.dividendYield && (
            <span>Dividend Yield: {holding.dividendYield}%</span>
          )}
        </div>
      )}
    </div>
  );
}

function ScenarioAnalysisCard({ scenarios }: { scenarios: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FontAwesomeIcon icon={faChartLine} className="w-5 h-5" />
          Portfolio Projections
        </CardTitle>
        <CardDescription>
          How your portfolio might perform under different market conditions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-green-600 mb-2">
              <FontAwesomeIcon icon={faChartLine} className="w-8 h-8 mx-auto" />
            </div>
            <h3 className="font-semibold text-green-800 mb-1">Best Case</h3>
            <p className="text-2xl font-bold text-green-900">
              ${scenarios.best_case.value.toLocaleString()}
            </p>
            <p className="text-xs text-green-600">
              90th percentile outcome
            </p>
          </div>
          
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-blue-600 mb-2">
              <FontAwesomeIcon icon={faBullseye} className="w-8 h-8 mx-auto" />
            </div>
            <h3 className="font-semibold text-blue-800 mb-1">Expected Case</h3>
            <p className="text-2xl font-bold text-blue-900">
              ${scenarios.expected_case.value.toLocaleString()}
            </p>
            <p className="text-xs text-blue-600">
              Most likely outcome
            </p>
          </div>
          
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-orange-600 mb-2">
              <FontAwesomeIcon icon={faShield} className="w-8 h-8 mx-auto" />
            </div>
            <h3 className="font-semibold text-orange-800 mb-1">Worst Case</h3>
            <p className="text-2xl font-bold text-orange-900">
              ${scenarios.worst_case.value.toLocaleString()}
            </p>
            <p className="text-xs text-orange-600">
              10th percentile outcome
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function UpgradePromptCard({ title, description, features }: { 
  title: string; 
  description: string; 
  features: string[];
}) {
  const router = useRouter();
  return (
    <div className="relative border-2 border-dashed border-yellow-300 rounded-lg p-6 bg-gradient-to-br from-yellow-50 to-orange-50">
      <div className="absolute top-4 right-4">
        <FontAwesomeIcon icon={faLock} className="w-5 h-5 text-yellow-600" />
      </div>
      
      <div className="pr-8">
        <h3 className="font-semibold text-yellow-800 mb-2">{title}</h3>
        <p className="text-yellow-700 text-sm mb-4">{description}</p>
        
        <ul className="text-sm text-yellow-700 space-y-1 mb-4">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2">
              <FontAwesomeIcon icon={faCheckCircle} className="w-3 h-3 text-yellow-600" />
              {feature}
            </li>
          ))}
        </ul>
        
        <Button 
          className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
          onClick={() => router.navigate({ to: '/pricing' })}
        >
          Upgrade to Premium →
        </Button>
      </div>
    </div>
  );
}

function PortfolioLoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg" />
      <div className="h-64 bg-gray-200 rounded-lg" />
      <div className="h-48 bg-gray-200 rounded-lg" />
      <div className="h-32 bg-gray-200 rounded-lg" />
    </div>
  );
}