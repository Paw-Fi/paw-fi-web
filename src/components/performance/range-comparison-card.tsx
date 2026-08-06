import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

interface RangeComparisonCardProps {
  rangePreset: RangePreset;
  startDate: string;
  endDate: string;
  compareEnabled: boolean;
  rangeLabel: string;
  compareLabel: string;
  onPresetChange: (preset: RangePreset) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onCompareToggle: () => void;
  /**
   * Optional preset values to hide. By default all presets are shown.
   * Example: `hiddenPresets={["this_month"]}` for pages without it.
   */
  hiddenPresets?: RangePreset[];
  /** Optional extra content rendered at the bottom of the card (e.g. warnings). */
  footer?: ReactNode;
}

export function RangeComparisonCard({
  rangePreset,
  startDate,
  endDate,
  compareEnabled,
  rangeLabel,
  compareLabel,
  onPresetChange,
  onStartDateChange,
  onEndDateChange,
  onCompareToggle,
  hiddenPresets = [],
  footer,
}: RangeComparisonCardProps) {
  const visibleOptions = PRESET_OPTIONS.filter(
    (option) => !hiddenPresets.includes(option.value),
  );

  return (
    <Card className="border-white/10 bg-slate-900/50">
      <CardHeader>
        <CardDescription className="text-xs tracking-[0.25em] text-white/60 uppercase">
          Date Filter
        </CardDescription>
        <CardTitle className="mt-1 text-xl text-white">
          Range & Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Select
            value={rangePreset}
            onValueChange={(value) => onPresetChange(value as RangePreset)}
          >
            <SelectTrigger className="border-white/10 bg-black/20 text-white">
              <SelectValue placeholder="Preset" />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-slate-900 text-white">
              {visibleOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={startDate}
            onChange={(event) => {
              onPresetChange("custom");
              onStartDateChange(event.target.value);
            }}
            className="border-white/10 bg-black/20 text-white"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(event) => {
              onPresetChange("custom");
              onEndDateChange(event.target.value);
            }}
            className="border-white/10 bg-black/20 text-white"
          />
          <Button
            variant={compareEnabled ? "default" : "outline"}
            className="justify-start"
            onClick={onCompareToggle}
          >
            Compare previous period
          </Button>
        </div>
        <div className="text-xs text-white/60">
          <span className="text-white/80">Current:</span> {rangeLabel}
          {compareEnabled ? (
            <span>
              {" "}
              <span className="text-white/80">Compare:</span> {compareLabel}
            </span>
          ) : null}
        </div>
        {footer}
      </CardContent>
    </Card>
  );
}
