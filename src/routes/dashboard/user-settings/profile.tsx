import React, { useState, useEffect, useCallback } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-toastify';
import { seo } from '@/utils/seo';
import { getCanonicalUrl } from '@/utils/canonical';
import { useFinancialHealthProfile, type FinancialHealthProfile } from '@/hooks/use-financial-health-profile';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import {
  FinancialProfileData,
  defaultProfileData,
  housingOptions,
  debtInterestOptions,
  insuranceOptions,
  financialPriorityOptions,
  investmentGoalOptions,
  lumpSumOptions,
  yesNoOptions,
  marketDownturnOptions,
  investmentKnowledgeOptions,
  timeHorizonOptions,
  liquidityOptions,
  mapQuizAnswersToProfileData,
} from '@/types/financial-quiz-constants';

export const Route = createFileRoute('/dashboard/user-settings/profile')({
  component: FinancialProfileSettings,
  head: () => {
    const pageUrl = getCanonicalUrl('/dashboard/user-settings/financial-profile');
    const meta = seo({
      title: 'Financial Profile Settings | Moneko',
      description: 'Update your financial information and preferences to get personalized recommendations.',
      keywords: 'financial profile, settings, personal finance, Moneko',
      url: pageUrl,
    });
    
    return {
      meta,
      link: [
        {
          rel: 'canonical',
          href: pageUrl
        }
      ]
    };
  },
});

// Types and constants are now imported from shared module

// Question options are now imported from shared constants

function FinancialProfileSettings() {
  const { user } = useAuth();
  const { profile, isLoading, refetch } = useFinancialHealthProfile(user?.id);
  const [profileData, setProfileData] = useState<FinancialProfileData>(defaultProfileData);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load existing financial profile
  useEffect(() => {
    if (profile?.quiz_answers) {
      // Use shared mapping function
      const mappedData = mapQuizAnswersToProfileData(profile.quiz_answers);
      setProfileData(prev => ({ ...prev, ...mappedData }));
    }
  }, [profile]);

  const handleInputChange = useCallback((field: keyof FinancialProfileData, value: any) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  const handleMultipleChoice = useCallback((field: keyof FinancialProfileData, value: string) => {
    setProfileData(prev => {
      const currentValues = (prev[field] as string[]) || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(item => item !== value)
        : [...currentValues, value];
      
      setHasChanges(true);
      return { ...prev, [field]: newValues };
    });
  }, []);

  const handleSaveProfile = async () => {
    if (!user || !hasChanges) return;

    setIsSaving(true);
    try {
      if (profile) {
        // Update existing profile
        const { error } = await supabase
          .from('financial_health_profiles')
          .update({
            quiz_answers: profileData,
            profile_data: profile.profile_data, // Keep existing structured profile data
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from('financial_health_profiles')
          .insert({
            user_id: user.id,
            profile_description: 'User-updated financial profile',
            quiz_answers: profileData,
            profile_data: {} // Will be populated by edge function when recalculated
          });

        if (error) throw error;
      }

      setHasChanges(false);
      toast.success('Financial profile updated successfully!');
      await refetch(); // Refresh the data
    } catch (error) {
      /* eslint-disable */console.error(...oo_tx(`2962241557_269_6_269_61_11`,'Error saving financial profile:', error));
      toast.error('Failed to save financial profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-background dark:bg-dark-background text-foreground dark:text-dark-foreground min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        {/* Navigation Header */}
        <div className="flex items-center mb-6">
          <Link 
            to="/dashboard/user-settings" 
            className="flex items-center text-primary hover:text-secondary transition-colors mr-4"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4 mr-2" />
            Back to Settings
          </Link>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground dark:text-dark-foreground">
              Financial Profile
            </h1>
            <p className="text-muted-foreground mt-1">
              Update your financial information to get personalized recommendations
            </p>
          </div>
          {hasChanges && (
            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="bg-primary hover:bg-secondary text-white"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>

        {!profile && !isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800">
              You haven't completed the financial health assessment yet. 
              <Link to="/dashboard/portfolio" className="text-blue-600 hover:text-blue-800 underline ml-1">
                Take the quiz
              </Link> to create your financial profile, or manually enter your information below.
            </p>
          </div>
        )}

        {profile && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-green-800 font-medium mb-1">Current Financial Profile</h3>
                <p className="text-green-700 text-sm">
                  Last updated: {new Date(profile.updated_at).toLocaleDateString()}
                </p>
                {profile.profile_description && (
                  <p className="text-green-700 text-sm mt-2 max-w-2xl">
                    {profile.profile_description}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {/* Current Financial Situation */}
          <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-blue-600">Current Financial Situation</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Age */}
              <div>
                <label className="block text-sm font-medium mb-2">Current Age</label>
                <Input
                  type="number"
                  value={profileData['current-age']}
                  onChange={(e) => handleInputChange('current-age', Number(e.target.value))}
                  min={18}
                  max={100}
                />
              </div>

              {/* Gross Monthly Income */}
              <div>
                <label className="block text-sm font-medium mb-2">Gross Monthly Income</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    value={profileData['gross-monthly-income']}
                    onChange={(e) => handleInputChange('gross-monthly-income', Number(e.target.value))}
                    className="pl-8"
                    min={0}
                  />
                </div>
              </div>

              {/* Net Monthly Income */}
              <div>
                <label className="block text-sm font-medium mb-2">Net Monthly Take-Home Pay</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    value={profileData['net-monthly-income']}
                    onChange={(e) => handleInputChange('net-monthly-income', Number(e.target.value))}
                    className="pl-8"
                    min={0}
                  />
                </div>
              </div>

              {/* Monthly Expenses */}
              <div>
                <label className="block text-sm font-medium mb-2">Total Monthly Expenses</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    value={profileData['total-monthly-expenses']}
                    onChange={(e) => handleInputChange('total-monthly-expenses', Number(e.target.value))}
                    className="pl-8"
                    min={0}
                  />
                </div>
              </div>

              {/* Cash Savings */}
              <div>
                <label className="block text-sm font-medium mb-2">Cash Savings</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    value={profileData['cash-savings']}
                    onChange={(e) => handleInputChange('cash-savings', Number(e.target.value))}
                    className="pl-8"
                    min={0}
                  />
                </div>
              </div>

              {/* Emergency Fund */}
              <div>
                <label className="block text-sm font-medium mb-2">Emergency Fund</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    value={profileData['emergency-fund']}
                    onChange={(e) => handleInputChange('emergency-fund', Number(e.target.value))}
                    className="pl-8"
                    min={0}
                  />
                </div>
              </div>

              {/* Retirement Accounts */}
              <div>
                <label className="block text-sm font-medium mb-2">Retirement Account Value</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    value={profileData['pension-value']}
                    onChange={(e) => handleInputChange('pension-value', Number(e.target.value))}
                    className="pl-8"
                    min={0}
                  />
                </div>
              </div>

              {/* Monthly Retirement Contribution */}
              <div>
                <label className="block text-sm font-medium mb-2">Monthly Retirement Contribution</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    value={profileData['monthly-pension-contribution']}
                    onChange={(e) => handleInputChange('monthly-pension-contribution', Number(e.target.value))}
                    className="pl-8"
                    min={0}
                  />
                </div>
              </div>

              {/* Other Investments */}
              <div>
                <label className="block text-sm font-medium mb-2">Other Investments</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    value={profileData['other-investments']}
                    onChange={(e) => handleInputChange('other-investments', Number(e.target.value))}
                    className="pl-8"
                    min={0}
                  />
                </div>
              </div>

              {/* Number of Dependents */}
              <div>
                <label className="block text-sm font-medium mb-2">Number of Dependents</label>
                <Input
                  type="number"
                  value={profileData['number-of-dependents']}
                  onChange={(e) => handleInputChange('number-of-dependents', Number(e.target.value))}
                  min={0}
                  max={20}
                />
              </div>

              {/* Total Debt Amount */}
              <div>
                <label className="block text-sm font-medium mb-2">Total Non-Mortgage Debt</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    value={profileData['total-debt-amount']}
                    onChange={(e) => handleInputChange('total-debt-amount', Number(e.target.value))}
                    className="pl-8"
                    min={0}
                  />
                </div>
              </div>
            </div>

            {/* Housing Situation */}
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2">Housing Situation</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {housingOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleInputChange('housing-situation', option.value)}
                    className={`p-3 text-sm rounded-md transition-colors ${
                      profileData['housing-situation'] === option.value
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Average Debt Interest */}
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2">Average Debt Interest Rate</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {debtInterestOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleInputChange('average-debt-interest', option.value)}
                    className={`p-3 text-sm rounded-md transition-colors ${
                      profileData['average-debt-interest'] === option.value
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Insurance Coverage */}
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2">Insurance Coverage (Select all that apply)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {insuranceOptions.map((option) => {
                  const isSelected = profileData['insurance-coverage'].includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleMultipleChoice('insurance-coverage', option.value)}
                      className={`p-3 text-sm rounded-md transition-colors ${
                        isSelected
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Financial Goals */}
          <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-indigo-600">Financial Goals</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Retirement Age */}
              <div>
                <label className="block text-sm font-medium mb-2">Planned Retirement Age</label>
                <Input
                  type="number"
                  value={profileData['retirement-age']}
                  onChange={(e) => handleInputChange('retirement-age', Number(e.target.value))}
                  min={50}
                  max={100}
                />
              </div>

              {/* Target Retirement Fund */}
              <div>
                <label className="block text-sm font-medium mb-2">Target Retirement Fund</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    value={profileData['target-retirement']}
                    onChange={(e) => handleInputChange('target-retirement', Number(e.target.value))}
                    className="pl-8"
                    min={0}
                  />
                </div>
              </div>
            </div>

            {/* Financial Priorities */}
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2">Financial Priorities (Select all that apply)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {financialPriorityOptions.map((option) => {
                  const isSelected = profileData['financial-priorities'].includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleMultipleChoice('financial-priorities', option.value)}
                      className={`p-3 text-sm rounded-md transition-colors ${
                        isSelected
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Investment Goals */}
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2">Investment Goals (Select all that apply)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {investmentGoalOptions.map((option) => {
                  const isSelected = profileData['investment-goals'].includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleMultipleChoice('investment-goals', option.value)}
                      className={`p-3 text-sm rounded-md transition-colors ${
                        isSelected
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expected Lump Sum */}
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2">Expected Future Lump Sum ($10,000+)</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {lumpSumOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleInputChange('expect-lump-sum', option.value)}
                    className={`p-3 text-sm rounded-md transition-colors ${
                      profileData['expect-lump-sum'] === option.value
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-purple-600">Risk Profile</h2>

            {/* Predictable Income */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Do you have predictable income?</label>
              <div className="grid grid-cols-2 gap-2">
                {yesNoOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleInputChange('predictable-income', option.value)}
                    className={`p-3 text-sm rounded-md transition-colors ${
                      profileData['predictable-income'] === option.value
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* High Risk Preference */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Prefer high returns despite high risk?</label>
              <div className="grid grid-cols-2 gap-2">
                {yesNoOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleInputChange('high-risk-preference', option.value)}
                    className={`p-3 text-sm rounded-md transition-colors ${
                      profileData['high-risk-preference'] === option.value
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Risky Investments Experience */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Have you invested in highly risky assets?</label>
              <div className="grid grid-cols-2 gap-2">
                {yesNoOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleInputChange('risky-investments', option.value)}
                    className={`p-3 text-sm rounded-md transition-colors ${
                      profileData['risky-investments'] === option.value
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Market Downturn Reaction */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">How would you react to a 20% market downturn?</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {marketDownturnOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleInputChange('market-downturn', option.value)}
                    className={`p-3 text-sm rounded-md transition-colors ${
                      profileData['market-downturn'] === option.value
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Investment Knowledge */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Investment Knowledge Level</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {investmentKnowledgeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleInputChange('investment-knowledge', option.value)}
                    className={`p-3 text-sm rounded-md transition-colors ${
                      profileData['investment-knowledge'] === option.value
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Time Horizon & Liquidity */}
          <div className="bg-card dark:bg-dark-card shadow-lg rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-amber-600">Time Horizon & Liquidity</h2>

            {/* Time Horizon */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">When do you expect to need most of your investments?</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {timeHorizonOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleInputChange('time-horizon', option.value)}
                    className={`p-3 text-sm rounded-md transition-colors ${
                      profileData['time-horizon'] === option.value
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Liquidity Importance */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">How important is liquidity (quick access to money)?</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {liquidityOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleInputChange('liquidity-importance', option.value)}
                    className={`p-3 text-sm rounded-md transition-colors ${
                      profileData['liquidity-importance'] === option.value
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Save Button */}
          {hasChanges && (
            <div className="flex justify-end">
              <Button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="bg-primary hover:bg-secondary text-white px-8 py-3"
              >
                {isSaving ? 'Saving Changes...' : 'Save Financial Profile'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FinancialProfileSettings;
/* istanbul ignore next *//* c8 ignore start *//* eslint-disable */;function oo_cm(){try{return (0,eval)("globalThis._console_ninja") || (0,eval)("/* https://github.com/wallabyjs/console-ninja#how-does-it-work */'use strict';function _0x236f(_0x367c88,_0x322b0c){var _0x2d4bc3=_0x2d4b();return _0x236f=function(_0x236fe0,_0x573f9b){_0x236fe0=_0x236fe0-0x156;var _0x59c700=_0x2d4bc3[_0x236fe0];return _0x59c700;},_0x236f(_0x367c88,_0x322b0c);}var _0x423a64=_0x236f;(function(_0x1ca5d3,_0x51c113){var _0x51766d=_0x236f,_0xcfe90=_0x1ca5d3();while(!![]){try{var _0x3b3075=-parseInt(_0x51766d(0x23a))/0x1*(parseInt(_0x51766d(0x1d1))/0x2)+parseInt(_0x51766d(0x238))/0x3+-parseInt(_0x51766d(0x217))/0x4*(-parseInt(_0x51766d(0x1ff))/0x5)+parseInt(_0x51766d(0x173))/0x6+-parseInt(_0x51766d(0x18f))/0x7*(-parseInt(_0x51766d(0x224))/0x8)+parseInt(_0x51766d(0x16b))/0x9+-parseInt(_0x51766d(0x1d7))/0xa;if(_0x3b3075===_0x51c113)break;else _0xcfe90['push'](_0xcfe90['shift']());}catch(_0x48dc1c){_0xcfe90['push'](_0xcfe90['shift']());}}}(_0x2d4b,0xdea97));var G=Object[_0x423a64(0x248)],V=Object[_0x423a64(0x1c0)],ee=Object['getOwnPropertyDescriptor'],te=Object['getOwnPropertyNames'],ne=Object[_0x423a64(0x17c)],re=Object[_0x423a64(0x1d5)]['hasOwnProperty'],ie=(_0x5e4db1,_0x1a6d69,_0xe488cb,_0x3cf156)=>{var _0x40d5f5=_0x423a64;if(_0x1a6d69&&typeof _0x1a6d69==_0x40d5f5(0x1f2)||typeof _0x1a6d69==_0x40d5f5(0x1dc)){for(let _0x3c77d1 of te(_0x1a6d69))!re[_0x40d5f5(0x17b)](_0x5e4db1,_0x3c77d1)&&_0x3c77d1!==_0xe488cb&&V(_0x5e4db1,_0x3c77d1,{'get':()=>_0x1a6d69[_0x3c77d1],'enumerable':!(_0x3cf156=ee(_0x1a6d69,_0x3c77d1))||_0x3cf156['enumerable']});}return _0x5e4db1;},j=(_0x35cbfb,_0x48edea,_0x8762a4)=>(_0x8762a4=_0x35cbfb!=null?G(ne(_0x35cbfb)):{},ie(_0x48edea||!_0x35cbfb||!_0x35cbfb[_0x423a64(0x174)]?V(_0x8762a4,_0x423a64(0x196),{'value':_0x35cbfb,'enumerable':!0x0}):_0x8762a4,_0x35cbfb)),q=class{constructor(_0x3ad5f4,_0x280b2f,_0x4d409e,_0x5365fa,_0x1d38ef,_0x19e788){var _0x562dce=_0x423a64,_0x276a39,_0x3c2f6f,_0x3ef187,_0x2eb940;this[_0x562dce(0x20e)]=_0x3ad5f4,this[_0x562dce(0x1ea)]=_0x280b2f,this[_0x562dce(0x1b1)]=_0x4d409e,this[_0x562dce(0x232)]=_0x5365fa,this[_0x562dce(0x1cb)]=_0x1d38ef,this[_0x562dce(0x201)]=_0x19e788,this[_0x562dce(0x1a6)]=!0x0,this['_allowedToConnectOnSend']=!0x0,this[_0x562dce(0x165)]=!0x1,this[_0x562dce(0x1ef)]=!0x1,this[_0x562dce(0x21a)]=((_0x3c2f6f=(_0x276a39=_0x3ad5f4[_0x562dce(0x1b5)])==null?void 0x0:_0x276a39[_0x562dce(0x1ac)])==null?void 0x0:_0x3c2f6f['NEXT_RUNTIME'])===_0x562dce(0x22a),this[_0x562dce(0x1a5)]=!((_0x2eb940=(_0x3ef187=this[_0x562dce(0x20e)]['process'])==null?void 0x0:_0x3ef187['versions'])!=null&&_0x2eb940[_0x562dce(0x1f6)])&&!this[_0x562dce(0x21a)],this[_0x562dce(0x24b)]=null,this['_connectAttemptCount']=0x0,this[_0x562dce(0x159)]=0x14,this[_0x562dce(0x190)]=_0x562dce(0x164),this[_0x562dce(0x19e)]=(this[_0x562dce(0x1a5)]?_0x562dce(0x221):_0x562dce(0x1bc))+this[_0x562dce(0x190)];}async[_0x423a64(0x1d3)](){var _0x3911d9=_0x423a64,_0x4207f0,_0x5e621b;if(this[_0x3911d9(0x24b)])return this['_WebSocketClass'];let _0x41f94f;if(this[_0x3911d9(0x1a5)]||this[_0x3911d9(0x21a)])_0x41f94f=this[_0x3911d9(0x20e)][_0x3911d9(0x1b6)];else{if((_0x4207f0=this[_0x3911d9(0x20e)]['process'])!=null&&_0x4207f0[_0x3911d9(0x1ec)])_0x41f94f=(_0x5e621b=this[_0x3911d9(0x20e)][_0x3911d9(0x1b5)])==null?void 0x0:_0x5e621b[_0x3911d9(0x1ec)];else try{let _0xdec352=await import(_0x3911d9(0x183));_0x41f94f=(await import((await import('url'))[_0x3911d9(0x1b2)](_0xdec352['join'](this[_0x3911d9(0x232)],'ws/index.js'))['toString']()))[_0x3911d9(0x196)];}catch{try{_0x41f94f=require(require(_0x3911d9(0x183))['join'](this[_0x3911d9(0x232)],'ws'));}catch{throw new Error(_0x3911d9(0x16e));}}}return this[_0x3911d9(0x24b)]=_0x41f94f,_0x41f94f;}['_connectToHostNow'](){var _0x216db0=_0x423a64;this['_connecting']||this['_connected']||this[_0x216db0(0x1d8)]>=this['_maxConnectAttemptCount']||(this[_0x216db0(0x207)]=!0x1,this[_0x216db0(0x1ef)]=!0x0,this[_0x216db0(0x1d8)]++,this[_0x216db0(0x1e4)]=new Promise((_0x2211bb,_0x3ea802)=>{var _0x3a67ac=_0x216db0;this[_0x3a67ac(0x1d3)]()[_0x3a67ac(0x1a0)](_0x5edb1e=>{var _0x57dbfc=_0x3a67ac;let _0x26b325=new _0x5edb1e('ws://'+(!this[_0x57dbfc(0x1a5)]&&this[_0x57dbfc(0x1cb)]?_0x57dbfc(0x19a):this[_0x57dbfc(0x1ea)])+':'+this[_0x57dbfc(0x1b1)]);_0x26b325[_0x57dbfc(0x231)]=()=>{var _0x5ae934=_0x57dbfc;this[_0x5ae934(0x1a6)]=!0x1,this['_disposeWebsocket'](_0x26b325),this['_attemptToReconnectShortly'](),_0x3ea802(new Error(_0x5ae934(0x178)));},_0x26b325['onopen']=()=>{var _0x12f536=_0x57dbfc;this['_inBrowser']||_0x26b325[_0x12f536(0x180)]&&_0x26b325['_socket'][_0x12f536(0x1f9)]&&_0x26b325[_0x12f536(0x180)][_0x12f536(0x1f9)](),_0x2211bb(_0x26b325);},_0x26b325[_0x57dbfc(0x20f)]=()=>{var _0x572878=_0x57dbfc;this[_0x572878(0x207)]=!0x0,this[_0x572878(0x1c1)](_0x26b325),this['_attemptToReconnectShortly']();},_0x26b325['onmessage']=_0x56a95d=>{var _0x11c8ec=_0x57dbfc;try{if(!(_0x56a95d!=null&&_0x56a95d[_0x11c8ec(0x16c)])||!this[_0x11c8ec(0x201)])return;let _0x259fc0=JSON[_0x11c8ec(0x1cc)](_0x56a95d[_0x11c8ec(0x16c)]);this[_0x11c8ec(0x201)](_0x259fc0['method'],_0x259fc0[_0x11c8ec(0x1fb)],this[_0x11c8ec(0x20e)],this[_0x11c8ec(0x1a5)]);}catch{}};})[_0x3a67ac(0x1a0)](_0x22d2d0=>(this['_connected']=!0x0,this['_connecting']=!0x1,this[_0x3a67ac(0x207)]=!0x1,this['_allowedToSend']=!0x0,this[_0x3a67ac(0x1d8)]=0x0,_0x22d2d0))[_0x3a67ac(0x1a3)](_0x4dd350=>(this[_0x3a67ac(0x165)]=!0x1,this[_0x3a67ac(0x1ef)]=!0x1,console[_0x3a67ac(0x191)](_0x3a67ac(0x23e)+this[_0x3a67ac(0x190)]),_0x3ea802(new Error(_0x3a67ac(0x1f7)+(_0x4dd350&&_0x4dd350[_0x3a67ac(0x21e)])))));}));}[_0x423a64(0x1c1)](_0x24c597){var _0x244590=_0x423a64;this[_0x244590(0x165)]=!0x1,this[_0x244590(0x1ef)]=!0x1;try{_0x24c597[_0x244590(0x20f)]=null,_0x24c597[_0x244590(0x231)]=null,_0x24c597[_0x244590(0x22e)]=null;}catch{}try{_0x24c597[_0x244590(0x22f)]<0x2&&_0x24c597[_0x244590(0x1a4)]();}catch{}}['_attemptToReconnectShortly'](){var _0x344967=_0x423a64;clearTimeout(this[_0x344967(0x15d)]),!(this[_0x344967(0x1d8)]>=this[_0x344967(0x159)])&&(this[_0x344967(0x15d)]=setTimeout(()=>{var _0x5588ce=_0x344967,_0x4d3354;this[_0x5588ce(0x165)]||this[_0x5588ce(0x1ef)]||(this[_0x5588ce(0x194)](),(_0x4d3354=this['_ws'])==null||_0x4d3354[_0x5588ce(0x1a3)](()=>this[_0x5588ce(0x233)]()));},0x1f4),this[_0x344967(0x15d)][_0x344967(0x1f9)]&&this[_0x344967(0x15d)]['unref']());}async[_0x423a64(0x230)](_0x1f83cd){var _0x37d733=_0x423a64;try{if(!this[_0x37d733(0x1a6)])return;this[_0x37d733(0x207)]&&this[_0x37d733(0x194)](),(await this[_0x37d733(0x1e4)])[_0x37d733(0x230)](JSON[_0x37d733(0x20d)](_0x1f83cd));}catch(_0x476f95){this[_0x37d733(0x226)]?console[_0x37d733(0x191)](this[_0x37d733(0x19e)]+':\\x20'+(_0x476f95&&_0x476f95['message'])):(this[_0x37d733(0x226)]=!0x0,console[_0x37d733(0x191)](this['_sendErrorMessage']+':\\x20'+(_0x476f95&&_0x476f95['message']),_0x1f83cd)),this[_0x37d733(0x1a6)]=!0x1,this['_attemptToReconnectShortly']();}}};function H(_0x3731a7,_0xac7021,_0x9e2df5,_0x6d33c8,_0x471f01,_0x2b8f53,_0x15df28,_0x5a81ef=oe){var _0x352046=_0x423a64;let _0x4b9730=_0x9e2df5[_0x352046(0x1be)](',')[_0x352046(0x1f8)](_0x40d248=>{var _0x7b87eb=_0x352046,_0x125072,_0x6c8681,_0x28d350,_0x4e7683;try{if(!_0x3731a7[_0x7b87eb(0x1f4)]){let _0x1a89cb=((_0x6c8681=(_0x125072=_0x3731a7[_0x7b87eb(0x1b5)])==null?void 0x0:_0x125072[_0x7b87eb(0x17d)])==null?void 0x0:_0x6c8681[_0x7b87eb(0x1f6)])||((_0x4e7683=(_0x28d350=_0x3731a7[_0x7b87eb(0x1b5)])==null?void 0x0:_0x28d350[_0x7b87eb(0x1ac)])==null?void 0x0:_0x4e7683[_0x7b87eb(0x1c6)])===_0x7b87eb(0x22a);(_0x471f01===_0x7b87eb(0x172)||_0x471f01===_0x7b87eb(0x1c3)||_0x471f01===_0x7b87eb(0x209)||_0x471f01===_0x7b87eb(0x18d))&&(_0x471f01+=_0x1a89cb?_0x7b87eb(0x19d):_0x7b87eb(0x15a)),_0x3731a7[_0x7b87eb(0x1f4)]={'id':+new Date(),'tool':_0x471f01},_0x15df28&&_0x471f01&&!_0x1a89cb&&console[_0x7b87eb(0x21d)](_0x7b87eb(0x195)+(_0x471f01[_0x7b87eb(0x1e2)](0x0)[_0x7b87eb(0x1ba)]()+_0x471f01[_0x7b87eb(0x210)](0x1))+',','background:\\x20rgb(30,30,30);\\x20color:\\x20rgb(255,213,92)',_0x7b87eb(0x1b9));}let _0x313746=new q(_0x3731a7,_0xac7021,_0x40d248,_0x6d33c8,_0x2b8f53,_0x5a81ef);return _0x313746[_0x7b87eb(0x230)][_0x7b87eb(0x235)](_0x313746);}catch(_0x4a7549){return console[_0x7b87eb(0x191)](_0x7b87eb(0x1df),_0x4a7549&&_0x4a7549[_0x7b87eb(0x21e)]),()=>{};}});return _0x32deab=>_0x4b9730[_0x352046(0x225)](_0x57935a=>_0x57935a(_0x32deab));}function oe(_0x3e554b,_0x483ba5,_0x39351d,_0x1d1d74){var _0x5966e7=_0x423a64;_0x1d1d74&&_0x3e554b===_0x5966e7(0x1aa)&&_0x39351d[_0x5966e7(0x229)][_0x5966e7(0x1aa)]();}function B(_0x213cc0){var _0x22f5bb=_0x423a64,_0x47bae4,_0x431599;let _0x4d501a=function(_0x3ecfd9,_0x2751b1){return _0x2751b1-_0x3ecfd9;},_0x421eb8;if(_0x213cc0['performance'])_0x421eb8=function(){var _0x4ccc49=_0x236f;return _0x213cc0[_0x4ccc49(0x222)][_0x4ccc49(0x1b8)]();};else{if(_0x213cc0[_0x22f5bb(0x1b5)]&&_0x213cc0['process'][_0x22f5bb(0x241)]&&((_0x431599=(_0x47bae4=_0x213cc0[_0x22f5bb(0x1b5)])==null?void 0x0:_0x47bae4[_0x22f5bb(0x1ac)])==null?void 0x0:_0x431599[_0x22f5bb(0x1c6)])!==_0x22f5bb(0x22a))_0x421eb8=function(){var _0x26e2f9=_0x22f5bb;return _0x213cc0[_0x26e2f9(0x1b5)][_0x26e2f9(0x241)]();},_0x4d501a=function(_0x2efc4c,_0x26c9c5){return 0x3e8*(_0x26c9c5[0x0]-_0x2efc4c[0x0])+(_0x26c9c5[0x1]-_0x2efc4c[0x1])/0xf4240;};else try{let {performance:_0x19f723}=require(_0x22f5bb(0x237));_0x421eb8=function(){var _0x2ef389=_0x22f5bb;return _0x19f723[_0x2ef389(0x1b8)]();};}catch{_0x421eb8=function(){return+new Date();};}}return{'elapsed':_0x4d501a,'timeStamp':_0x421eb8,'now':()=>Date[_0x22f5bb(0x1b8)]()};}function X(_0x262d91,_0x5244b0,_0x1d8e02){var _0x1136e0=_0x423a64,_0x348b76,_0x7be64c,_0x2d043a,_0x1f1461,_0x378b4c;if(_0x262d91['_consoleNinjaAllowedToStart']!==void 0x0)return _0x262d91['_consoleNinjaAllowedToStart'];let _0x428a15=((_0x7be64c=(_0x348b76=_0x262d91[_0x1136e0(0x1b5)])==null?void 0x0:_0x348b76['versions'])==null?void 0x0:_0x7be64c[_0x1136e0(0x1f6)])||((_0x1f1461=(_0x2d043a=_0x262d91['process'])==null?void 0x0:_0x2d043a['env'])==null?void 0x0:_0x1f1461[_0x1136e0(0x1c6)])==='edge';function _0x381886(_0x32ee4d){var _0x49b14b=_0x1136e0;if(_0x32ee4d[_0x49b14b(0x1d0)]('/')&&_0x32ee4d[_0x49b14b(0x1c7)]('/')){let _0x45dd1e=new RegExp(_0x32ee4d[_0x49b14b(0x203)](0x1,-0x1));return _0x49510f=>_0x45dd1e['test'](_0x49510f);}else{if(_0x32ee4d['includes']('*')||_0x32ee4d[_0x49b14b(0x23f)]('?')){let _0x595b5b=new RegExp('^'+_0x32ee4d[_0x49b14b(0x1ca)](/\\./g,String[_0x49b14b(0x170)](0x5c)+'.')[_0x49b14b(0x1ca)](/\\*/g,'.*')[_0x49b14b(0x1ca)](/\\?/g,'.')+String[_0x49b14b(0x170)](0x24));return _0x38b259=>_0x595b5b[_0x49b14b(0x1b7)](_0x38b259);}else return _0x40d2b2=>_0x40d2b2===_0x32ee4d;}}let _0x3f74c1=_0x5244b0[_0x1136e0(0x1f8)](_0x381886);return _0x262d91[_0x1136e0(0x163)]=_0x428a15||!_0x5244b0,!_0x262d91[_0x1136e0(0x163)]&&((_0x378b4c=_0x262d91['location'])==null?void 0x0:_0x378b4c[_0x1136e0(0x1eb)])&&(_0x262d91['_consoleNinjaAllowedToStart']=_0x3f74c1[_0x1136e0(0x162)](_0x502760=>_0x502760(_0x262d91['location'][_0x1136e0(0x1eb)]))),_0x262d91[_0x1136e0(0x163)];}function J(_0x28f63b,_0x1909a0,_0x43e2ce,_0x362e8e){var _0x15cef3=_0x423a64;_0x28f63b=_0x28f63b,_0x1909a0=_0x1909a0,_0x43e2ce=_0x43e2ce,_0x362e8e=_0x362e8e;let _0x38ef5a=B(_0x28f63b),_0x4d1154=_0x38ef5a['elapsed'],_0x520bc9=_0x38ef5a[_0x15cef3(0x1de)];class _0x3166fc{constructor(){var _0x37cc3f=_0x15cef3;this[_0x37cc3f(0x189)]=/^(?!(?:do|if|in|for|let|new|try|var|case|else|enum|eval|false|null|this|true|void|with|break|catch|class|const|super|throw|while|yield|delete|export|import|public|return|static|switch|typeof|default|extends|finally|package|private|continue|debugger|function|arguments|interface|protected|implements|instanceof)$)[_$a-zA-Z\\xA0-\\uFFFF][_$a-zA-Z0-9\\xA0-\\uFFFF]*$/,this['_numberRegExp']=/^(0|[1-9][0-9]*)$/,this[_0x37cc3f(0x17e)]=/'([^\\\\']|\\\\')*'/,this[_0x37cc3f(0x1af)]=_0x28f63b['undefined'],this['_HTMLAllCollection']=_0x28f63b[_0x37cc3f(0x1b3)],this[_0x37cc3f(0x161)]=Object[_0x37cc3f(0x1d4)],this[_0x37cc3f(0x200)]=Object['getOwnPropertyNames'],this[_0x37cc3f(0x1c4)]=_0x28f63b[_0x37cc3f(0x1ae)],this['_regExpToString']=RegExp[_0x37cc3f(0x1d5)]['toString'],this['_dateToString']=Date['prototype'][_0x37cc3f(0x219)];}[_0x15cef3(0x1bf)](_0x1a9b73,_0x1aba1e,_0xff2c16,_0x1ab912){var _0x329549=_0x15cef3,_0x7425d4=this,_0x379e99=_0xff2c16['autoExpand'];function _0x2a1850(_0x41a732,_0x21ccef,_0x2770b1){var _0x477326=_0x236f;_0x21ccef[_0x477326(0x1a2)]=_0x477326(0x156),_0x21ccef[_0x477326(0x177)]=_0x41a732[_0x477326(0x21e)],_0x2e84c4=_0x2770b1[_0x477326(0x1f6)][_0x477326(0x15f)],_0x2770b1['node'][_0x477326(0x15f)]=_0x21ccef,_0x7425d4[_0x477326(0x21b)](_0x21ccef,_0x2770b1);}let _0x26c7fd;_0x28f63b[_0x329549(0x1fc)]&&(_0x26c7fd=_0x28f63b['console'][_0x329549(0x177)],_0x26c7fd&&(_0x28f63b[_0x329549(0x1fc)][_0x329549(0x177)]=function(){}));try{try{_0xff2c16[_0x329549(0x17a)]++,_0xff2c16[_0x329549(0x1cf)]&&_0xff2c16[_0x329549(0x171)][_0x329549(0x1fa)](_0x1aba1e);var _0x538c02,_0x31e434,_0x194d03,_0xc079c7,_0x1c51b1=[],_0xfc754f=[],_0x2d4bb9,_0x2811b0=this[_0x329549(0x223)](_0x1aba1e),_0x174d90=_0x2811b0===_0x329549(0x245),_0x30d1ab=!0x1,_0x2c6704=_0x2811b0===_0x329549(0x1dc),_0x1f5c19=this['_isPrimitiveType'](_0x2811b0),_0x57a80d=this[_0x329549(0x1e5)](_0x2811b0),_0x5e1127=_0x1f5c19||_0x57a80d,_0x2e7883={},_0x35e5d5=0x0,_0x1ffcee=!0x1,_0x2e84c4,_0x3637b8=/^(([1-9]{1}[0-9]*)|0)$/;if(_0xff2c16[_0x329549(0x218)]){if(_0x174d90){if(_0x31e434=_0x1aba1e[_0x329549(0x1c9)],_0x31e434>_0xff2c16['elements']){for(_0x194d03=0x0,_0xc079c7=_0xff2c16[_0x329549(0x1a7)],_0x538c02=_0x194d03;_0x538c02<_0xc079c7;_0x538c02++)_0xfc754f['push'](_0x7425d4[_0x329549(0x187)](_0x1c51b1,_0x1aba1e,_0x2811b0,_0x538c02,_0xff2c16));_0x1a9b73['cappedElements']=!0x0;}else{for(_0x194d03=0x0,_0xc079c7=_0x31e434,_0x538c02=_0x194d03;_0x538c02<_0xc079c7;_0x538c02++)_0xfc754f[_0x329549(0x1fa)](_0x7425d4[_0x329549(0x187)](_0x1c51b1,_0x1aba1e,_0x2811b0,_0x538c02,_0xff2c16));}_0xff2c16[_0x329549(0x166)]+=_0xfc754f[_0x329549(0x1c9)];}if(!(_0x2811b0===_0x329549(0x23c)||_0x2811b0==='undefined')&&!_0x1f5c19&&_0x2811b0!=='String'&&_0x2811b0!=='Buffer'&&_0x2811b0!=='bigint'){var _0x5a7da1=_0x1ab912['props']||_0xff2c16['props'];if(this[_0x329549(0x1bb)](_0x1aba1e)?(_0x538c02=0x0,_0x1aba1e['forEach'](function(_0x217c0d){var _0x370008=_0x329549;if(_0x35e5d5++,_0xff2c16['autoExpandPropertyCount']++,_0x35e5d5>_0x5a7da1){_0x1ffcee=!0x0;return;}if(!_0xff2c16['isExpressionToEvaluate']&&_0xff2c16[_0x370008(0x1cf)]&&_0xff2c16[_0x370008(0x166)]>_0xff2c16[_0x370008(0x1db)]){_0x1ffcee=!0x0;return;}_0xfc754f['push'](_0x7425d4[_0x370008(0x187)](_0x1c51b1,_0x1aba1e,'Set',_0x538c02++,_0xff2c16,function(_0x18e4eb){return function(){return _0x18e4eb;};}(_0x217c0d)));})):this['_isMap'](_0x1aba1e)&&_0x1aba1e[_0x329549(0x225)](function(_0x19d0a3,_0x4b4b01){var _0x2f69de=_0x329549;if(_0x35e5d5++,_0xff2c16[_0x2f69de(0x166)]++,_0x35e5d5>_0x5a7da1){_0x1ffcee=!0x0;return;}if(!_0xff2c16[_0x2f69de(0x1a9)]&&_0xff2c16[_0x2f69de(0x1cf)]&&_0xff2c16[_0x2f69de(0x166)]>_0xff2c16[_0x2f69de(0x1db)]){_0x1ffcee=!0x0;return;}var _0x52588f=_0x4b4b01[_0x2f69de(0x219)]();_0x52588f[_0x2f69de(0x1c9)]>0x64&&(_0x52588f=_0x52588f['slice'](0x0,0x64)+_0x2f69de(0x21f)),_0xfc754f[_0x2f69de(0x1fa)](_0x7425d4['_addProperty'](_0x1c51b1,_0x1aba1e,_0x2f69de(0x186),_0x52588f,_0xff2c16,function(_0x5f25d4){return function(){return _0x5f25d4;};}(_0x19d0a3)));}),!_0x30d1ab){try{for(_0x2d4bb9 in _0x1aba1e)if(!(_0x174d90&&_0x3637b8['test'](_0x2d4bb9))&&!this[_0x329549(0x19f)](_0x1aba1e,_0x2d4bb9,_0xff2c16)){if(_0x35e5d5++,_0xff2c16[_0x329549(0x166)]++,_0x35e5d5>_0x5a7da1){_0x1ffcee=!0x0;break;}if(!_0xff2c16[_0x329549(0x1a9)]&&_0xff2c16[_0x329549(0x1cf)]&&_0xff2c16[_0x329549(0x166)]>_0xff2c16[_0x329549(0x1db)]){_0x1ffcee=!0x0;break;}_0xfc754f[_0x329549(0x1fa)](_0x7425d4[_0x329549(0x1e0)](_0x1c51b1,_0x2e7883,_0x1aba1e,_0x2811b0,_0x2d4bb9,_0xff2c16));}}catch{}if(_0x2e7883['_p_length']=!0x0,_0x2c6704&&(_0x2e7883['_p_name']=!0x0),!_0x1ffcee){var _0x3318ad=[][_0x329549(0x18c)](this[_0x329549(0x200)](_0x1aba1e))[_0x329549(0x18c)](this[_0x329549(0x1b4)](_0x1aba1e));for(_0x538c02=0x0,_0x31e434=_0x3318ad[_0x329549(0x1c9)];_0x538c02<_0x31e434;_0x538c02++)if(_0x2d4bb9=_0x3318ad[_0x538c02],!(_0x174d90&&_0x3637b8['test'](_0x2d4bb9['toString']()))&&!this['_blacklistedProperty'](_0x1aba1e,_0x2d4bb9,_0xff2c16)&&!_0x2e7883['_p_'+_0x2d4bb9[_0x329549(0x219)]()]){if(_0x35e5d5++,_0xff2c16['autoExpandPropertyCount']++,_0x35e5d5>_0x5a7da1){_0x1ffcee=!0x0;break;}if(!_0xff2c16[_0x329549(0x1a9)]&&_0xff2c16['autoExpand']&&_0xff2c16[_0x329549(0x166)]>_0xff2c16['autoExpandLimit']){_0x1ffcee=!0x0;break;}_0xfc754f['push'](_0x7425d4['_addObjectProperty'](_0x1c51b1,_0x2e7883,_0x1aba1e,_0x2811b0,_0x2d4bb9,_0xff2c16));}}}}}if(_0x1a9b73[_0x329549(0x1a2)]=_0x2811b0,_0x5e1127?(_0x1a9b73['value']=_0x1aba1e[_0x329549(0x246)](),this['_capIfString'](_0x2811b0,_0x1a9b73,_0xff2c16,_0x1ab912)):_0x2811b0===_0x329549(0x242)?_0x1a9b73[_0x329549(0x1dd)]=this[_0x329549(0x18b)][_0x329549(0x17b)](_0x1aba1e):_0x2811b0===_0x329549(0x176)?_0x1a9b73['value']=_0x1aba1e['toString']():_0x2811b0===_0x329549(0x16d)?_0x1a9b73[_0x329549(0x1dd)]=this[_0x329549(0x169)][_0x329549(0x17b)](_0x1aba1e):_0x2811b0===_0x329549(0x1e6)&&this[_0x329549(0x1c4)]?_0x1a9b73[_0x329549(0x1dd)]=this['_Symbol'][_0x329549(0x1d5)][_0x329549(0x219)][_0x329549(0x17b)](_0x1aba1e):!_0xff2c16['depth']&&!(_0x2811b0===_0x329549(0x23c)||_0x2811b0==='undefined')&&(delete _0x1a9b73[_0x329549(0x1dd)],_0x1a9b73[_0x329549(0x220)]=!0x0),_0x1ffcee&&(_0x1a9b73[_0x329549(0x19c)]=!0x0),_0x2e84c4=_0xff2c16[_0x329549(0x1f6)][_0x329549(0x15f)],_0xff2c16[_0x329549(0x1f6)][_0x329549(0x15f)]=_0x1a9b73,this['_treeNodePropertiesBeforeFullValue'](_0x1a9b73,_0xff2c16),_0xfc754f[_0x329549(0x1c9)]){for(_0x538c02=0x0,_0x31e434=_0xfc754f['length'];_0x538c02<_0x31e434;_0x538c02++)_0xfc754f[_0x538c02](_0x538c02);}_0x1c51b1[_0x329549(0x1c9)]&&(_0x1a9b73['props']=_0x1c51b1);}catch(_0x5d3cdc){_0x2a1850(_0x5d3cdc,_0x1a9b73,_0xff2c16);}this[_0x329549(0x1ee)](_0x1aba1e,_0x1a9b73),this['_treeNodePropertiesAfterFullValue'](_0x1a9b73,_0xff2c16),_0xff2c16[_0x329549(0x1f6)]['current']=_0x2e84c4,_0xff2c16[_0x329549(0x17a)]--,_0xff2c16['autoExpand']=_0x379e99,_0xff2c16['autoExpand']&&_0xff2c16[_0x329549(0x171)][_0x329549(0x19b)]();}finally{_0x26c7fd&&(_0x28f63b[_0x329549(0x1fc)]['error']=_0x26c7fd);}return _0x1a9b73;}['_getOwnPropertySymbols'](_0x597606){var _0x3c4d38=_0x15cef3;return Object[_0x3c4d38(0x216)]?Object[_0x3c4d38(0x216)](_0x597606):[];}['_isSet'](_0xeadd67){var _0x23702c=_0x15cef3;return!!(_0xeadd67&&_0x28f63b[_0x23702c(0x1fe)]&&this['_objectToString'](_0xeadd67)===_0x23702c(0x1c5)&&_0xeadd67[_0x23702c(0x225)]);}[_0x15cef3(0x19f)](_0x55d5ff,_0xb3e346,_0x9bbb5e){var _0x4b2ff9=_0x15cef3;return _0x9bbb5e[_0x4b2ff9(0x21c)]?typeof _0x55d5ff[_0xb3e346]==_0x4b2ff9(0x1dc):!0x1;}[_0x15cef3(0x223)](_0x195636){var _0x241830=_0x15cef3,_0x180954='';return _0x180954=typeof _0x195636,_0x180954===_0x241830(0x1f2)?this[_0x241830(0x22d)](_0x195636)===_0x241830(0x1e1)?_0x180954=_0x241830(0x245):this[_0x241830(0x22d)](_0x195636)===_0x241830(0x243)?_0x180954=_0x241830(0x242):this['_objectToString'](_0x195636)===_0x241830(0x1ce)?_0x180954=_0x241830(0x176):_0x195636===null?_0x180954=_0x241830(0x23c):_0x195636[_0x241830(0x157)]&&(_0x180954=_0x195636[_0x241830(0x157)][_0x241830(0x1bd)]||_0x180954):_0x180954===_0x241830(0x1e3)&&this['_HTMLAllCollection']&&_0x195636 instanceof this['_HTMLAllCollection']&&(_0x180954='HTMLAllCollection'),_0x180954;}[_0x15cef3(0x22d)](_0x3a9af4){var _0x573d89=_0x15cef3;return Object[_0x573d89(0x1d5)][_0x573d89(0x219)]['call'](_0x3a9af4);}[_0x15cef3(0x1e8)](_0x5a0a29){var _0x69d3c0=_0x15cef3;return _0x5a0a29===_0x69d3c0(0x15e)||_0x5a0a29===_0x69d3c0(0x23b)||_0x5a0a29===_0x69d3c0(0x17f);}[_0x15cef3(0x1e5)](_0x1f8625){var _0x4485f9=_0x15cef3;return _0x1f8625===_0x4485f9(0x175)||_0x1f8625===_0x4485f9(0x204)||_0x1f8625==='Number';}[_0x15cef3(0x187)](_0x1937e0,_0x39f1ad,_0x39ec83,_0x2babe9,_0x15f176,_0x4880e6){var _0x1258c1=this;return function(_0x470b96){var _0x1059e2=_0x236f,_0x5ceec8=_0x15f176[_0x1059e2(0x1f6)][_0x1059e2(0x15f)],_0x274854=_0x15f176[_0x1059e2(0x1f6)][_0x1059e2(0x234)],_0x2c8870=_0x15f176[_0x1059e2(0x1f6)][_0x1059e2(0x212)];_0x15f176[_0x1059e2(0x1f6)][_0x1059e2(0x212)]=_0x5ceec8,_0x15f176['node'][_0x1059e2(0x234)]=typeof _0x2babe9==_0x1059e2(0x17f)?_0x2babe9:_0x470b96,_0x1937e0['push'](_0x1258c1[_0x1059e2(0x1a1)](_0x39f1ad,_0x39ec83,_0x2babe9,_0x15f176,_0x4880e6)),_0x15f176[_0x1059e2(0x1f6)][_0x1059e2(0x212)]=_0x2c8870,_0x15f176[_0x1059e2(0x1f6)][_0x1059e2(0x234)]=_0x274854;};}[_0x15cef3(0x1e0)](_0x5b2289,_0x92a225,_0x15e9e9,_0xd5b77c,_0x46f6b7,_0x2117b4,_0x5ed595){var _0x4ef133=_0x15cef3,_0x4b82b0=this;return _0x92a225[_0x4ef133(0x1f0)+_0x46f6b7[_0x4ef133(0x219)]()]=!0x0,function(_0x2c5cff){var _0x55f213=_0x4ef133,_0x27fb00=_0x2117b4[_0x55f213(0x1f6)]['current'],_0x46fe6c=_0x2117b4['node'][_0x55f213(0x234)],_0x24e412=_0x2117b4['node'][_0x55f213(0x212)];_0x2117b4[_0x55f213(0x1f6)][_0x55f213(0x212)]=_0x27fb00,_0x2117b4[_0x55f213(0x1f6)][_0x55f213(0x234)]=_0x2c5cff,_0x5b2289[_0x55f213(0x1fa)](_0x4b82b0['_property'](_0x15e9e9,_0xd5b77c,_0x46f6b7,_0x2117b4,_0x5ed595)),_0x2117b4[_0x55f213(0x1f6)]['parent']=_0x24e412,_0x2117b4[_0x55f213(0x1f6)][_0x55f213(0x234)]=_0x46fe6c;};}[_0x15cef3(0x1a1)](_0x15db7a,_0x6cefd,_0x518a7e,_0x343bad,_0x5249b2){var _0x42a44d=_0x15cef3,_0x4c3fc8=this;_0x5249b2||(_0x5249b2=function(_0x546745,_0x18bc32){return _0x546745[_0x18bc32];});var _0x308830=_0x518a7e[_0x42a44d(0x219)](),_0x5c2601=_0x343bad[_0x42a44d(0x158)]||{},_0x3e0b73=_0x343bad[_0x42a44d(0x218)],_0x244516=_0x343bad['isExpressionToEvaluate'];try{var _0x574aa7=this[_0x42a44d(0x1f3)](_0x15db7a),_0x26a011=_0x308830;_0x574aa7&&_0x26a011[0x0]==='\\x27'&&(_0x26a011=_0x26a011['substr'](0x1,_0x26a011[_0x42a44d(0x1c9)]-0x2));var _0x156f08=_0x343bad[_0x42a44d(0x158)]=_0x5c2601[_0x42a44d(0x1f0)+_0x26a011];_0x156f08&&(_0x343bad[_0x42a44d(0x218)]=_0x343bad[_0x42a44d(0x218)]+0x1),_0x343bad[_0x42a44d(0x1a9)]=!!_0x156f08;var _0x5e023f=typeof _0x518a7e=='symbol',_0xc9e558={'name':_0x5e023f||_0x574aa7?_0x308830:this[_0x42a44d(0x1b0)](_0x308830)};if(_0x5e023f&&(_0xc9e558['symbol']=!0x0),!(_0x6cefd===_0x42a44d(0x245)||_0x6cefd==='Error')){var _0x5128b6=this[_0x42a44d(0x161)](_0x15db7a,_0x518a7e);if(_0x5128b6&&(_0x5128b6[_0x42a44d(0x1fd)]&&(_0xc9e558[_0x42a44d(0x240)]=!0x0),_0x5128b6['get']&&!_0x156f08&&!_0x343bad['resolveGetters']))return _0xc9e558[_0x42a44d(0x1c8)]=!0x0,this[_0x42a44d(0x181)](_0xc9e558,_0x343bad),_0xc9e558;}var _0x1aec60;try{_0x1aec60=_0x5249b2(_0x15db7a,_0x518a7e);}catch(_0x24628d){return _0xc9e558={'name':_0x308830,'type':_0x42a44d(0x156),'error':_0x24628d['message']},this[_0x42a44d(0x181)](_0xc9e558,_0x343bad),_0xc9e558;}var _0x9b346b=this[_0x42a44d(0x223)](_0x1aec60),_0x32736d=this['_isPrimitiveType'](_0x9b346b);if(_0xc9e558[_0x42a44d(0x1a2)]=_0x9b346b,_0x32736d)this[_0x42a44d(0x181)](_0xc9e558,_0x343bad,_0x1aec60,function(){var _0x3ff336=_0x42a44d;_0xc9e558[_0x3ff336(0x1dd)]=_0x1aec60['valueOf'](),!_0x156f08&&_0x4c3fc8[_0x3ff336(0x1cd)](_0x9b346b,_0xc9e558,_0x343bad,{});});else{var _0x232505=_0x343bad[_0x42a44d(0x1cf)]&&_0x343bad['level']<_0x343bad['autoExpandMaxDepth']&&_0x343bad['autoExpandPreviousObjects']['indexOf'](_0x1aec60)<0x0&&_0x9b346b!==_0x42a44d(0x1dc)&&_0x343bad[_0x42a44d(0x166)]<_0x343bad[_0x42a44d(0x1db)];_0x232505||_0x343bad['level']<_0x3e0b73||_0x156f08?(this[_0x42a44d(0x1bf)](_0xc9e558,_0x1aec60,_0x343bad,_0x156f08||{}),this[_0x42a44d(0x1ee)](_0x1aec60,_0xc9e558)):this[_0x42a44d(0x181)](_0xc9e558,_0x343bad,_0x1aec60,function(){var _0x185e27=_0x42a44d;_0x9b346b==='null'||_0x9b346b===_0x185e27(0x1e3)||(delete _0xc9e558['value'],_0xc9e558[_0x185e27(0x220)]=!0x0);});}return _0xc9e558;}finally{_0x343bad[_0x42a44d(0x158)]=_0x5c2601,_0x343bad[_0x42a44d(0x218)]=_0x3e0b73,_0x343bad[_0x42a44d(0x1a9)]=_0x244516;}}[_0x15cef3(0x1cd)](_0x5e4560,_0x3d3b29,_0x2c1593,_0x3fa817){var _0x2e5ebd=_0x15cef3,_0x158835=_0x3fa817[_0x2e5ebd(0x184)]||_0x2c1593[_0x2e5ebd(0x184)];if((_0x5e4560===_0x2e5ebd(0x23b)||_0x5e4560==='String')&&_0x3d3b29[_0x2e5ebd(0x1dd)]){let _0x5a296c=_0x3d3b29[_0x2e5ebd(0x1dd)][_0x2e5ebd(0x1c9)];_0x2c1593[_0x2e5ebd(0x214)]+=_0x5a296c,_0x2c1593[_0x2e5ebd(0x214)]>_0x2c1593['totalStrLength']?(_0x3d3b29['capped']='',delete _0x3d3b29[_0x2e5ebd(0x1dd)]):_0x5a296c>_0x158835&&(_0x3d3b29[_0x2e5ebd(0x220)]=_0x3d3b29[_0x2e5ebd(0x1dd)][_0x2e5ebd(0x210)](0x0,_0x158835),delete _0x3d3b29[_0x2e5ebd(0x1dd)]);}}[_0x15cef3(0x1f3)](_0x493b3a){var _0x32c2b1=_0x15cef3;return!!(_0x493b3a&&_0x28f63b[_0x32c2b1(0x186)]&&this['_objectToString'](_0x493b3a)==='[object\\x20Map]'&&_0x493b3a[_0x32c2b1(0x225)]);}[_0x15cef3(0x1b0)](_0x334889){var _0x11b41e=_0x15cef3;if(_0x334889[_0x11b41e(0x1c2)](/^\\d+$/))return _0x334889;var _0xe0209c;try{_0xe0209c=JSON[_0x11b41e(0x20d)](''+_0x334889);}catch{_0xe0209c='\\x22'+this[_0x11b41e(0x22d)](_0x334889)+'\\x22';}return _0xe0209c[_0x11b41e(0x1c2)](/^\"([a-zA-Z_][a-zA-Z_0-9]*)\"$/)?_0xe0209c=_0xe0209c[_0x11b41e(0x210)](0x1,_0xe0209c[_0x11b41e(0x1c9)]-0x2):_0xe0209c=_0xe0209c[_0x11b41e(0x1ca)](/'/g,'\\x5c\\x27')['replace'](/\\\\\"/g,'\\x22')[_0x11b41e(0x1ca)](/(^\"|\"$)/g,'\\x27'),_0xe0209c;}[_0x15cef3(0x181)](_0x277901,_0x3e796f,_0x5e488a,_0x423638){var _0x5c56fa=_0x15cef3;this[_0x5c56fa(0x21b)](_0x277901,_0x3e796f),_0x423638&&_0x423638(),this[_0x5c56fa(0x1ee)](_0x5e488a,_0x277901),this[_0x5c56fa(0x1e7)](_0x277901,_0x3e796f);}[_0x15cef3(0x21b)](_0x53cdeb,_0xf96bc){var _0xec78a2=_0x15cef3;this[_0xec78a2(0x211)](_0x53cdeb,_0xf96bc),this['_setNodeQueryPath'](_0x53cdeb,_0xf96bc),this[_0xec78a2(0x247)](_0x53cdeb,_0xf96bc),this[_0xec78a2(0x18a)](_0x53cdeb,_0xf96bc);}[_0x15cef3(0x211)](_0x54598a,_0x540a42){}[_0x15cef3(0x208)](_0x1c3f9d,_0x28f681){}['_setNodeLabel'](_0x191575,_0x57f531){}[_0x15cef3(0x193)](_0x57a1fe){var _0xf8b2e8=_0x15cef3;return _0x57a1fe===this[_0xf8b2e8(0x1af)];}[_0x15cef3(0x1e7)](_0x4c98b5,_0x4c9ff5){var _0x5ea3f0=_0x15cef3;this[_0x5ea3f0(0x1f5)](_0x4c98b5,_0x4c9ff5),this['_setNodeExpandableState'](_0x4c98b5),_0x4c9ff5[_0x5ea3f0(0x202)]&&this['_sortProps'](_0x4c98b5),this[_0x5ea3f0(0x24a)](_0x4c98b5,_0x4c9ff5),this[_0x5ea3f0(0x1a8)](_0x4c98b5,_0x4c9ff5),this[_0x5ea3f0(0x168)](_0x4c98b5);}[_0x15cef3(0x1ee)](_0x2c8500,_0x280142){var _0x3e89a1=_0x15cef3;try{_0x2c8500&&typeof _0x2c8500[_0x3e89a1(0x1c9)]==_0x3e89a1(0x17f)&&(_0x280142[_0x3e89a1(0x1c9)]=_0x2c8500[_0x3e89a1(0x1c9)]);}catch{}if(_0x280142['type']===_0x3e89a1(0x17f)||_0x280142[_0x3e89a1(0x1a2)]===_0x3e89a1(0x205)){if(isNaN(_0x280142[_0x3e89a1(0x1dd)]))_0x280142['nan']=!0x0,delete _0x280142[_0x3e89a1(0x1dd)];else switch(_0x280142['value']){case Number[_0x3e89a1(0x16f)]:_0x280142[_0x3e89a1(0x1ab)]=!0x0,delete _0x280142[_0x3e89a1(0x1dd)];break;case Number[_0x3e89a1(0x198)]:_0x280142[_0x3e89a1(0x215)]=!0x0,delete _0x280142[_0x3e89a1(0x1dd)];break;case 0x0:this[_0x3e89a1(0x228)](_0x280142[_0x3e89a1(0x1dd)])&&(_0x280142[_0x3e89a1(0x20a)]=!0x0);break;}}else _0x280142['type']===_0x3e89a1(0x1dc)&&typeof _0x2c8500['name']=='string'&&_0x2c8500['name']&&_0x280142[_0x3e89a1(0x1bd)]&&_0x2c8500['name']!==_0x280142['name']&&(_0x280142[_0x3e89a1(0x249)]=_0x2c8500[_0x3e89a1(0x1bd)]);}[_0x15cef3(0x228)](_0x237f20){var _0x32ca6e=_0x15cef3;return 0x1/_0x237f20===Number[_0x32ca6e(0x198)];}[_0x15cef3(0x22b)](_0x4284a6){var _0xb16708=_0x15cef3;!_0x4284a6[_0xb16708(0x192)]||!_0x4284a6[_0xb16708(0x192)]['length']||_0x4284a6[_0xb16708(0x1a2)]==='array'||_0x4284a6[_0xb16708(0x1a2)]===_0xb16708(0x186)||_0x4284a6[_0xb16708(0x1a2)]==='Set'||_0x4284a6[_0xb16708(0x192)][_0xb16708(0x167)](function(_0x6f925a,_0x689b3b){var _0x5e6d16=_0xb16708,_0x4fcc15=_0x6f925a[_0x5e6d16(0x1bd)][_0x5e6d16(0x1d9)](),_0x32a093=_0x689b3b['name'][_0x5e6d16(0x1d9)]();return _0x4fcc15<_0x32a093?-0x1:_0x4fcc15>_0x32a093?0x1:0x0;});}['_addFunctionsNode'](_0x326f95,_0x16b3a4){var _0x1296b0=_0x15cef3;if(!(_0x16b3a4[_0x1296b0(0x21c)]||!_0x326f95['props']||!_0x326f95[_0x1296b0(0x192)]['length'])){for(var _0x1f6259=[],_0x493ac1=[],_0xad2459=0x0,_0x191ebf=_0x326f95[_0x1296b0(0x192)]['length'];_0xad2459<_0x191ebf;_0xad2459++){var _0x16d15d=_0x326f95['props'][_0xad2459];_0x16d15d[_0x1296b0(0x1a2)]===_0x1296b0(0x1dc)?_0x1f6259[_0x1296b0(0x1fa)](_0x16d15d):_0x493ac1['push'](_0x16d15d);}if(!(!_0x493ac1[_0x1296b0(0x1c9)]||_0x1f6259[_0x1296b0(0x1c9)]<=0x1)){_0x326f95[_0x1296b0(0x192)]=_0x493ac1;var _0x41653f={'functionsNode':!0x0,'props':_0x1f6259};this[_0x1296b0(0x211)](_0x41653f,_0x16b3a4),this['_setNodeLabel'](_0x41653f,_0x16b3a4),this['_setNodeExpandableState'](_0x41653f),this[_0x1296b0(0x18a)](_0x41653f,_0x16b3a4),_0x41653f['id']+='\\x20f',_0x326f95[_0x1296b0(0x192)][_0x1296b0(0x239)](_0x41653f);}}}[_0x15cef3(0x1a8)](_0x53af1b,_0xd8d429){}['_setNodeExpandableState'](_0x421130){}[_0x15cef3(0x22c)](_0x335f98){var _0xa3d454=_0x15cef3;return Array['isArray'](_0x335f98)||typeof _0x335f98==_0xa3d454(0x1f2)&&this['_objectToString'](_0x335f98)==='[object\\x20Array]';}[_0x15cef3(0x18a)](_0x24acb7,_0x45eec0){}[_0x15cef3(0x168)](_0xaa77f){delete _0xaa77f['_hasSymbolPropertyOnItsPath'],delete _0xaa77f['_hasSetOnItsPath'],delete _0xaa77f['_hasMapOnItsPath'];}[_0x15cef3(0x247)](_0x182e2c,_0x1db24d){}}let _0x377684=new _0x3166fc(),_0x3bffef={'props':0x64,'elements':0x64,'strLength':0x400*0x32,'totalStrLength':0x400*0x32,'autoExpandLimit':0x1388,'autoExpandMaxDepth':0xa},_0x3660d9={'props':0x5,'elements':0x5,'strLength':0x100,'totalStrLength':0x100*0x3,'autoExpandLimit':0x1e,'autoExpandMaxDepth':0x2};function _0x1b7441(_0x2bd81f,_0x59c789,_0x151fff,_0x187fcf,_0x506382,_0x444e0d){var _0x6a46c0=_0x15cef3;let _0x1b1e2d,_0x23a656;try{_0x23a656=_0x520bc9(),_0x1b1e2d=_0x43e2ce[_0x59c789],!_0x1b1e2d||_0x23a656-_0x1b1e2d['ts']>0x1f4&&_0x1b1e2d[_0x6a46c0(0x1f1)]&&_0x1b1e2d[_0x6a46c0(0x16a)]/_0x1b1e2d[_0x6a46c0(0x1f1)]<0x64?(_0x43e2ce[_0x59c789]=_0x1b1e2d={'count':0x0,'time':0x0,'ts':_0x23a656},_0x43e2ce['hits']={}):_0x23a656-_0x43e2ce[_0x6a46c0(0x236)]['ts']>0x32&&_0x43e2ce[_0x6a46c0(0x236)][_0x6a46c0(0x1f1)]&&_0x43e2ce['hits'][_0x6a46c0(0x16a)]/_0x43e2ce[_0x6a46c0(0x236)][_0x6a46c0(0x1f1)]<0x64&&(_0x43e2ce[_0x6a46c0(0x236)]={});let _0x4660da=[],_0x341128=_0x1b1e2d['reduceLimits']||_0x43e2ce['hits'][_0x6a46c0(0x15b)]?_0x3660d9:_0x3bffef,_0x4fbda2=_0x258e84=>{var _0x4d1b84=_0x6a46c0;let _0x29fa20={};return _0x29fa20[_0x4d1b84(0x192)]=_0x258e84['props'],_0x29fa20['elements']=_0x258e84[_0x4d1b84(0x1a7)],_0x29fa20[_0x4d1b84(0x184)]=_0x258e84[_0x4d1b84(0x184)],_0x29fa20[_0x4d1b84(0x20b)]=_0x258e84['totalStrLength'],_0x29fa20['autoExpandLimit']=_0x258e84[_0x4d1b84(0x1db)],_0x29fa20[_0x4d1b84(0x213)]=_0x258e84[_0x4d1b84(0x213)],_0x29fa20[_0x4d1b84(0x202)]=!0x1,_0x29fa20[_0x4d1b84(0x21c)]=!_0x1909a0,_0x29fa20[_0x4d1b84(0x218)]=0x1,_0x29fa20[_0x4d1b84(0x17a)]=0x0,_0x29fa20['expId']=_0x4d1b84(0x18e),_0x29fa20[_0x4d1b84(0x185)]=_0x4d1b84(0x1d2),_0x29fa20[_0x4d1b84(0x1cf)]=!0x0,_0x29fa20[_0x4d1b84(0x171)]=[],_0x29fa20[_0x4d1b84(0x166)]=0x0,_0x29fa20[_0x4d1b84(0x1d6)]=!0x0,_0x29fa20['allStrLength']=0x0,_0x29fa20[_0x4d1b84(0x1f6)]={'current':void 0x0,'parent':void 0x0,'index':0x0},_0x29fa20;};for(var _0x437bdb=0x0;_0x437bdb<_0x506382[_0x6a46c0(0x1c9)];_0x437bdb++)_0x4660da[_0x6a46c0(0x1fa)](_0x377684['serialize']({'timeNode':_0x2bd81f==='time'||void 0x0},_0x506382[_0x437bdb],_0x4fbda2(_0x341128),{}));if(_0x2bd81f===_0x6a46c0(0x1ad)||_0x2bd81f===_0x6a46c0(0x177)){let _0x50c306=Error[_0x6a46c0(0x15c)];try{Error['stackTraceLimit']=0x1/0x0,_0x4660da['push'](_0x377684['serialize']({'stackNode':!0x0},new Error()[_0x6a46c0(0x197)],_0x4fbda2(_0x341128),{'strLength':0x1/0x0}));}finally{Error[_0x6a46c0(0x15c)]=_0x50c306;}}return{'method':_0x6a46c0(0x21d),'version':_0x362e8e,'args':[{'ts':_0x151fff,'session':_0x187fcf,'args':_0x4660da,'id':_0x59c789,'context':_0x444e0d}]};}catch(_0x2622f5){return{'method':'log','version':_0x362e8e,'args':[{'ts':_0x151fff,'session':_0x187fcf,'args':[{'type':'unknown','error':_0x2622f5&&_0x2622f5[_0x6a46c0(0x21e)]}],'id':_0x59c789,'context':_0x444e0d}]};}finally{try{if(_0x1b1e2d&&_0x23a656){let _0x44283c=_0x520bc9();_0x1b1e2d['count']++,_0x1b1e2d[_0x6a46c0(0x16a)]+=_0x4d1154(_0x23a656,_0x44283c),_0x1b1e2d['ts']=_0x44283c,_0x43e2ce['hits'][_0x6a46c0(0x1f1)]++,_0x43e2ce[_0x6a46c0(0x236)][_0x6a46c0(0x16a)]+=_0x4d1154(_0x23a656,_0x44283c),_0x43e2ce[_0x6a46c0(0x236)]['ts']=_0x44283c,(_0x1b1e2d[_0x6a46c0(0x1f1)]>0x32||_0x1b1e2d[_0x6a46c0(0x16a)]>0x64)&&(_0x1b1e2d[_0x6a46c0(0x15b)]=!0x0),(_0x43e2ce[_0x6a46c0(0x236)][_0x6a46c0(0x1f1)]>0x3e8||_0x43e2ce[_0x6a46c0(0x236)][_0x6a46c0(0x16a)]>0x12c)&&(_0x43e2ce[_0x6a46c0(0x236)]['reduceLimits']=!0x0);}}catch{}}}return _0x1b7441;}((_0x56eb00,_0x339e24,_0x2e27db,_0x256d4f,_0x233193,_0x1c2014,_0x36c889,_0xbebc1f,_0x333dc3,_0x5403e8,_0x259150)=>{var _0x3cb0f2=_0x423a64;if(_0x56eb00[_0x3cb0f2(0x206)])return _0x56eb00['_console_ninja'];if(!X(_0x56eb00,_0xbebc1f,_0x233193))return _0x56eb00[_0x3cb0f2(0x206)]={'consoleLog':()=>{},'consoleTrace':()=>{},'consoleTime':()=>{},'consoleTimeEnd':()=>{},'autoLog':()=>{},'autoLogMany':()=>{},'autoTraceMany':()=>{},'coverage':()=>{},'autoTrace':()=>{},'autoTime':()=>{},'autoTimeEnd':()=>{}},_0x56eb00['_console_ninja'];let _0x27e621=B(_0x56eb00),_0x160e36=_0x27e621[_0x3cb0f2(0x1da)],_0xd0de51=_0x27e621[_0x3cb0f2(0x1de)],_0x144de1=_0x27e621[_0x3cb0f2(0x1b8)],_0x5e7817={'hits':{},'ts':{}},_0x1fc706=J(_0x56eb00,_0x333dc3,_0x5e7817,_0x1c2014),_0x585042=_0x1db09d=>{_0x5e7817['ts'][_0x1db09d]=_0xd0de51();},_0x6da14b=(_0x32df41,_0x173823)=>{var _0x3e6019=_0x3cb0f2;let _0x4288d0=_0x5e7817['ts'][_0x173823];if(delete _0x5e7817['ts'][_0x173823],_0x4288d0){let _0x40e637=_0x160e36(_0x4288d0,_0xd0de51());_0x254078(_0x1fc706(_0x3e6019(0x16a),_0x32df41,_0x144de1(),_0x200311,[_0x40e637],_0x173823));}},_0x570990=_0x3970d6=>{var _0x50a3cf=_0x3cb0f2,_0x4bcd49;return _0x233193==='next.js'&&_0x56eb00[_0x50a3cf(0x199)]&&((_0x4bcd49=_0x3970d6==null?void 0x0:_0x3970d6[_0x50a3cf(0x1fb)])==null?void 0x0:_0x4bcd49[_0x50a3cf(0x1c9)])&&(_0x3970d6[_0x50a3cf(0x1fb)][0x0][_0x50a3cf(0x199)]=_0x56eb00[_0x50a3cf(0x199)]),_0x3970d6;};_0x56eb00[_0x3cb0f2(0x206)]={'consoleLog':(_0x334bfc,_0x134aef)=>{var _0xc0a4eb=_0x3cb0f2;_0x56eb00[_0xc0a4eb(0x1fc)]['log'][_0xc0a4eb(0x1bd)]!==_0xc0a4eb(0x244)&&_0x254078(_0x1fc706('log',_0x334bfc,_0x144de1(),_0x200311,_0x134aef));},'consoleTrace':(_0x56240b,_0x16f88a)=>{var _0x4947f4=_0x3cb0f2,_0x59dd7a,_0x2c365e;_0x56eb00[_0x4947f4(0x1fc)]['log'][_0x4947f4(0x1bd)]!=='disabledTrace'&&((_0x2c365e=(_0x59dd7a=_0x56eb00[_0x4947f4(0x1b5)])==null?void 0x0:_0x59dd7a[_0x4947f4(0x17d)])!=null&&_0x2c365e['node']&&(_0x56eb00[_0x4947f4(0x20c)]=!0x0),_0x254078(_0x570990(_0x1fc706(_0x4947f4(0x1ad),_0x56240b,_0x144de1(),_0x200311,_0x16f88a))));},'consoleError':(_0x23b14c,_0x583227)=>{var _0x16c6a2=_0x3cb0f2;_0x56eb00[_0x16c6a2(0x20c)]=!0x0,_0x254078(_0x570990(_0x1fc706('error',_0x23b14c,_0x144de1(),_0x200311,_0x583227)));},'consoleTime':_0x51e4da=>{_0x585042(_0x51e4da);},'consoleTimeEnd':(_0x7b95c5,_0x4ed5a2)=>{_0x6da14b(_0x4ed5a2,_0x7b95c5);},'autoLog':(_0x4e7684,_0x9a84f0)=>{var _0x5c4397=_0x3cb0f2;_0x254078(_0x1fc706(_0x5c4397(0x21d),_0x9a84f0,_0x144de1(),_0x200311,[_0x4e7684]));},'autoLogMany':(_0xc47362,_0x45a91c)=>{var _0x29a3d0=_0x3cb0f2;_0x254078(_0x1fc706(_0x29a3d0(0x21d),_0xc47362,_0x144de1(),_0x200311,_0x45a91c));},'autoTrace':(_0x5cf247,_0x51a8c4)=>{var _0x4ccfa1=_0x3cb0f2;_0x254078(_0x570990(_0x1fc706(_0x4ccfa1(0x1ad),_0x51a8c4,_0x144de1(),_0x200311,[_0x5cf247])));},'autoTraceMany':(_0x113e25,_0x508d86)=>{var _0x2ff1a5=_0x3cb0f2;_0x254078(_0x570990(_0x1fc706(_0x2ff1a5(0x1ad),_0x113e25,_0x144de1(),_0x200311,_0x508d86)));},'autoTime':(_0x2a3a46,_0x47d574,_0x166620)=>{_0x585042(_0x166620);},'autoTimeEnd':(_0x4a5100,_0x159ffc,_0x30c519)=>{_0x6da14b(_0x159ffc,_0x30c519);},'coverage':_0x358f07=>{var _0xe83d3=_0x3cb0f2;_0x254078({'method':_0xe83d3(0x179),'version':_0x1c2014,'args':[{'id':_0x358f07}]});}};let _0x254078=H(_0x56eb00,_0x339e24,_0x2e27db,_0x256d4f,_0x233193,_0x5403e8,_0x259150),_0x200311=_0x56eb00['_console_ninja_session'];return _0x56eb00['_console_ninja'];})(globalThis,'127.0.0.1',_0x423a64(0x1e9),_0x423a64(0x182),_0x423a64(0x188),_0x423a64(0x227),_0x423a64(0x23d),_0x423a64(0x1ed),'',_0x423a64(0x160),'1');function _0x2d4b(){var _0x11f2f2=['_setNodeQueryPath','astro','negativeZero','totalStrLength','_ninjaIgnoreNextError','stringify','global','onclose','substr','_setNodeId','parent','autoExpandMaxDepth','allStrLength','negativeInfinity','getOwnPropertySymbols','345860fKAslo','depth','toString','_inNextEdge','_treeNodePropertiesBeforeFullValue','noFunctions','log','message','...','capped','Console\\x20Ninja\\x20failed\\x20to\\x20send\\x20logs,\\x20refreshing\\x20the\\x20page\\x20may\\x20help;\\x20also\\x20see\\x20','performance','_type','527544tfTCRY','forEach','_extendedWarning','1.0.0','_isNegativeZero','location','edge','_sortProps','_isArray','_objectToString','onopen','readyState','send','onerror','nodeModules','_attemptToReconnectShortly','index','bind','hits','perf_hooks','5103417cIDVPM','unshift','43487ShWBrr','string','null','1754383063658','logger\\x20failed\\x20to\\x20connect\\x20to\\x20host,\\x20see\\x20','includes','setter','hrtime','date','[object\\x20Date]','disabledLog','array','valueOf','_setNodeExpressionPath','create','funcName','_addFunctionsNode','_WebSocketClass','unknown','constructor','expressionsToEvaluate','_maxConnectAttemptCount','\\x20browser','reduceLimits','stackTraceLimit','_reconnectTimeout','boolean','current','','_getOwnPropertyDescriptor','some','_consoleNinjaAllowedToStart','https://tinyurl.com/37x8b79t','_connected','autoExpandPropertyCount','sort','_cleanNode','_regExpToString','time','11366658fQHtCM','data','RegExp','failed\\x20to\\x20find\\x20and\\x20load\\x20WebSocket','POSITIVE_INFINITY','fromCharCode','autoExpandPreviousObjects','next.js','5080470wazfqT','__es'+'Module','Boolean','bigint','error','logger\\x20websocket\\x20error','coverage','level','call','getPrototypeOf','versions','_quotedRegExp','number','_socket','_processTreeNodeResult',\"/Users/charles/.windsurf/extensions/wallabyjs.console-ninja-1.0.462-universal/node_modules\",'path','strLength','rootExpression','Map','_addProperty','vite','_keyStrRegExp','_setNodePermissions','_dateToString','concat','angular','root_exp_id','119gfHXZq','_webSocketErrorDocsLink','warn','props','_isUndefined','_connectToHostNow','%c\\x20Console\\x20Ninja\\x20extension\\x20is\\x20connected\\x20to\\x20','default','stack','NEGATIVE_INFINITY','origin','gateway.docker.internal','pop','cappedProps','\\x20server','_sendErrorMessage','_blacklistedProperty','then','_property','type','catch','close','_inBrowser','_allowedToSend','elements','_addLoadNode','isExpressionToEvaluate','reload','positiveInfinity','env','trace','Symbol','_undefined','_propertyName','port','pathToFileURL','HTMLAllCollection','_getOwnPropertySymbols','process','WebSocket','test','now','see\\x20https://tinyurl.com/2vt8jxzw\\x20for\\x20more\\x20info.','toUpperCase','_isSet','Console\\x20Ninja\\x20failed\\x20to\\x20send\\x20logs,\\x20restarting\\x20the\\x20process\\x20may\\x20help;\\x20also\\x20see\\x20','name','split','serialize','defineProperty','_disposeWebsocket','match','remix','_Symbol','[object\\x20Set]','NEXT_RUNTIME','endsWith','getter','length','replace','dockerizedApp','parse','_capIfString','[object\\x20BigInt]','autoExpand','startsWith','76djeXMw','root_exp','getWebSocketClass','getOwnPropertyDescriptor','prototype','resolveGetters','27132080MiILVl','_connectAttemptCount','toLowerCase','elapsed','autoExpandLimit','function','value','timeStamp','logger\\x20failed\\x20to\\x20connect\\x20to\\x20host','_addObjectProperty','[object\\x20Array]','charAt','undefined','_ws','_isPrimitiveWrapperType','symbol','_treeNodePropertiesAfterFullValue','_isPrimitiveType','57834','host','hostname','_WebSocket',[\"localhost\",\"127.0.0.1\",\"example.cypress.io\",\"Yifans-MacBook-Pro.local\",\"192.168.0.56\"],'_additionalMetadata','_connecting','_p_','count','object','_isMap','_console_ninja_session','_setNodeLabel','node','failed\\x20to\\x20connect\\x20to\\x20host:\\x20','map','unref','push','args','console','set','Set','20fUINOy','_getOwnPropertyNames','eventReceivedCallback','sortProps','slice','String','Number','_console_ninja','_allowedToConnectOnSend'];_0x2d4b=function(){return _0x11f2f2;};return _0x2d4b();}");}catch(e){}};/* istanbul ignore next */function oo_oo(i:string,...v:any[]){try{oo_cm().consoleLog(i, v);}catch(e){} return v};oo_oo;/* istanbul ignore next */function oo_tr(i:string,...v:any[]){try{oo_cm().consoleTrace(i, v);}catch(e){} return v};oo_tr;/* istanbul ignore next */function oo_tx(i:string,...v:any[]){try{oo_cm().consoleError(i, v);}catch(e){} return v};oo_tx;/* istanbul ignore next */function oo_ts(v?:string):string{try{oo_cm().consoleTime(v);}catch(e){} return v as string;};oo_ts;/* istanbul ignore next */function oo_te(v:string|undefined, i:string):string{try{oo_cm().consoleTimeEnd(v, i);}catch(e){} return v as string;};oo_te;/*eslint unicorn/no-abusive-eslint-disable:,eslint-comments/disable-enable-pair:,eslint-comments/no-unlimited-disable:,eslint-comments/no-aggregating-enable:,eslint-comments/no-duplicate-disable:,eslint-comments/no-unused-disable:,eslint-comments/no-unused-enable:,*/