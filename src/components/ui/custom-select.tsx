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
  const defaultTriggerStyles = "w-full rounded-xl bg-white dark:bg-slate-900 backdrop-blur-sm text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:ring-2 focus:ring-[#7458FF]/30 transition-all duration-200";
  
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={`${defaultTriggerStyles} ${className}`}>
        <SelectValue 
          placeholder={placeholder} 
          className="text-slate-500 dark:text-slate-400" 
        />
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-slate-900 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50">
        {options.map((option) => (
          <SelectItem 
            key={option.value} 
            value={option.value} 
            className="text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}