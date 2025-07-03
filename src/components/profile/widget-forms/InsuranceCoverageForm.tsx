import React, { useState, useEffect } from 'react';
import { IInsuranceCoverageItem, IInsuranceCoverageWidget } from '../types/dashboard-data.typings';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripVertical, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WidgetFormProps } from './types';

// Props for a single sortable item
interface SortableInsuranceItemProps {
  item: IInsuranceCoverageItem;
  children: React.ReactNode;
}

// The Sortable Item component using dnd-kit
const SortableInsuranceItem: React.FC<SortableInsuranceItemProps> = ({ item, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start space-x-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-3 shadow-sm">
      <button type="button" {...attributes} {...listeners} className="cursor-grab p-3 touch-none">
        <FontAwesomeIcon icon={faGripVertical} />
      </button>
      <div className="flex-grow">{children}</div>
    </div>
  );
};

// The main form component
export const InsuranceCoverageForm: React.FC<WidgetFormProps<IInsuranceCoverageWidget>> = ({ data: widgetData, onDataChange }) => {
  // Initialize state from the items array in the nested data object
  const [items, setItems] = useState<IInsuranceCoverageItem[]>(widgetData.data?.items || []);
  const [showPremiums, setShowPremiums] = useState<boolean>(widgetData.data?.showPremiums ?? true);
  const [showRenewalDates, setShowRenewalDates] = useState<boolean>(widgetData.data?.showRenewalDates ?? true);

  // Effect to sync state if the prop changes from outside
  useEffect(() => {
    setItems(widgetData.data?.items || []);
    setShowPremiums(widgetData.data?.showPremiums ?? true);
    setShowRenewalDates(widgetData.data?.showRenewalDates ?? true);
  }, [widgetData.data?.items, widgetData.data?.showPremiums, widgetData.data?.showRenewalDates]);

  // Update parent component with changes
  const propagateChanges = (updatedItems: IInsuranceCoverageItem[], updatedShowPremiums?: boolean, updatedShowRenewalDates?: boolean) => {
    // Use the IInsuranceCoverageData structure with all properties nested in data
    const newData = {
      ...widgetData,
      data: { 
        items: updatedItems,
        showPremiums: updatedShowPremiums !== undefined ? updatedShowPremiums : showPremiums,
        showRenewalDates: updatedShowRenewalDates !== undefined ? updatedShowRenewalDates : showRenewalDates,
      }
    };
    onDataChange(newData);
  };

  // Generic handler for changing any field in an item
  const handleItemChange = (id: string, field: keyof IInsuranceCoverageItem, value: any) => {
    const newItems = items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setItems(newItems);
    propagateChanges(newItems);
  };

  // Adds a new, empty insurance item
  const addItem = () => {
    const newItem: IInsuranceCoverageItem = {
      id: `ins-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'New Insurance',
      provider: '',
      coverage: '',
      premium: 0,
      status: 'Adequate',
      suggestion: '',
      renewalDate: new Date().toISOString().split('T')[0],
      displayOrder: items.length, // Set initial display order
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    propagateChanges(newItems);
  };

  // Removes an item by its ID
  const removeItem = (id: string) => {
    const newItems = items.filter(item => item.id !== id).map((item, index) => ({
      ...item,
      displayOrder: index // Update display order after removal
    }));
    setItems(newItems);
    propagateChanges(newItems);
  };

  // Toggle handlers for display options
  const handleShowPremiumsChange = (value: boolean) => {
    setShowPremiums(value);
    propagateChanges(items, value, showRenewalDates);
  };

  const handleShowRenewalDatesChange = (value: boolean) => {
    setShowRenewalDates(value);
    propagateChanges(items, showPremiums, value);
  };

  // dnd-kit sensors for pointer and keyboard
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // dnd-kit drag end handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return; // Safety check

      // Reorder the array and update the displayOrder property for each item
      const reorderedItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({ 
        ...item, 
        displayOrder: index 
      }));
      setItems(reorderedItems);
      propagateChanges(reorderedItems);
    }
  };

  return (
    <div className="space-y-6 p-1">
      {/* Display options */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="showPremiums"
            checked={showPremiums}
            onChange={(e) => handleShowPremiumsChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <Label htmlFor="showPremiums">Show Premium Amounts</Label>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="showRenewalDates"
            checked={showRenewalDates}
            onChange={(e) => handleShowRenewalDatesChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <Label htmlFor="showRenewalDates">Show Renewal Dates</Label>
        </div>
      </div>

      {/* Sortable insurance items */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map(item => (
            <SortableInsuranceItem key={item.id} item={item}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Form Fields */}
                <div>
                  <Label htmlFor={`type-${item.id}`}>Insurance Type</Label>
                  <Input
                    id={`type-${item.id}`}
                    value={item.type || ''}
                    onChange={e => handleItemChange(item.id, 'type', e.target.value)}
                    placeholder="e.g., Health Insurance"
                  />
                </div>
                <div>
                  <Label htmlFor={`provider-${item.id}`}>Provider</Label>
                  <Input
                    id={`provider-${item.id}`}
                    value={item.provider || ''}
                    onChange={e => handleItemChange(item.id, 'provider', e.target.value)}
                    placeholder="e.g., MediCare Plus"
                  />
                </div>
                <div>
                  <Label htmlFor={`coverage-${item.id}`}>Coverage Details</Label>
                  <Input
                    id={`coverage-${item.id}`}
                    value={item.coverage || ''}
                    onChange={e => handleItemChange(item.id, 'coverage', e.target.value)}
                    placeholder="e.g., $1M annual limit, $5k deductible"
                  />
                </div>
                <div>
                  <Label htmlFor={`premium-${item.id}`}>Monthly Premium ($)</Label>
                  <Input
                    id={`premium-${item.id}`}
                    type="number"
                    value={item.premium || 0}
                    onChange={e => handleItemChange(item.id, 'premium', parseFloat(e.target.value) || 0)}
                    placeholder="e.g., 350"
                  />
                </div>
                <div>
                  <Label htmlFor={`status-${item.id}`}>Status</Label>
                  <Select
                    onValueChange={(value) => handleItemChange(item.id, 'status', value)}
                    value={item.status || 'Adequate'}
                    options={[]}
                  >
                    <SelectTrigger id={`status-trigger-${item.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Adequate">Adequate</SelectItem>
                      <SelectItem value="Review Recommended">Review Recommended</SelectItem>
                      <SelectItem value="Insufficient">Insufficient</SelectItem>
                      <SelectItem value="Excellent">Excellent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`renewalDate-${item.id}`}>Renewal Date</Label>
                  <Input
                    id={`renewalDate-${item.id}`}
                    type="date"
                    value={item.renewalDate?.split('T')[0] || ''}
                    onChange={e => handleItemChange(item.id, 'renewalDate', e.target.value)}
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <Label htmlFor={`suggestion-${item.id}`}>Suggestion/Notes</Label>
                  <Textarea
                    id={`suggestion-${item.id}`}
                    value={item.suggestion || ''}
                    onChange={e => handleItemChange(item.id, 'suggestion', e.target.value)}
                    placeholder="e.g., Shop for better rates or increased liability."
                  />
                </div>
              </div>
              <div className="flex justify-end mt-3">
                 <FontAwesomeIcon
                      type="button"
                      icon={faTrash}
                      onClick={() => removeItem(item.id)}
                      className="ml-2 text-red-500 hover:text-red-700 cursor-pointer"
                    
                    />
              </div>
            </SortableInsuranceItem>
          ))}
        </SortableContext>
      </DndContext>
      
      {/* Add new policy button */}
      <Button type="button" onClick={addItem} variant="outline" className="w-full">
        <FontAwesomeIcon icon={faPlus} className="mr-2" />
        Add New Policy
      </Button>
    </div>
  );
};
