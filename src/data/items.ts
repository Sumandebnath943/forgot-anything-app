import { ReminderItem } from '@/types/reminder';

export const reminderItems: ReminderItem[] = [
  // Essentials
  { id: 'keys', name: 'Keys', icon: '🔑', category: 'essentials' },
  { id: 'wallet', name: 'Wallet', icon: '👛', category: 'essentials' },
  { id: 'phone', name: 'Phone', icon: '📱', category: 'essentials' },
  { id: 'watch', name: 'Watch', icon: '⌚', category: 'essentials' },
  { id: 'glasses', name: 'Glasses', icon: '👓', category: 'essentials' },
  { id: 'sunglasses', name: 'Sunglasses', icon: '🕶️', category: 'essentials' },
  
  // Tech
  { id: 'laptop', name: 'Laptop', icon: '💻', category: 'tech' },
  { id: 'tablet', name: 'Tablet', icon: '📲', category: 'tech' },
  { id: 'charger', name: 'Charger', icon: '🔌', category: 'tech' },
  { id: 'earbuds', name: 'Earbuds', icon: '🎧', category: 'tech' },
  { id: 'powerbank', name: 'Power Bank', icon: '🔋', category: 'tech' },
  { id: 'camera', name: 'Camera', icon: '📷', category: 'tech' },
  
  // Personal
  { id: 'backpack', name: 'Backpack', icon: '🎒', category: 'personal' },
  { id: 'umbrella', name: 'Umbrella', icon: '☂️', category: 'personal' },
  { id: 'waterbottle', name: 'Water Bottle', icon: '💧', category: 'personal' },
  { id: 'lunch', name: 'Lunch Box', icon: '🍱', category: 'personal' },
  { id: 'medicine', name: 'Medicine', icon: '💊', category: 'personal' },
  { id: 'mask', name: 'Mask', icon: '😷', category: 'personal' },
  
  // Work
  { id: 'idcard', name: 'ID Card', icon: '🪪', category: 'work' },
  { id: 'notebook', name: 'Notebook', icon: '📓', category: 'work' },
  { id: 'documents', name: 'Documents', icon: '📄', category: 'work' },
  { id: 'pen', name: 'Pen', icon: '🖊️', category: 'work' },
  { id: 'calculator', name: 'Calculator', icon: '🧮', category: 'work' },
  { id: 'usb', name: 'USB Drive', icon: '💾', category: 'work' },
];

export const categories = [
  { id: 'essentials', name: 'Essentials', icon: '⭐' },
  { id: 'tech', name: 'Tech', icon: '💻' },
  { id: 'personal', name: 'Personal', icon: '👤' },
  { id: 'work', name: 'Work', icon: '💼' },
] as const;
