import type { ReactNode } from "react";
import { CalendarRange, GitCompare } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PRESET_OPTIONS,
  type RangePreset,
} from "@/lib/creator-date-range";
import type { CompareMode } from "@/hooks/use-creator-date-range";
import { cn } from "@/lib/utils";

interface RangeComparisonCardProps {
  rangePreset: RangePreset;
  startDate: string;
  endDate: string;
  compareEnabled: boolean;
  compareMode: CompareMode;
  compareStartDate: string;
  compareEndDate: string;
  rangeLabel: string;
  compareLabel: string;
  onPresetChange: (preset: RangePreset) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onCompareToggle: () => void;
  onCompareModeChange: (mode: CompareMode) => void;
  onCompareStartDateChange: (value: string) => void;
  onCompareEndDateChange: (value: string) => void;
  hiddenPresets?: RangePreset[];
  footer?: ReactNode;
}

export function RangeComparisonCard({
  rangePreset,
  startDate,
  endDate,
  compareEnabled,
  compareMode,
  compareStartDate,
  compareEndDate,
  rangeLabel,
  compareLabel,
  onPresetChange,
  onStartDateChange,
  onEndDateChange,
  onCompareToggle,
  onCompareModeChange,
  onCompareStartDateChange,
  onCompareEndDateChange,
  hiddenPresets = [],
  footer,
}: RangeComparisonCardProps) {
  const visibleOptions = PRESET_OPTIONS.filter(
    (option) => !hiddenPresets.includes(option.value),
  );
  const isCustomRange = rangePreset === "custom";

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 space-y-3">
      {/* ── Row 1: Date range selector ── */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={rangePreset}
          onValueChange={(value) => onPresetChange(value as RangePreset)}
        >
          <SelectTrigger className="w-[160px] h-9 border-slate-800 bg-slate-950 text-slate-200 text-xs hover:border-slate-700 transition-colors">
            <div className="flex items-center gap-2">
              <CalendarRange className="h-3.5 w-3.5 text-slate-500" />
              <SelectValue placeholder="Select range" />
            </div>
          </SelectTrigger>
          <SelectContent className="border-slate-800 bg-slate-900 text-slate-200 text-xs">
            {visibleOptions.map((option) => (
              <SelectItem key={option.value} value={option.value} className="text-xs">
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isCustomRange && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(event) => {
                onPresetChange("custom");
                onStartDateChange(event.target.value);
              }}
              className="h-9 w-[140px] border-slate-800 bg-slate-950 text-xs text-slate-200 [color-scheme:dark]"
            />
            <span className="text-slate-600 text-xs">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(event) => {
                onPresetChange("custom");
                onEndDateChange(event.target.value);
              }}
              className="h-9 w-[140px] border-slate-800 bg-slate-950 text-xs text-slate-200 [color-scheme:dark]"
            />
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Compare toggle */}
        <div className="flex items-center gap-2">
          <GitCompare className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-xs text-slate-400">Compare</span>
          <Switch
            checked={compareEnabled}
            onToggle={onCompareToggle}
            srText="Toggle comparison"
            className="data-[state=checked]:bg-indigo-600 data-[state=unchecked]:bg-slate-800"
          />
        </div>
      </div>

      {/* ── Row 2: Compare range (only when compare is ON) ── */}
      {compareEnabled && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-3 rounded-md border border-indigo-900/30 bg-indigo-950/10 px-3 py-2.5",
          )}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
            Compare to
          </span>

          <Select
            value={compareMode}
            onValueChange={(value) => onCompareModeChange(value as CompareMode)}
          >
            <SelectTrigger className="w-[170px] h-8 border-slate-800 bg-slate-950 text-slate-200 text-xs hover:border-slate-700 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-800 bg-slate-900 text-slate-200 text-xs">
              <SelectItem value="auto" className="text-xs">
                Previous period (auto)
              </SelectItem>
              <SelectItem value="custom" className="text-xs">
                Custom dates
              </SelectItem>
            </SelectContent>
          </Select>

          {compareMode === "custom" && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={compareStartDate}
                onChange={(event) => onCompareStartDateChange(event.target.value)}
                className="h-8 w-[140px] border-slate-800 bg-slate-950 text-xs text-slate-200 [color-scheme:dark]"
              />
              <span className="text-slate-600 text-xs">to</span>
              <Input
                type="date"
                value={compareEndDate}
                onChange={(event) => onCompareEndDateChange(event.target.value)}
                className="h-8 w-[140px] border-slate-800 bg-slate-950 text-xs text-slate-200 [color-scheme:dark]"
              />
            </div>
          )}

          {compareMode === "auto" && (
            <span className="text-xs text-slate-400">
              {compareLabel}
            </span>
          )}
        </div>
      )}

      {/* ── Row 3: Active range summary ── */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span className="font-medium text-slate-300">{rangeLabel}</span>
        {compareEnabled && (
          <>
            <span className="text-slate-600">vs</span>
            <span className="font-medium text-indigo-300">{compareLabel}</span>
          </>
        )}
      </div>

      {footer}
    </div>
  );
}
