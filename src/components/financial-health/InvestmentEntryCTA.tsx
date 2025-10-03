'use client';

import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faArrowRight,
  faCloud,
  faCalculator,
} from '@fortawesome/free-solid-svg-icons';
import { motion } from 'framer-motion';

export interface InvestmentEntryCTAProps {
  className?: string;
  variant?: 'default' | 'compact';
}

export function InvestmentEntryCTA({
  className = '',
  variant = 'default',
}: InvestmentEntryCTAProps) {
  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="rounded-full"
        >
          <Link to="/calculators/investment-calculator">
            <FontAwesomeIcon icon={faCalculator} className="mr-2 h-4 w-4" />
            Plan Investment
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      className={`bg-subtle-background/50 rounded-2xl p-6 ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-medium text-foreground mb-1 flex items-center gap-2">
            <FontAwesomeIcon icon={faPlus} className="h-4 w-4 text-primary" />
            Add Your Investments
          </h3>
          <p className="text-sm text-muted-foreground-color">
            Track your investment portfolio by adding accounts manually or using our investment calculator
            to plan your strategy.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            asChild
            variant="outline"
            className="rounded-full w-full sm:w-auto"
          >
            <Link to="/calculators/investment-calculator">
              <FontAwesomeIcon icon={faCalculator} className="mr-2 h-4 w-4" />
              Investment Calculator
            </Link>
          </Button>

          <Button
            asChild
            className="rounded-full w-full sm:w-auto"
          >
            <Link to="/dashboard/tracker/create">
              <FontAwesomeIcon icon={faPlus} className="mr-2 h-4 w-4" />
              Create Goal
              <FontAwesomeIcon icon={faArrowRight} className="ml-2 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Future bank sync section - commented out until backend support */}
      {/* <div className="mt-4 pt-4 border-t border-subtle-border">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
            <FontAwesomeIcon icon={faCloud} className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground mb-1">Automatic Sync Coming Soon</p>
            <p className="text-xs text-muted-foreground-color">
              Connect your brokerage accounts to automatically track your investments in real-time.
            </p>
          </div>
        </div>
      </div> */}
    </motion.div>
  );
}
