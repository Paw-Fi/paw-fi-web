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
  faScaleUnbalancedFlip
} from '@fortawesome/free-solid-svg-icons';

// Import brand icons from free-brands-svg-icons
import { 
  faBitcoin,
  faEthereum
} from '@fortawesome/free-brands-svg-icons';
import { Widget as WidgetType } from '../types/dashboard-data.typings';

interface WidgetProps {
  widget: WidgetType;
  children: ReactNode;
  className?: string;
  controls?: ReactNode; // Added to support control buttons from EditableWidget
}

// Map of icon names to their corresponding Font Awesome icons
export const iconMap: Record<string, any> = {
  // Financial Icons
  'Money Bill': faMoneyBill,
  'Credit Card': faCreditCard,
  'Wallet': faWallet,
  'Piggy Bank': faPiggyBank,
  'Coins': faCoins,
  'Sack Dollar': faSackDollar,
  'Money Bill Wave': faMoneyBillWave,
  'Hand Holding Dollar': faHandHoldingUsd,
  'Money Check Dollar': faMoneyCheckDollar,
  'Receipt': faReceipt,
  'File Invoice Dollar': faFileInvoiceDollar,
  'Gift': faGift,
  'Gem': faGem,
  'Bitcoin': faBitcoin,
  'Ethereum': faEthereum,
  'Dollar Sign': faDollarSign,
  'Euro Sign': faEuroSign,
  'Pound Sign': faPoundSign,
  'Yen Sign': faYenSign,
  
  // Chart Icons
  'Chart Bar': faChartBar,
  'Chart Line': faChartLine,
  'Chart Pie': faChartPie,
  'Chart Area': faChartArea,
  'Chart Column': faChartColumn,
  
  // Business & Finance
  'Building': faBuilding,
  'University': faUniversity,
  'Briefcase': faBriefcase,
  'Calculator': faCalculator,
  'Percent': faPercent,
  'Exchange Alt': faExchangeAlt,
  'Tags': faTags,
  'Scale Balanced': faScaleBalanced,
  'Scale Unbalanced': faScaleUnbalanced,
  
  // General Icons
  'Shield': faShield,
  'Calendar': faCalendar,
  'Lightbulb': faLightbulb,
  'Home': faHome,
  'Target': faBullseye,
  'Handshake': faHandshake,
  'Chevron Right': faChevronRight
};

// Sorted list of icon names for the dropdown
export const iconOptions = Object.keys(iconMap).sort();

export function Widget({ widget, children, className = '', controls }: WidgetProps) {
  const icon = iconMap[widget.icon] || faChartBar;

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
