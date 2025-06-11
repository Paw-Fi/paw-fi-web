'use client';

import { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// Import Font Awesome icons
import { 
  // Basic Icons
  faShield, 
  faChevronRight, 
  faMoneyBill, 
  faCreditCard, 
  faHandshake, 
  faBullseye, 
  faWallet, 
  faCalendar, 
  faLightbulb, 
  faPiggyBank, 
  faReceipt, 
  faBriefcase,
  faChartBar, 
  faChartLine, 
  faHome, 
  faBuilding, 
  faUniversity, 
  faCoins, 
  faChartPie,
  faExchangeAlt, 
  faPercent, 
  faCalculator, 
  faFileInvoiceDollar,
  faTags, 
  faMoneyBillWave, 
  faHandHoldingUsd,
  faChartArea, 
  faChartColumn,
  faDollarSign, 
  faEuroSign, 
  faPoundSign, 
  faYenSign,
  faGem, 
  faGift,
  faMoneyCheckDollar,
  faSackDollar, 
  faScaleBalanced, 
  faSackXmark, 
  faScaleUnbalanced, 
  faScaleUnbalancedFlip,
  faHourglassHalf,
  IconDefinition,
  faHeartPulse,
  faBolt,
  faBoltLightning,
  faGavel,
  faHeartbeat,
  faUmbrellaBeach,
  faShieldAlt,
  faTasks
} from '@fortawesome/free-solid-svg-icons';

// Import brand icons from free-brands-svg-icons
import { 
  faBitcoin,
  faEthereum
} from '@fortawesome/free-brands-svg-icons';
import { Widget as WidgetType } from '../types/dashboard-data.typings';
import { IconProp } from '@fortawesome/fontawesome-svg-core';

interface WidgetProps {
  widget: WidgetType;
  children: ReactNode;
  className?: string;
  controls?: ReactNode; // Added to support control buttons from EditableWidget
}
type FontAwesomePrefix = 'fas' | 'far' | 'fal' | 'fad' | 'fab';
type FontAwesomeIconClass = `${FontAwesomePrefix} fa-${string}`;
// Map of icon names to their corresponding Font Awesome icons
export const iconMap: Record<FontAwesomeIconClass, IconProp> = {
  // Financial Icons
  'fas fa-money-bill': faMoneyBill,
  'fas fa-credit-card': faCreditCard,
  'fas fa-wallet': faWallet,
  'fas fa-piggy-bank': faPiggyBank,
  'fas fa-coins': faCoins,
  'fas fa-sack-dollar': faSackDollar,
  'fas fa-money-bill-wave': faMoneyBillWave,
  'fas fa-hand-holding-usd': faHandHoldingUsd,
  'fas fa-money-check-dollar': faMoneyCheckDollar,
  'fas fa-receipt': faReceipt,
  'fas fa-file-invoice-dollar': faFileInvoiceDollar,
  'fas fa-gift': faGift,
  'fas fa-gem': faGem,
  'fas fa-bitcoin': faBitcoin,
  'fas fa-ethereum': faEthereum,
  'fas fa-dollar-sign': faDollarSign,
  'fas fa-euro-sign': faEuroSign,
  'fas fa-pound-sign': faPoundSign,
  'fas fa-yen-sign': faYenSign,
  
  // Chart Icons
  'fas fa-chart-bar': faChartBar,
  'fas fa-chart-line': faChartLine,
  'fas fa-chart-pie': faChartPie,
  'fas fa-chart-area': faChartArea,
  'fas fa-chart-column': faChartColumn,
  
  // Business & Finance
  'fas fa-building': faBuilding,
  'fas fa-university': faUniversity,
  'fas fa-briefcase': faBriefcase,
  'fas fa-calculator': faCalculator,
  'fas fa-percent': faPercent,
  'fas fa-exchange-alt': faExchangeAlt,
  'fas fa-tags': faTags,
  'fas fa-scale-balanced': faScaleBalanced,
  'fas fa-scale-unbalanced': faScaleUnbalanced,
  
  // General Icons
  'fas fa-shield': faShield,
  'fas fa-calendar': faCalendar,
  'fas fa-lightbulb': faLightbulb,
  'fas fa-home': faHome,
  'fas fa-target': faBullseye,
  'fas fa-handshake': faHandshake,
  'fas fa-chevron-right': faChevronRight,
  'fas fa-hourglass-half': faHourglassHalf,
  'fas fa-bullseye': faBullseye,
  'fas fa-heart-pulse': faHeartPulse,
  'fas fa-heartbeat': faHeartbeat,
  'fas fa-bolt': faBolt,
  'fas fa-bolt-lightning': faBoltLightning,
  'fas fa-gavel': faGavel,
  'fas fa-umbrella-beach': faUmbrellaBeach,
  'fas fa-shield-alt': faShieldAlt,
  'fas fa-tasks': faTasks,
};

// Sorted list of icon names for the dropdown
export const iconOptions = Object.keys(iconMap).sort();

export function Widget({ widget, children, className = '', controls }: WidgetProps) {

  // Safely handle the icon - ensure it exists in our map or use default
  const icon = widget.icon && iconMap[widget.icon as keyof typeof iconMap] ? iconMap[widget.icon as keyof typeof iconMap] : faChartBar;

  return (
    <div 
      className={`
        relative overflow-hidden rounded-xl backdrop-blur-md
        bg-white/70 
        border border-white/20
        shadow-lg hover:shadow-xl transition-all duration-300
        h-full flex flex-col
        ${widget.columnSpan === 2 ? 'col-span-2' : 'col-span-1'}
        ${className}
      `}
      style={{
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
      }}
    >
      {/* Glass effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/20 pointer-events-none"></div>
      
      {/* Widget header */}
      <div className="px-1 py-3 border-b border-gray-100/50 flex items-center flex-shrink-0">
        <div className="flex items-center space-x-2 pl-2 min-w-0 flex-grow"> {/* min-w-0 allows truncation to work properly */}
          <div className="w-6 h-6 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center text-primary">
            <FontAwesomeIcon icon={icon} className="h-3 w-3" />
          </div>
          <h3 className="font-medium text-gray-800 truncate" title={widget.title}>
            {widget.type || widget.type}
          </h3>
        </div>
        
        {/* Controls from EditableWidget will be inserted here */}
        {controls && (
          <div className="flex items-center ml-auto">
            {controls}
          </div>
        )}
      </div>
      
      {/* Widget content - flex-grow allows it to fill available space */}
      <div className={`flex-grow ${className.includes('overflow-hidden') ? 'relative' : 'overflow-auto'}`}>
        <div className="p-3 h-full">
          {children}
        </div>
      </div>
    </div>
  );
}
