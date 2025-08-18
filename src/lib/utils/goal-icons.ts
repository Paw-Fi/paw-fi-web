import { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { 
  faRocket,
  faHome,
  faChartLine,
  faChartBar,
  faCreditCard,
  faShieldAlt,
  faWandSparkles,
  faBullseye,
  faPlane,
  faCar,
  faGraduationCap,
  faHeart
} from "@fortawesome/free-solid-svg-icons";

export interface Goal {
  title?: string;
  type?: string;
  goal_type?: string;
}

export function getGoalIcon(goal: Goal): IconDefinition {
  // First check if goal has a type property for exact matching
  const goalType = goal.type || goal.goal_type;
  if (goalType) {
    switch (goalType) {
      case 'retirement': return faRocket;
      case 'home_buying': return faHome;
      case 'wealth': return faChartLine;
      case 'investment': return faChartBar;
      case 'debt_payoff': return faCreditCard;
      case 'emergency_fund': return faShieldAlt;
      case 'passive_income': return faWandSparkles;
      case 'custom': return faBullseye;
      default: break;
    }
  }
  
  // Fallback to title-based matching for legacy goals
  const titleLower = goal.title?.toLowerCase() || '';
  if (titleLower.includes('retirement') || titleLower.includes('future')) return faRocket;
  if (titleLower.includes('home') || titleLower.includes('house') || titleLower.includes('buying')) return faHome;
  if (titleLower.includes('wealth') || titleLower.includes('rich')) return faChartLine;
  if (titleLower.includes('invest') || titleLower.includes('stock') || titleLower.includes('portfolio')) return faChartBar;
  if (titleLower.includes('debt') || titleLower.includes('loan') || titleLower.includes('payoff')) return faCreditCard;
  if (titleLower.includes('emergency') || titleLower.includes('fund') || titleLower.includes('safety')) return faShieldAlt;
  if (titleLower.includes('travel') || titleLower.includes('vacation')) return faPlane;
  if (titleLower.includes('car') || titleLower.includes('vehicle')) return faCar;
  if (titleLower.includes('education') || titleLower.includes('school')) return faGraduationCap;
  if (titleLower.includes('wedding') || titleLower.includes('marriage')) return faHeart;
  return faBullseye;
}