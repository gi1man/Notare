import React from 'react';
import * as Icons from 'lucide-react';

interface IconRendererProps {
  name: string;
  className?: string;
  size?: number;
}

export const IconRenderer: React.FC<IconRendererProps> = ({ name, className = 'w-6 h-6', size }) => {
  const IconComponent = (Icons as Record<string, any>)[name] || Icons.CircleDot;
  return <IconComponent className={className} size={size} />;
};
