import { HelpCircle } from 'lucide-react';

export function Header() {
  return (
    <header className="text-center mb-8 animate-fade-in relative">
      {/* App Logo and Title */}
      <div className="inline-flex items-center justify-center w-18 h-18 rounded-2xl gradient-primary shadow-glow mb-4 p-4 glow-primary">
        <HelpCircle className="w-9 h-9 text-primary-foreground" />
      </div>
      <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-2">
        Forget Anything?
      </h1>
      <p className="text-muted-foreground max-w-md mx-auto">
        Never leave home without your essentials. Smart reminders that know when you're leaving.
      </p>
    </header>
  );
}