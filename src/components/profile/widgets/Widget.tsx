'use client';

import { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faShield, faChevronRight, faMoneyBill, faCreditCard, 
  faHandshake, faBullseye, faWallet, faCalendar, 
  faLightbulb, faPiggyBank, faReceipt, faBriefcase,
  faChartBar, faChartLine
} from '@fortawesome/free-solid-svg-icons';
import { BaseWidget } from '../types/dashboard-data.typings';

interface WidgetProps {
  widget: BaseWidget;
  children: ReactNode;
  className?: string;
}

const iconMap: Record<string, any> = {
  ShieldCheck: faShield,
  ChevronsRight: faChevronRight,
  Banknote: faMoneyBill,
  CreditCard: faCreditCard,
  Handshake: faHandshake,
  Target: faBullseye,
  Wallet: faWallet,
  Calendar: faCalendar,
  Lightbulb: faLightbulb,
  PiggyBank: faPiggyBank,
  Receipt: faReceipt,
  Briefcase: faBriefcase,
  BarChart2: faChartBar,
  LineChartIcon: faChartLine
};

export function Widget({ widget, children, className = '' }: WidgetProps) {
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
      <div className="px-4 py-3 border-b border-gray-100/50 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center space-x-2 pl-2"> {/* Added left padding to avoid overlap with drag handle */}
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <FontAwesomeIcon icon={icon} className="h-3 w-3" />
          </div>
          <h3 className="font-medium text-gray-800">{widget.title}</h3>
        </div>
        {/* Removed chevron icon to avoid conflicts with drag handle and expand/collapse controls */}
      </div>
      
      {/* Widget content - flex-grow allows it to fill available space */}
      <div className="flex-grow overflow-auto">
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
