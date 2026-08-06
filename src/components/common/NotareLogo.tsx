import React from 'react';

interface NotareLogoProps {
  variant?: 'ink' | 'parchment' | 'terracotta' | 'mark';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const NotareLogo: React.FC<NotareLogoProps> = ({
  variant = 'ink',
  size = 'md',
  showText = true,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xl',
    md: 'w-10 h-10 text-2xl',
    lg: 'w-14 h-14 text-4xl',
  }[size];

  const variantClasses = {
    ink: 'bg-notare-ink text-notare-parchment',
    parchment: 'bg-notare-parchment text-notare-ink border border-slate-300 dark:border-slate-700',
    terracotta: 'bg-notare-terracotta text-notare-parchment',
    mark: 'bg-notare-ink text-notare-parchment',
  }[variant];

  const macronColor = {
    ink: '#C75B39', // Terracotta
    parchment: '#C75B39', // Terracotta
    terracotta: '#F5F1E8', // Parchment
    mark: '#C75B39', // Terracotta
  }[variant];

  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* Icon Badge */}
      <div
        className={`${sizeClasses} ${variantClasses} rounded-2xl flex items-center justify-center font-serif-logo relative shadow-sm shrink-0 leading-none overflow-hidden`}
      >
        {variant === 'mark' ? (
          <div className="flex flex-col items-center justify-center gap-1">
            <span
              style={{ backgroundColor: macronColor }}
              className="w-4 h-1 rounded-full"
            />
            <span
              style={{ backgroundColor: macronColor }}
              className="w-1.5 h-1.5 rounded-full"
            />
          </div>
        ) : (
          <div className="relative pt-1 flex flex-col items-center justify-center">
            {/* Macron Bar Accent */}
            <span
              style={{ backgroundColor: macronColor }}
              className="absolute top-1 w-3.5 h-[2.5px] rounded-full"
            />
            {/* Lowercase serif 'n' */}
            <span className="font-serif-logo font-bold tracking-tight text-white">
              n
            </span>
          </div>
        )}
      </div>

      {/* Brand Text */}
      {showText && (
        <span className="text-xl font-bold font-serif-logo tracking-tight text-notare-ink dark:text-notare-parchment">
          notare
        </span>
      )}
    </div>
  );
};
