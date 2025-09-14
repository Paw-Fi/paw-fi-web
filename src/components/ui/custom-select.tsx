"use client";

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className = "",
  disabled = false,
}: CustomSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={`w-full rounded-xl bg-white/10 backdrop-blur-sm p-4 text-white border-0 hover:bg-white/15 focus:ring-2 focus:ring-white/30 ${className}`}>
        <SelectValue placeholder={placeholder} className="text-purple-300" />
      </SelectTrigger>
      <SelectContent className="bg-white/10 backdrop-blur-xl border-0 rounded-xl">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="text-white hover:bg-white/10 focus:bg-white/10">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}