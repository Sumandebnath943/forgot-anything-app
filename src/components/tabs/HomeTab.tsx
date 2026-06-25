import { HeroGreeting } from '@/components/HeroGreeting';
import { ModeSelector } from '@/components/ModeSelector';
import { StatusBar } from '@/components/StatusBar';
import { ItemGrid } from '@/components/ItemGrid';
import { CustomItemsSection } from '@/components/CustomItemsSection';
import { Separator } from '@/components/ui/separator';
import { ReminderMode, TripSettings, DailySettings } from '@/types/reminder';
import { motion } from 'framer-motion';

interface HomeTabProps {
  mode: ReminderMode;
  setMode: (mode: ReminderMode) => void;
  currentSettings: TripSettings | DailySettings;
  handleToggleActive: () => void;
  handleToggleItem: (id: string) => void;
  onSettingsClick: () => void;
}

export function HomeTab({
  mode,
  setMode,
  currentSettings,
  handleToggleActive,
  handleToggleItem,
  onSettingsClick,
}: HomeTabProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 pb-12"
    >
      <HeroGreeting onSettingsClick={onSettingsClick} />
      
      <section>
        <ModeSelector mode={mode} onModeChange={setMode} />
      </section>

      <section>
        <StatusBar
          isActive={currentSettings.isActive}
          selectedCount={currentSettings.selectedItems.length}
          onToggleActive={handleToggleActive}
          mode={mode}
        />
      </section>

      <Separator className="bg-border/50" />

      <section>
        <h2 className="font-display text-xl font-bold text-foreground mb-4">
          {mode === 'trip' ? "What are you packing?" : "Daily essentials"}
        </h2>
        <ItemGrid
          selectedItems={currentSettings.selectedItems}
          onToggleItem={handleToggleItem}
        />
      </section>

      <section>
        <CustomItemsSection
          selectedItems={currentSettings.selectedItems}
          onToggleItem={handleToggleItem}
        />
      </section>

      <section className="text-center text-sm text-muted-foreground pt-4 pb-8">
        <p className="glass inline-block px-6 py-3 rounded-full">
          {mode === 'trip'
            ? "You'll be reminded about these items when you leave home during your trip dates."
            : "You'll be reminded about these items every day when you leave home."}
        </p>
      </section>
    </motion.div>
  );
}
