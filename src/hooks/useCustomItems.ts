import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface CustomItem {
  id: string;
  name: string;
  icon: string;
  category: string;
  created_at: string;
  updated_at: string;
}

const STORAGE_KEY = 'forgetmenot_custom_items';

export function useCustomItems() {
  const [items, setItems] = useState<CustomItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchItems = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load custom items from local storage', e);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const saveItems = (newItems: CustomItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
      setItems(newItems);
    } catch (e) {
      console.error('Failed to save custom items', e);
      toast({
        title: 'Storage Error',
        description: 'Failed to save your item locally.',
        variant: 'destructive',
      });
    }
  };

  const addItem = async (name: string, icon: string): Promise<boolean> => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast({
        title: 'Invalid name',
        description: 'Please enter a name for your item.',
        variant: 'destructive',
      });
      return false;
    }

    if (trimmedName.length > 30) {
      toast({
        title: 'Name too long',
        description: 'Item name must be 30 characters or less.',
        variant: 'destructive',
      });
      return false;
    }

    const newItem: CustomItem = {
      id: crypto.randomUUID(),
      name: trimmedName,
      icon: icon || '📦',
      category: 'custom',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveItems([...items, newItem]);

    toast({
      title: 'Item added',
      description: `"${trimmedName}" has been added to your items.`,
    });
    return true;
  };

  const updateItem = async (id: string, name: string, icon: string): Promise<boolean> => {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 30) return false;

    const newItems = items.map((item) =>
      item.id === id ? { ...item, name: trimmedName, icon, updated_at: new Date().toISOString() } : item
    );
    
    saveItems(newItems);
    return true;
  };

  const deleteItem = async (id: string): Promise<boolean> => {
    const newItems = items.filter((item) => item.id !== id);
    saveItems(newItems);

    toast({
      title: 'Item deleted',
      description: 'The item has been removed.',
    });
    return true;
  };

  return {
    items,
    isLoading,
    addItem,
    updateItem,
    deleteItem,
    refetch: fetchItems,
  };
}
