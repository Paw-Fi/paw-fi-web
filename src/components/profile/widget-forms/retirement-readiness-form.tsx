import React, { useState, useEffect } from 'react';
import {
  IRetirementReadinessWidget,
  IRetirementReadinessData,
  IRetirementScenario,
} from '../types/dashboard-data.typings';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, type SelectOption } from "@/components/ui/select";

export interface RetirementReadinessFormProps {
  data: IRetirementReadinessWidget;
  onDataChange: (updatedWidget: IRetirementReadinessWidget) => void;
}

export function RetirementReadinessForm({ data, onDataChange }: RetirementReadinessFormProps) {
  const [formData, setFormData] = useState<IRetirementReadinessData>(() => {
    const initialScenarios = data.data?.scenarios || [];
    const initialCurrentScenarioId = data.data?.currentScenarioId || '';
    // Ensure currentScenarioId is valid or reset if not found in initialScenarios
    const validCurrentScenarioId = initialScenarios.find(s => s.id === initialCurrentScenarioId)
      ? initialCurrentScenarioId
      : (initialScenarios.length > 0 ? initialScenarios[0].id : '');
    return {
      scenarios: initialScenarios,
      currentScenarioId: validCurrentScenarioId,
    };
  });

  useEffect(() => {
    if (data.data) {
      const newScenarios = data.data.scenarios || [];
      const newCurrentScenarioId = data.data.currentScenarioId || '';
      // Ensure currentScenarioId is valid or reset
      const validNewCurrentScenarioId = newScenarios.find(s => s.id === newCurrentScenarioId)
        ? newCurrentScenarioId
        : (newScenarios.length > 0 ? newScenarios[0].id : '');
      setFormData({
        scenarios: newScenarios,
        currentScenarioId: validNewCurrentScenarioId,
      });
    } else {
      setFormData({ scenarios: [], currentScenarioId: '' });
    }
  }, [data.data]);

  const handleScenarioChange = (index: number, field: keyof IRetirementScenario, value: string | number) => {
    const updatedScenarios = [...formData.scenarios];
    // Type assertion to satisfy TypeScript for numeric fields
    if (field === 'score' || field === 'projectionAmount' || field === 'displayOrder') {
      (updatedScenarios[index] as any)[field] = Number(value);
    } else {
      (updatedScenarios[index] as any)[field] = value;
    }
    onDataChange({ ...data, data: { ...formData, scenarios: updatedScenarios } });
  };

  const handleCurrentScenarioIdChange = (value: string | undefined) => {
    if (value === undefined) {
      // Optionally handle undefined case, e.g., log an error or do nothing
      // Given current logic, currentScenarioId should always be a valid string from the list
      console.warn('handleCurrentScenarioIdChange received undefined, which was not expected.');
      return;
    }
    onDataChange({ ...data, data: { ...formData, currentScenarioId: value } });
  };

  const inputClasses = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 dark:bg-slate-700 dark:border-slate-600";
  const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300";

    const selectOptions: SelectOption[] = React.useMemo(() => 
    formData.scenarios.map(scenario => ({
      value: scenario.id,
      label: `${scenario.scenarioName} (ID: ${scenario.id})`, 
      disabled: false, 
    })),
    [formData.scenarios]
  );

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="currentScenarioIdSelect" className={labelClasses}>Current Scenario</Label>
        <Select 
          value={formData.currentScenarioId} 
          onValueChange={handleCurrentScenarioIdChange}
          options={selectOptions}
          placeholder="Select current scenario"
        >
          <SelectTrigger id="currentScenarioIdSelect" className={inputClasses}>
            <SelectValue /> {/* SelectTrigger will display selected value or placeholder from context */}
          </SelectTrigger>
          <SelectContent>
            {formData.scenarios.map(scenario => (
              <SelectItem key={scenario.id} value={scenario.id}>
                {scenario.scenarioName} (ID: {scenario.id})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {formData.scenarios.map((scenario, index) => (
        <div key={scenario.id} className="space-y-4 p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Scenario: {scenario.scenarioName || `Scenario ${index + 1}`}</h3>
          <div>
            <Label htmlFor={`scenario-${index}-id`} className={labelClasses}>Scenario ID (Read-only)</Label>
            <Input
              id={`scenario-${index}-id`}
              type="text"
              value={scenario.id}
              readOnly
              className={`${inputClasses} bg-gray-100 dark:bg-slate-800`}
            />
          </div>
          <div>
            <Label htmlFor={`scenario-${index}-name`} className={labelClasses}>Scenario Name</Label>
            <Input
              id={`scenario-${index}-name`}
              type="text"
              value={scenario.scenarioName}
              onChange={(e) => handleScenarioChange(index, 'scenarioName', e.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <Label htmlFor={`scenario-${index}-score`} className={labelClasses}>Score</Label>
            <Input
              id={`scenario-${index}-score`}
              type="number"
              value={scenario.score}
              onChange={(e) => handleScenarioChange(index, 'score', e.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <Label htmlFor={`scenario-${index}-status`} className={labelClasses}>Status</Label>
            <Input
              id={`scenario-${index}-status`}
              type="text"
              value={scenario.status}
              onChange={(e) => handleScenarioChange(index, 'status', e.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <Label htmlFor={`scenario-${index}-projectionAmount`} className={labelClasses}>Projection Amount</Label>
            <Input
              id={`scenario-${index}-projectionAmount`}
              type="number"
              value={scenario.projectionAmount}
              onChange={(e) => handleScenarioChange(index, 'projectionAmount', e.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <Label htmlFor={`scenario-${index}-projectionDate`} className={labelClasses}>Projection Date</Label>
            <Input
              id={`scenario-${index}-projectionDate`}
              type="text"
              value={scenario.projectionDate}
              onChange={(e) => handleScenarioChange(index, 'projectionDate', e.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <Label htmlFor={`scenario-${index}-explanation`} className={labelClasses}>Explanation</Label>
            <textarea
              id={`scenario-${index}-explanation`}
              value={scenario.explanation}
              onChange={(e) => handleScenarioChange(index, 'explanation', e.target.value)}
              rows={3}
              className={`${inputClasses} min-h-[60px]`}
            />
          </div>
          <div>
            <Label htmlFor={`scenario-${index}-assumptions`} className={labelClasses}>Assumptions</Label>
            <textarea
              id={`scenario-${index}-assumptions`}
              value={scenario.assumptions}
              onChange={(e) => handleScenarioChange(index, 'assumptions', e.target.value)}
              rows={2}
              className={`${inputClasses} min-h-[40px]`}
            />
          </div>
           <div>
            <Label htmlFor={`scenario-${index}-displayOrder`} className={labelClasses}>Display Order</Label>
            <Input
              id={`scenario-${index}-displayOrder`}
              type="number"
              value={scenario.displayOrder}
              onChange={(e) => handleScenarioChange(index, 'displayOrder', e.target.value)}
              className={inputClasses}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
