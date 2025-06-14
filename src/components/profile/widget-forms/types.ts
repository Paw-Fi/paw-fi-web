import { Widget } from '../types/dashboard-data.typings';

export interface WidgetFormProps<T = any> {
  data: T;
  onDataChange: (data: T) => void;
}

export interface SortableItemProps {
  id: string | number;
  children: React.ReactNode;
  listeners?: any;
  attributes?: any;
  style?: React.CSSProperties;
}

export const availableIcons = [
  { name: 'List', value: 'faList' },
  { name: 'Tasks', value: 'faTasks' },
  { name: 'Chart Line', value: 'faChartLine' },
  { name: 'Lightbulb', value: 'faLightbulb' },
  { name: 'Calendar Alt', value: 'faCalendarAlt' },
  { name: 'Chart Bar', value: 'faChartBar' },
  { name: 'Exchange Alt', value: 'faExchangeAlt' },
  { name: 'Credit Card', value: 'faCreditCard' },
  { name: 'Shield Alt', value: 'faShieldAlt' },
  { name: 'Check Square', value: 'faCheckSquare' },
  { name: 'Cog', value: 'faCog' },
  { name: 'Calendar', value: 'faCalendar' },
  { name: 'Percent', value: 'faPercent' },
];
