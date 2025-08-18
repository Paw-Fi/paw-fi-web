import { ComprehensiveFinancialProfile, defaultProfile, QuestionCategory } from '@/types/financial-quiz-constants';

export interface AdvisorMessage {
  category: QuestionCategory;
  message: string;
  tone: 'encouraging' | 'reassuring' | 'motivational' | 'congratulatory';
  priority: 'high' | 'medium' | 'low';
}

export class FinancialAdvisorMessageGenerator {
  private static getAgeGroup(age: number) {
    if (age < 30) return 'young';
    if (age < 50) return 'mid-career';
    if (age < 65) return 'pre-retirement';
    return 'retirement';
  }

  public static generatePersonalInformationMessage(answers: Partial<ComprehensiveFinancialProfile>): AdvisorMessage {
    const {
      current_age: age = defaultProfile.current_age,
      dependents = defaultProfile.dependents,
      marital_status: maritalStatus = defaultProfile.marital_status,
    } = answers;

    const ageGroup = this.getAgeGroup(age);
    let message: string;
    let tone: AdvisorMessage['tone'] = 'encouraging';

    if (ageGroup === 'young') {
      tone = 'motivational';
      message = `Starting your financial journey at ${age} gives you a tremendous advantage. Time is your greatest asset for building wealth through compound growth.`;
    } else if (ageGroup === 'mid-career') {
      tone = 'encouraging';
      message = `At ${age}, you're in your prime earning years. This is an excellent time to maximize savings and optimize your investment strategy.`;
    } else if (ageGroup === 'pre-retirement') {
      tone = 'reassuring';
      message = `With retirement approaching, focus on preserving wealth while maintaining some growth potential. Your experience is valuable in making informed financial decisions.`;
    } else {
      tone = 'congratulatory';
      message = `Your years of financial experience are invaluable. Focus on capital preservation and income generation strategies.`;
    }

    if (dependents > 0) {
      message += ` Supporting ${dependents} dependent${dependents > 1 ? 's' : ''} highlights the importance of comprehensive financial planning and adequate insurance coverage.`;
    }

    return { category: 'personal-information', message, tone, priority: 'medium' };
  }

  public static generateIncomeDetailsMessage(answers: Partial<ComprehensiveFinancialProfile>): AdvisorMessage {
    const {
      gross_monthly_income: grossIncome = defaultProfile.gross_monthly_income,
      net_monthly_income: netIncome = defaultProfile.net_monthly_income,
      income_stability: stability = defaultProfile.income_stability,
      additional_income_sources: additionalSources = defaultProfile.additional_income_sources,
    } = answers;

    const takeHomeRate = grossIncome > 0 ? (netIncome / grossIncome) * 100 : 0;
    let message: string;
    let tone: AdvisorMessage['tone'] = 'encouraging';

    if (takeHomeRate >= 75) {
      tone = 'congratulatory';
      message = `Your take-home rate of ${takeHomeRate.toFixed(0)}% is excellent, indicating efficient tax planning and minimal deductions.`;
    } else if (takeHomeRate >= 65) {
      tone = 'encouraging';
      message = `A ${takeHomeRate.toFixed(0)}% take-home rate is solid. Consider reviewing tax strategies to potentially optimize your net income.`;
    } else {
      tone = 'motivational';
      message = `Your take-home rate is ${takeHomeRate.toFixed(0)}%. Exploring tax optimization strategies could help increase your available income for savings and investments.`;
    }

    if (stability === 'very_stable' || stability === 'stable') {
      message += ` Your stable income provides a strong foundation for consistent saving and investing.`;
    } else {
      message += ` With variable income, maintaining a larger emergency fund and flexible budgeting approach is recommended.`;
    }

    if (Array.isArray(additionalSources) && additionalSources.length > 0) {
      message += ` Having ${additionalSources.length} additional income source${additionalSources.length > 1 ? 's' : ''} diversifies your earnings and reduces financial risk.`;
    }

    return { category: 'income-details', message, tone, priority: 'high' };
  }

  public static generateDetailedExpensesMessage(answers: Partial<ComprehensiveFinancialProfile>): AdvisorMessage {
    const {
      housing_cost: housing = defaultProfile.housing_cost,
      food_expenses: food = defaultProfile.food_expenses,
      transportation_expenses: transportation = defaultProfile.transportation_expenses,
      healthcare_expenses: healthcare = defaultProfile.healthcare_expenses,
      insurance_expenses: insurance = defaultProfile.insurance_expenses,
      entertainment_expenses: entertainment = defaultProfile.entertainment_expenses,
      other_monthly_expenses: other = defaultProfile.other_monthly_expenses,
      net_monthly_income: netIncome = defaultProfile.net_monthly_income,
    } = answers;

    const totalExpenses = housing + food + transportation + healthcare + insurance + entertainment + other;
    const expenseRatio = netIncome > 0 ? (totalExpenses / netIncome) * 100 : 0;
    
    let message: string;
    let tone: AdvisorMessage['tone'];

    if (expenseRatio <= 50) {
      tone = 'congratulatory';
      message = `Excellent expense management! Your expenses represent only ${expenseRatio.toFixed(0)}% of income, leaving substantial room for savings and investments.`;
    } else if (expenseRatio <= 70) {
      tone = 'encouraging';
      message = `Your expense ratio of ${expenseRatio.toFixed(0)}% is reasonable. Look for opportunities to optimize spending in non-essential categories.`;
    } else {
      tone = 'motivational';
      message = `With expenses at ${expenseRatio.toFixed(0)}% of income, focus on identifying areas to reduce costs and increase your savings capacity.`;
    }

    return { category: 'detailed-expenses', message, tone, priority: 'medium' };
  }

  public static generateAssetsAndSavingsMessage(answers: Partial<ComprehensiveFinancialProfile>): AdvisorMessage {
    const {
      emergency_fund: emergencyFund = defaultProfile.emergency_fund,
      checking_account: checkingAccount = defaultProfile.checking_account,
      savings_account: savingsAccount = defaultProfile.savings_account,
      investment_accounts: investmentAccounts = defaultProfile.investment_accounts,
      retirement_accounts: retirementAccounts = defaultProfile.retirement_accounts,
      real_estate_value: realEstateValue = defaultProfile.real_estate_value,
      other_assets: otherAssets = defaultProfile.other_assets,
    } = answers;

    const totalLiquidAssets = emergencyFund + checkingAccount + savingsAccount;
    const totalAssets = totalLiquidAssets + investmentAccounts + retirementAccounts + realEstateValue + otherAssets;
    
    let message: string;
    let tone: AdvisorMessage['tone'];

    if (totalAssets >= 100000) {
      tone = 'congratulatory';
      message = `Excellent work building assets totaling $${(totalAssets / 1000).toFixed(0)}K. Your diversified asset base provides multiple pathways to financial growth.`;
    } else if (totalAssets >= 25000) {
      tone = 'encouraging';
      message = `You've built a solid foundation with $${(totalAssets / 1000).toFixed(0)}K in assets. Continue this momentum to accelerate your wealth building journey.`;
    } else if (totalAssets > 0) {
      tone = 'motivational';
      message = `Every dollar saved is progress toward financial security. Focus on consistent contributions to build your asset base over time.`;
    } else {
      tone = 'reassuring';
      message = `Starting your savings journey is the most important step. Even small, regular contributions can grow significantly through compound interest.`;
    }

    const liquidityRatio = totalAssets > 0 ? (totalLiquidAssets / totalAssets) * 100 : 0;
    if (liquidityRatio > 50) {
      message += ` Consider investing some of your liquid savings for potentially higher returns.`;
    }

    return { category: 'assets-and-savings', message, tone, priority: 'high' };
  }

  public static generateDebtsAndLiabilitiesMessage(answers: Partial<ComprehensiveFinancialProfile>): AdvisorMessage {
    const {
      credit_card_debt: creditCardDebt = defaultProfile.credit_card_debt,
      student_loan_debt: studentLoanDebt = defaultProfile.student_loan_debt,
      mortgage_balance: mortgageBalance = defaultProfile.mortgage_balance,
      auto_loan_balance: autoLoanBalance = defaultProfile.auto_loan_balance,
      other_debt: otherDebt = defaultProfile.other_debt,
      net_monthly_income: netIncome = defaultProfile.net_monthly_income,
    } = answers;

    const totalDebt = creditCardDebt + studentLoanDebt + mortgageBalance + autoLoanBalance + otherDebt;
    const debtToIncomeRatio = netIncome > 0 ? (totalDebt / (netIncome * 12)) * 100 : 0;
    
    let message: string;
    let tone: AdvisorMessage['tone'];

    if (totalDebt === 0) {
      tone = 'congratulatory';
      message = `Being debt-free is a tremendous achievement that provides maximum financial flexibility and peace of mind.`;
    } else if (debtToIncomeRatio <= 20) {
      tone = 'encouraging';
      message = `Your debt-to-income ratio of ${debtToIncomeRatio.toFixed(0)}% is very manageable. Continue your current debt management approach.`;
    } else if (debtToIncomeRatio <= 40) {
      tone = 'motivational';
      message = `A ${debtToIncomeRatio.toFixed(0)}% debt-to-income ratio requires attention. Consider the debt avalanche method to minimize interest payments.`;
    } else {
      tone = 'reassuring';
      message = `High debt levels can feel overwhelming, but with a structured repayment plan, you can regain financial control. Focus on high-interest debt first.`;
    }

    if (creditCardDebt > 0) {
      message += ` Prioritize paying off credit card debt due to its typically high interest rates.`;
    }

    return { category: 'debts-and-liabilities', message, tone, priority: 'high' };
  }

  public static generateFinancialGoalsMessage(answers: Partial<ComprehensiveFinancialProfile>): AdvisorMessage {
    const {
      current_age: age = defaultProfile.current_age,
      retirement_age: retirementAge = defaultProfile.retirement_age,
      desired_retirement_income: desiredRetirementIncome = defaultProfile.desired_retirement_income,
      short_term_goals: shortTermGoals = defaultProfile.short_term_goals,
      medium_term_goals: mediumTermGoals = defaultProfile.medium_term_goals,
      long_term_goals: longTermGoals = defaultProfile.long_term_goals,
    } = answers;

    const yearsToRetirement = Math.max(0, retirementAge - age);
    const estimatedRetirementNeeds = desiredRetirementIncome * 12 * 25; // 4% rule
    let message: string;
    let tone: AdvisorMessage['tone'] = 'encouraging';

    if (estimatedRetirementNeeds > 0) {
        message = `Based on your desired retirement income, you may need around $${(estimatedRetirementNeeds / 1000000).toFixed(1)}M. With ${yearsToRetirement} years to go, a consistent savings plan is key.`;
    } else {
        message = "Defining your desired retirement income is a critical first step. A common goal is to replace 80% of your pre-retirement income."
    }

    const totalGoals = shortTermGoals.length + mediumTermGoals.length + longTermGoals.length;
    if (totalGoals > 0) {
      message += ` Having ${totalGoals} defined financial goal${totalGoals > 1 ? 's' : ''} shows excellent planning discipline.`;
    }

    return { category: 'financial-goals', message, tone, priority: 'high' };
  }

  public static generateRiskProfileMessage(answers: Partial<ComprehensiveFinancialProfile>): AdvisorMessage {
    const {
      risk_tolerance: riskTolerance = defaultProfile.risk_tolerance,
      investment_experience: experience = defaultProfile.investment_experience,
      investment_timeline: timeline = defaultProfile.investment_timeline,
    } = answers;

    let message: string;
    let tone: AdvisorMessage['tone'] = 'encouraging';

    if (riskTolerance === 'very_aggressive' && experience === 'expert') {
      tone = 'congratulatory';
      message = `Your expert experience and very aggressive risk tolerance suggest you are well-equipped for sophisticated, high-growth investment strategies.`;
    } else if (riskTolerance === 'aggressive') {
      tone = 'encouraging';
      message = `An aggressive approach is suitable for long-term goals where you can weather market volatility for potentially higher returns.`;
    } else if (riskTolerance === 'moderate') {
      tone = 'reassuring';
      message = `A moderate risk approach balances growth potential with stability. This typically translates to a diversified portfolio of equities and bonds.`;
    } else {
      tone = 'reassuring';
      message = `A conservative strategy prioritizes capital preservation. While returns may be lower, this approach provides peace of mind and steady, predictable growth.`;
    }

    if (timeline === 'long') {
        message += " A long-term investment timeline gives you the advantage of compounding and the ability to ride out market fluctuations."
    }

    return { category: 'risk-profile-and-investment', message, tone, priority: 'high' };
  }

  public static generateFinancialBehaviorMessage(answers: Partial<ComprehensiveFinancialProfile>): AdvisorMessage {
    const {
      savings_rate: savingsRate = defaultProfile.savings_rate,
      spending_tracking: spendingTracking = defaultProfile.spending_tracking,
      budget_adherence: budgetAdherence = defaultProfile.budget_adherence,
      financial_stress_level: stressLevel = defaultProfile.financial_stress_level,
    } = answers;
    
    let message: string;
    let tone: AdvisorMessage['tone'];

    if (savingsRate >= 20) {
        tone = 'congratulatory';
        message = `A savings rate of ${savingsRate}% or more is outstanding and puts you on the fast track to achieving your financial goals.`
    } else if (savingsRate >= 10) {
        tone = 'encouraging';
        message = `Saving ${savingsRate}% of your income is a solid start. Look for ways to gradually increase this to 15-20% to accelerate your progress.`
    } else {
        tone = 'motivational';
        message = `Aim to save at least 10-15% of your income. Even small increases in your ${savingsRate}% savings rate can make a big difference over time.`
    }

    if (spendingTracking === 'daily' && budgetAdherence === 'always') {
      message += ` Your disciplined approach to budgeting and daily expense tracking demonstrates excellent financial habits.`;
    } else if (budgetAdherence !== 'never') {
      message += ` Sticking to a budget is crucial. Consider automating your savings to make it even easier.`;
    } else {
      message += ` Implementing a budget and tracking your spending are foundational to financial success. Start with the 50/30/20 rule.`;
    }

    return { category: 'financial-behavior', message, tone, priority: 'medium' };
  }

  public static getCategoryMessage(category: QuestionCategory, answers: Partial<ComprehensiveFinancialProfile>): AdvisorMessage {
    switch (category) {
      case 'personal-information':
        return this.generatePersonalInformationMessage(answers);
      case 'income-details':
        return this.generateIncomeDetailsMessage(answers);
      case 'detailed-expenses':
        return this.generateDetailedExpensesMessage(answers);
      case 'assets-and-savings':
        return this.generateAssetsAndSavingsMessage(answers);
      case 'debts-and-liabilities':
        return this.generateDebtsAndLiabilitiesMessage(answers);
      case 'financial-goals':
        return this.generateFinancialGoalsMessage(answers);
      case 'risk-profile-and-investment':
        return this.generateRiskProfileMessage(answers);
      case 'financial-behavior':
        return this.generateFinancialBehaviorMessage(answers);
      default:
        return {
          category: 'personal-information',
          message: 'Reviewing your complete financial profile provides the necessary context to develop a comprehensive strategy.',
          tone: 'motivational',
          priority: 'high'
        };
    }
  }
}