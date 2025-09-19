import type { AdvisorMessage, AdvisorTone } from '@/components/ui/MonekoAdvisorMessage';
import type { GoalType } from '@/data/questionnaire-templates';
import { ComprehensiveFinancialProfile } from '@/types/financial-quiz-constants';

export class GoalAdvisorMessageGenerator {
  static getCategoryMessage(
    categoryId: string, 
    goalType: GoalType,
    answers: Partial<ComprehensiveFinancialProfile>
  ): AdvisorMessage | null {
    
    switch (categoryId) {
      case 'personal-information':
        return this.getPersonalInfoMessage(answers, goalType);
      
      case 'income-details':
        return this.getIncomeMessage(answers, goalType);
      
      case 'detailed-expenses':
        return this.getExpensesMessage(answers, goalType);
      
      case 'assets-and-savings':
        return this.getAssetsMessage(answers, goalType);
      
      case 'debts-and-liabilities':
        return this.getDebtsMessage(answers, goalType);
      
      case 'financial-goals':
        return this.getGoalsMessage(answers, goalType);
      
      case 'risk-profile-and-investment':
        return this.getRiskProfileMessage(answers, goalType);
      
      case 'financial-behavior':
        return this.getBehaviorMessage(answers, goalType);
      
      case 'goal-specific':
        return this.getGoalSpecificMessage(answers, goalType);
      
      default:
        return null;
    }
  }

  private static getPersonalInfoMessage(answers: Partial<ComprehensiveFinancialProfile>, goalType: GoalType): AdvisorMessage {
    const age = answers['current-age'] as number;
    const employmentStatus = answers['employment-status'] as string;
    
    if (age && age < 25) {
      return {
        message: `Starting your ${this.getGoalTypeDisplayName(goalType)} journey in your early twenties is incredibly wise! Time is your greatest asset, and you're already ahead of most people by taking action now.`,
        tone: 'congratulatory'
      };
    } else if (age && age >= 25 && age < 35) {
      return {
        message: `Perfect timing to focus on your ${this.getGoalTypeDisplayName(goalType)} goal! You're in a prime position to build substantial wealth with the right strategy and consistent effort.`,
        tone: 'encouraging'
      };
    } else if (age && age >= 35 && age < 50) {
      return {
        message: `Your experience and likely higher income in this stage of life can be powerful tools for achieving your ${this.getGoalTypeDisplayName(goalType)} goal. Let's make sure we're maximizing every opportunity!`,
        tone: 'motivational'
      };
    } else if (age && age >= 50) {
      return {
        message: `It's never too late to work towards your ${this.getGoalTypeDisplayName(goalType)} goal! With focused planning and the right approach, you can still make significant progress.`,
        tone: 'reassuring'
      };
    }

    if (employmentStatus === 'unemployed') {
      return {
        message: `I understand that being unemployed can make financial planning challenging. Let's create a realistic ${this.getGoalTypeDisplayName(goalType)} plan that considers your current situation and future prospects.`,
        tone: 'reassuring'
      };
    }

    return {
      message: `Great start! Having your basic information helps me understand your situation better. Let's dive deeper into your finances to create the perfect ${this.getGoalTypeDisplayName(goalType)} strategy.`,
      tone: 'encouraging'
    };
  }

  private static getIncomeMessage(answers: Partial<ComprehensiveFinancialProfile>, goalType: GoalType): AdvisorMessage {
    const monthlyIncome = answers['monthly-gross-income'] as number;
    const additionalIncome = answers['additional_income_sources'] as string[];
    
    if (monthlyIncome && monthlyIncome >= 10000) {
      return {
        message: `Excellent income level! With your strong earning power, you have great potential to accelerate your ${this.getGoalTypeDisplayName(goalType)} timeline. The key will be optimizing how much you can allocate toward this goal.`,
        tone: 'congratulatory'
      };
    } else if (monthlyIncome && monthlyIncome >= 5000) {
      return {
        message: `Your income provides a solid foundation for your ${this.getGoalTypeDisplayName(goalType)} goal! With smart budgeting and strategic planning, you can make meaningful progress.`,
        tone: 'encouraging'
      };
    } else if (monthlyIncome && monthlyIncome < 3000) {
      return {
        message: `I appreciate your honesty about your income. Even with a modest income, smart financial strategies can help you work toward your ${this.getGoalTypeDisplayName(goalType)} goal. Every dollar counts when invested wisely!`,
        tone: 'reassuring'
      };
    }

    if (additionalIncome && additionalIncome.length > 0) {
      return {
        message: `Smart move diversifying your income streams! These additional sources can really boost your ${this.getGoalTypeDisplayName(goalType)} contributions. Multiple income streams are a sign of financial savvy.`,
        tone: 'congratulatory'
      };
    }

    return {
      message: `Understanding your income is crucial for creating a realistic ${this.getGoalTypeDisplayName(goalType)} plan. Now let's look at your expenses to see how much you can allocate toward this goal.`,
      tone: 'informative'
    };
  }

  private static getExpensesMessage(answers: Partial<ComprehensiveFinancialProfile>, goalType: GoalType): AdvisorMessage {
    const monthlyExpenses = answers['monthly-living-expenses'] as number;
    const monthlyIncome = answers['monthly-gross-income'] as number;
    
    if (monthlyIncome && monthlyExpenses) {
      const savingsRate = ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100;
      
      if (savingsRate >= 20) {
        return {
          message: `Fantastic! You're already saving ${savingsRate.toFixed(0)}% of your income. This excellent savings rate puts you in a strong position to achieve your ${this.getGoalTypeDisplayName(goalType)} goal ahead of schedule!`,
          tone: 'congratulatory'
        };
      } else if (savingsRate >= 10) {
        return {
          message: `Good job maintaining a ${savingsRate.toFixed(0)}% savings rate! With some optimization, we might be able to increase this and accelerate your ${this.getGoalTypeDisplayName(goalType)} timeline.`,
          tone: 'encouraging'
        };
      } else if (savingsRate >= 0) {
        return {
          message: `You're saving about ${savingsRate.toFixed(0)}% of your income. There's room for improvement here, and I'll help you find ways to increase your ${this.getGoalTypeDisplayName(goalType)} contributions without sacrificing your quality of life.`,
          tone: 'motivational'
        };
      } else {
        return {
          message: `I notice your expenses exceed your income. Don't worry - this is more common than you might think. Let's work together to create a plan that balances your immediate needs with your ${this.getGoalTypeDisplayName(goalType)} aspirations.`,
          tone: 'reassuring'
        };
      }
    }

    return {
      message: `Understanding your expenses helps me see how much flexibility you have for your ${this.getGoalTypeDisplayName(goalType)} contributions. Every expense category we optimize is more money toward your future!`,
      tone: 'informative'
    };
  }

  private static getAssetsMessage(answers: Partial<ComprehensiveFinancialProfile>, goalType: GoalType): AdvisorMessage {
    const emergencyFund = answers['emergency-fund'] as number;
    const currentSavings = answers['current-savings'] as number;
    const monthlyExpenses = answers['monthly-living-expenses'] as number;
    
    if (emergencyFund && monthlyExpenses) {
      const monthsCovered = emergencyFund / monthlyExpenses;
      
      if (monthsCovered >= 6) {
        return {
          message: `Excellent emergency fund! Having ${monthsCovered.toFixed(1)} months of expenses saved gives you a solid safety net. This means you can be more aggressive with your ${this.getGoalTypeDisplayName(goalType)} strategy.`,
          tone: 'congratulatory'
        };
      } else if (monthsCovered >= 3) {
        return {
          message: `Good start on your emergency fund with ${monthsCovered.toFixed(1)} months covered. Once you reach 6 months, you'll have even more flexibility for your ${this.getGoalTypeDisplayName(goalType)} investments.`,
          tone: 'encouraging'
        };
      } else {
        return {
          message: `Your emergency fund could use some attention - you currently have ${monthsCovered.toFixed(1)} months covered. Building this to 3-6 months will provide security for pursuing your ${this.getGoalTypeDisplayName(goalType)} goal.`,
          tone: 'motivational'
        };
      }
    }

    if (currentSavings && currentSavings >= 50000) {
      return {
        message: `Impressive savings! Your $${currentSavings.toLocaleString()} gives you a great head start on your ${this.getGoalTypeDisplayName(goalType)} goal. Let's make sure this money is working as hard as possible for you.`,
        tone: 'congratulatory'
      };
    }

    return {
      message: `Your current assets and savings provide the foundation for your ${this.getGoalTypeDisplayName(goalType)} plan. Building and optimizing these assets will be key to reaching your goal efficiently.`,
      tone: 'informative'
    };
  }

  private static getDebtsMessage(answers: Partial<ComprehensiveFinancialProfile>, goalType: GoalType): AdvisorMessage {
    const monthlyDebtPayments = answers['monthly-debt-payments'] as number;
    const monthlyIncome = answers['monthly-gross-income'] as number;
    
    if (monthlyDebtPayments && monthlyIncome) {
      const debtToIncomeRatio = (monthlyDebtPayments / monthlyIncome) * 100;
      
      if (debtToIncomeRatio <= 10) {
        return {
          message: `Great job keeping your debt payments low at only ${debtToIncomeRatio.toFixed(0)}% of your income! This leaves you with excellent flexibility to focus on your ${this.getGoalTypeDisplayName(goalType)} goal.`,
          tone: 'congratulatory'
        };
      } else if (debtToIncomeRatio <= 20) {
        return {
          message: `Your debt payments represent ${debtToIncomeRatio.toFixed(0)}% of your income, which is manageable. We'll factor this into your ${this.getGoalTypeDisplayName(goalType)} strategy and look for optimization opportunities.`,
          tone: 'encouraging'
        };
      } else if (debtToIncomeRatio <= 40) {
        return {
          message: `With ${debtToIncomeRatio.toFixed(0)}% of your income going to debt payments, there's significant opportunity here. Reducing this debt burden could free up substantial funds for your ${this.getGoalTypeDisplayName(goalType)} goal.`,
          tone: 'motivational'
        };
      } else {
        return {
          message: `Your debt payments are consuming ${debtToIncomeRatio.toFixed(0)}% of your income. Let's create a balanced approach that addresses debt reduction while still making progress on your ${this.getGoalTypeDisplayName(goalType)} goal.`,
          tone: 'reassuring'
        };
      }
    }

    if (!monthlyDebtPayments || monthlyDebtPayments === 0) {
      return {
        message: `Fantastic - being debt-free is a huge advantage! Without debt payments holding you back, you can dedicate more resources to achieving your ${this.getGoalTypeDisplayName(goalType)} goal faster.`,
        tone: 'congratulatory'
      };
    }

    return {
      message: `Understanding your debt situation helps me create a realistic timeline for your ${this.getGoalTypeDisplayName(goalType)} goal. We'll balance debt management with goal progress.`,
      tone: 'informative'
    };
  }

  private static getGoalsMessage(answers: Partial<ComprehensiveFinancialProfile>, goalType: GoalType): AdvisorMessage {
    return {
      message: `I love that you're thinking beyond just one financial goal! Having multiple goals shows great financial planning mindset. We'll make sure your ${this.getGoalTypeDisplayName(goalType)} goal fits perfectly with your other aspirations.`,
      tone: 'congratulatory'
    };
  }

  private static getRiskProfileMessage(answers: Partial<ComprehensiveFinancialProfile>, goalType: GoalType): AdvisorMessage {
    const riskTolerance = answers['risk-tolerance'] as string;
    const investmentExperience = answers['investment-experience'] as string;
    
    if (riskTolerance === 'aggressive') {
      return {
        message: `Your aggressive risk tolerance could really work in your favor for your ${this.getGoalTypeDisplayName(goalType)} goal! Higher risk investments have historically provided better long-term returns, which could accelerate your timeline.`,
        tone: 'encouraging'
      };
    } else if (riskTolerance === 'conservative') {
      return {
        message: `Your conservative approach is perfectly valid! We'll design a ${this.getGoalTypeDisplayName(goalType)} strategy that prioritizes capital preservation while still making steady progress toward your goal.`,
        tone: 'reassuring'
      };
    }

    if (investmentExperience === 'beginner') {
      return {
        message: `Everyone starts somewhere with investing! Your ${this.getGoalTypeDisplayName(goalType)} journey is a perfect opportunity to build investment knowledge while working toward your goal. I'll suggest simple, effective strategies.`,
        tone: 'encouraging'
      };
    } else if (investmentExperience === 'advanced') {
      return {
        message: `Your investment experience is a valuable asset! We can explore more sophisticated strategies for your ${this.getGoalTypeDisplayName(goalType)} goal that take advantage of your knowledge and comfort with markets.`,
        tone: 'congratulatory'
      };
    }

    return {
      message: `Your investment approach will be crucial for achieving your ${this.getGoalTypeDisplayName(goalType)} goal efficiently. Let's make sure your strategy matches your comfort level and timeline.`,
      tone: 'informative'
    };
  }

  private static getBehaviorMessage(answers: Partial<ComprehensiveFinancialProfile>, goalType: GoalType): AdvisorMessage {
    return {
      message: `Understanding your financial habits and behaviors helps me create a ${this.getGoalTypeDisplayName(goalType)} plan that actually works with your lifestyle. The best plan is one you can stick to consistently!`,
      tone: 'encouraging'
    };
  }

  private static getGoalSpecificMessage(answers: Partial<ComprehensiveFinancialProfile>, goalType: GoalType): AdvisorMessage {
    const targetAmount = answers['target-amount'] as number;
    const timeframe = answers['target-timeframe'] as number;
    
    if (targetAmount && timeframe) {
      const monthlyNeeded = targetAmount / (timeframe * 12);
      
      if (monthlyNeeded <= 500) {
        return {
          message: `Your ${this.getGoalTypeDisplayName(goalType)} goal looks very achievable! Needing about $${monthlyNeeded.toFixed(0)} per month toward this goal should be manageable with the right strategy.`,
          tone: 'congratulatory'
        };
      } else if (monthlyNeeded <= 1500) {
        return {
          message: `Your ${this.getGoalTypeDisplayName(goalType)} goal will require about $${monthlyNeeded.toFixed(0)} per month. This is ambitious but definitely achievable with focused effort and smart planning!`,
          tone: 'encouraging'
        };
      } else {
        return {
          message: `Your ${this.getGoalTypeDisplayName(goalType)} goal is ambitious - requiring about $${monthlyNeeded.toFixed(0)} per month. Don't worry! We'll explore strategies to make this more achievable, including optimizing your timeline and approach.`,
          tone: 'motivational'
        };
      }
    }

    return {
      message: `Perfect! With all your goal details, I can now create a personalized strategy that transforms your ${this.getGoalTypeDisplayName(goalType)} dream into a step-by-step action plan. You're closer to achieving this than you think!`,
      tone: 'congratulatory'
    };
  }

  private static getGoalTypeDisplayName(goalType: GoalType): string {
    const goalTypeNames: Record<GoalType, string> = {
      'retirement': 'retirement',
      'home_buying': 'home buying',
      'wealth': 'wealth building',
      'investment': 'investment',
      'debt_payoff': 'debt payoff',
      'emergency_fund': 'emergency fund',
      'passive_income': 'passive income',
      'custom': 'custom'
    };
    
    return goalTypeNames[goalType] || 'financial';
  }
}