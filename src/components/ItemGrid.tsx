import { useMemo } from 'react';
import { reminderItems, categories } from '@/data/items';
import { ItemCard } from './ItemCard';

interface ItemGridProps {
  selectedItems: string[];
  onToggleItem: (id: string) => void;
}

export function ItemGrid({ selectedItems, onToggleItem }: ItemGridProps) {
  // Convert to Set for O(1) lookups instead of O(n) .includes()
  const selectedSet = useMemo(() => new Set(selectedItems), [selectedItems]);

  return (
    <div className="space-y-6">
      {categories.map((category) => {
        const categoryItems = reminderItems.filter(
          (item) => item.category === category.id
        );

        return (
          <div key={category.id} className="animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{category.icon}</span>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {category.name}
              </h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {categoryItems.map((item) => (
                <div key={item.id} className="w-[calc(50%-0.375rem)] sm:w-[calc(33.333%-0.5rem)] md:w-auto min-w-[140px]">
                  <ItemCard
                    item={item}
                    isSelected={selectedSet.has(item.id)}
                    onToggle={onToggleItem}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
