import { memo } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReminderItem } from '@/types/reminder';
import { motion } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface ItemCardProps {
  item: ReminderItem;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

export const ItemCard = memo(function ItemCard({ item, isSelected, onToggle }: ItemCardProps) {
  const handleToggle = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      // Ignore if haptics aren't available
    }
    onToggle(item.id);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={handleToggle}
      className={cn(
        'relative w-full rounded-full py-3 px-4 flex items-center gap-3 transition-colors duration-300',
        'border',
        isSelected
          ? 'btn-gold shadow-md'
          : 'card-glass'
      )}
    >
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-full transition-colors duration-300",
        isSelected ? "bg-primary text-primary-foreground" : "bg-white/10 text-white/70"
      )}>
        <span className={cn(
          "text-xl transition-transform duration-300",
          isSelected && "scale-110"
        )}>{item.icon}</span>
      </div>
      
      <span className={cn(
        "text-sm font-bold flex-1 text-left line-clamp-1",
        isSelected ? "text-primary-foreground" : "text-foreground"
      )}>
        {item.name}
      </span>

      <motion.div
        initial={false}
        animate={{ scale: isSelected ? 1 : 0 }}
        className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0"
      >
        {isSelected && <Check className="w-3.5 h-3.5 text-primary" strokeWidth={3} />}
      </motion.div>
    </motion.button>
  );
});