export function BackgroundShapes() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-pattern-abstract">
      {/* Primary blob - top right */}
      <div 
        className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-40 animate-float"
        style={{ 
          background: 'radial-gradient(circle, hsl(155 70% 30% / 0.5) 0%, transparent 70%)',
          animationDelay: '0s'
        }}
      />
      
      {/* Accent blob - bottom left */}
      <div 
        className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-30 animate-float-delayed"
        style={{ 
          background: 'radial-gradient(circle, hsl(45 95% 55% / 0.15) 0%, transparent 70%)',
          animationDelay: '2s'
        }}
      />
      
      {/* Small decorative blob - center */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full opacity-30 animate-float-slow"
        style={{ 
          background: 'radial-gradient(circle, hsl(160 80% 25% / 0.4) 0%, transparent 70%)',
          animationDelay: '1s'
        }}
      />

      {/* Additional subtle shape */}
      <div 
        className="absolute top-1/4 left-1/4 w-48 h-48 rounded-full opacity-20 animate-float"
        style={{ 
          background: 'radial-gradient(circle, hsl(45 95% 55% / 0.2) 0%, transparent 70%)',
          animationDelay: '3s'
        }}
      />
    </div>
  );
}