// Data Mapper - Transform AI Response to Database Entities
// Maps AI-generated data to database schema with validation and normalization

export class DataMapper {

  mapAIResponseToEntities(
    aiResponse: any,
    userId: string | null,
    goalType: string,
    questionnaireAnswers: Record<string, any>
  ) {
    return {
      profile: this.mapFinancialProfile(aiResponse.financialProfile, userId, questionnaireAnswers),
      goal: this.mapFinancialGoal(aiResponse, userId, goalType, questionnaireAnswers),
      milestones: this.mapMilestones(aiResponse.milestones),
      insights: this.mapInsights(aiResponse.insights)
    };
  }

  private mapFinancialProfile(
    profileData: any,
    userId: string | null,
    questionnaireAnswers: Record<string, any>
  ) {
    return {
      user_id: userId,
      profile_description: profileData.profileDescription || "AI-generated financial profile",
      quiz_answers: questionnaireAnswers,
      profile_data: {
        netWorth: profileData.profileData?.netWorth || 0,
        monthlyIncome: profileData.profileData?.monthlyIncome || 5000,
        monthlyExpenses: profileData.profileData?.monthlyExpenses || 3500,
        savingsRate: profileData.profileData?.savingsRate || 20,
        riskTolerance: profileData.profileData?.riskTolerance || 'moderate',
        financialGoals: profileData.profileData?.financialGoals || [],
        strengths: profileData.profileData?.strengths || [],
        recommendations: profileData.profileData?.recommendations || []
      }
    };
  }

  private mapFinancialGoal(
    aiResponse: any,
    userId: string | null,
    goalType: string,
    questionnaireAnswers: Record<string, any>
  ) {
    return {
      user_id: userId,
      title: aiResponse.goal.title,
      description: aiResponse.goal.description,
      goal_type: goalType,
      target_amount: aiResponse.goal.targetAmount,
      target_date: aiResponse.goal.targetDate,
      ai_questionnaire_data: questionnaireAnswers,
      ai_generated_strategy: aiResponse.strategy,
      ai_generated_milestones: aiResponse.milestones,
      ai_advisor_messages: aiResponse.advisorMessages
    };
  }

  private mapMilestones(milestones: any[]): any[] {
    return milestones.map((milestone, index) => ({
      title: milestone.title,
      description: milestone.description,
      milestone_type: milestone.type,
      target_amount: milestone.targetAmount,
      due_date: milestone.dueDate,
      habit_description: milestone.habitDescription,
      frequency: milestone.frequency,
      habit_target_value: milestone.habitTargetValue,
      is_ai_generated: true,
      display_order: index,
      priority: milestone.priority
    }));
  }

  private mapInsights(insights: any[]): any[] {
    return insights.map(insight => ({
      insight_type: insight.type,
      title: insight.title,
      content: insight.content,
      priority: insight.priority,
      is_ai_generated: true,
      ai_confidence_score: 0.8
    }));
  }
}