import React, { useState, useEffect, FunctionComponent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { IInsuranceCoverageItem, IInsuranceCoverageWidget } from '../types/dashboard-data.typings';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGripVertical, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WidgetFormProps } from './types';

// Props for a single sortable item
interface SortableInsuranceItemProps {
  item: IInsuranceCoverageItem;
  children: React.ReactNode;
}

// The Sortable Item component using dnd-kit
const SortableInsuranceItem: FunctionComponent<SortableInsuranceItemProps> = ({ item, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start space-x-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-3 shadow-sm">
      <button {...attributes} {...listeners} className="cursor-grab p-3 touch-none">
        <FontAwesomeIcon icon={faGripVertical} />
      </button>
      <div className="flex-grow">{children}</div>
    </div>
  );
};

// The main form component
export const InsuranceCoverageForm: FunctionComponent<WidgetFormProps<IInsuranceCoverageWidget>> = ({ data: widgetData, onDataChange }) => {
  // Initialize state from the `items` array within the `data` object
  const [items, setItems] = useState<IInsuranceCoverageItem[]>(widgetData.data?.items || []);

  // Effect to sync state if the prop changes from outside
  useEffect(() => {
    setItems(widgetData.data?.items || []);
  }, [widgetData.data?.items]);

  // Generic handler for changing any field in an item
  const handleItemChange = (id: string, field: keyof IInsuranceCoverageItem, value: any) => {
    const newItems = items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setItems(newItems);
    onDataChange({ ...widgetData, data: { items: newItems } });
  };

  // Adds a new, empty insurance item
  const addItem = () => {
    const newItem: IInsuranceCoverageItem = {
      id: uuidv4(),
      policyName: '',
      provider: '',
      coverageAmount: 0,
      premium: 0,
      renewalDate: '',
      policyType: 'other',
      notes: '',
      displayOrder: items.length, // Set initial display order
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    onDataChange({ ...widgetData, data: { items: newItems } });
  };

  // Removes an item by its ID
  const removeItem = (id: string) => {
    const newItems = items.filter(item => item.id !== id);
    setItems(newItems);
    onDataChange({ ...widgetData, data: { items: newItems } });
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
      const newOrderedItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({ ...item, displayOrder: index }));
      setItems(newOrderedItems);
      onDataChange({ ...widgetData, data: { items: newOrderedItems } });
    }
  };

  return (
    <div className="space-y-6 p-1">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map(item => (
            <SortableInsuranceItem key={item.id} item={item}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Form Fields */}
                <div>
                  <Label htmlFor={`policyName-${item.id}`}>Policy Name</Label>
                  <Input
                    id={`policyName-${item.id}`}
                    value={item.policyName}
                    onChange={e => handleItemChange(item.id, 'policyName', e.target.value)}
                    placeholder="e.g., Comprehensive Auto"
                  />
                </div>
                <div>
                  <Label htmlFor={`provider-${item.id}`}>Provider</Label>
                  <Input
                    id={`provider-${item.id}`}
                    value={item.provider}
                    onChange={e => handleItemChange(item.id, 'provider', e.target.value)}
                    placeholder="e.g., Acme Insurance"
                  />
                </div>
                <div>
                  <Label htmlFor={`coverageAmount-${item.id}`}>Coverage Amount ($)</Label>
                  <Input
                    id={`coverageAmount-${item.id}`}
                    type="number"
                    value={item.coverageAmount}
                    onChange={e => handleItemChange(item.id, 'coverageAmount', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor={`premium-${item.id}`}>Premium ($)</Label>
                  <Input
                    id={`premium-${item.id}`}
                    type="number"
                    value={item.premium}
                    onChange={e => handleItemChange(item.id, 'premium', parseFloat(e.target.value) || 0)}
                  />
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
                <div>
                  <Label htmlFor={`policyType-${item.id}`}>Policy Type</Label>
                  <Select
                    onValueChange={(value: string) => handleItemChange(item.id, 'policyType', value)}
                    value={item.policyType}
                  >
                    <SelectTrigger id={`policyType-trigger-${item.id}`}>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="life">Life</SelectItem>
                      <SelectItem value="health">Health</SelectItem>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="home">Home</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <Label htmlFor={`notes-${item.id}`}>Notes</Label>
                  <Textarea
                    id={`notes-${item.id}`}
                    value={item.notes || ''}
                    onChange={e => handleItemChange(item.id, 'notes', e.target.value)}
                    placeholder="Add any relevant notes..."
                  />
                </div>
              </div>
              <div className="flex justify-end mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeItem(item.id)}
                  className="text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
                >
                  <FontAwesomeIcon icon={faTrash} className="mr-2 h-3 w-3" />
                  Remove
                </Button>
              </div>
            </SortableInsuranceItem>
          ))}
        </SortableContext>
      </DndContext>
      <Button onClick={addItem} variant="outline" className="w-full">
        <FontAwesomeIcon icon={faPlus} className="mr-2" />
        Add New Policy
      </Button>
    </div>
  );
};
