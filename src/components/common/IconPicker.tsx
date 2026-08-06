import React, { useState } from 'react';
import { IconRenderer } from './IconRenderer';
import { Search, Check } from 'lucide-react';

export const ALL_ICONS: string[] = [
  'Dumbbell',
  'Footprints',
  'Activity',
  'Bike',
  'Flame',
  'Trophy',
  'Target',
  'HeartPulse',
  'Timer',
  'Zap',
  'Award',
  'Mountain',
  'Apple',
  'Heart',
  'Smile',
  'Moon',
  'Sun',
  'Droplet',
  'Sparkles',
  'Utensils',
  'Coffee',
  'ShowerHead',
  'ShieldCheck',
  'Brain',
  'BookOpen',
  'GraduationCap',
  'Lightbulb',
  'Library',
  'Newspaper',
  'FileText',
  'PenTool',
  'Bookmark',
  'Compass',
  'Palette',
  'Music',
  'Camera',
  'Guitar',
  'Mic',
  'Scissors',
  'Film',
  'Radio',
  'Paintbrush',
  'Home',
  'Sprout',
  'Hammer',
  'Trees',
  'Flower2',
  'Building',
  'Bed',
  'Trash2',
  'Key',
  'Dog',
  'Cat',
  'Briefcase',
  'FolderCheck',
  'Calendar',
  'DollarSign',
  'CreditCard',
  'TrendingUp',
  'BarChart3',
  'Mail',
  'Phone',
  'Laptop',
  'Tv',
  'Gamepad2',
  'Smartphone',
  'Headphones',
  'Wine',
  'Beer',
  'Gift',
  'SmilePlus',
  'Car',
  'Plane',
  'MapPin',
  'Globe',
  'Users',
  'MessageCircle',
  'ShoppingBag',
];

interface IconPickerProps {
  selectedIcon: string;
  onSelectIcon: (iconName: string) => void;
}

export const IconPicker: React.FC<IconPickerProps> = ({ selectedIcon, onSelectIcon }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredIcons = ALL_ICONS.filter((icon) =>
    icon.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="space-y-3">
      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search all icons..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-sky-500"
        />
      </div>

      {/* Unified All-Icons Grid */}
      <div className="max-h-52 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-900/50">
        {filteredIcons.length === 0 ? (
          <div className="text-center py-4 text-slate-400 text-xs italic">
            No icons matching "{searchQuery}"
          </div>
        ) : (
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
            {filteredIcons.map((icon) => {
              const isSelected = selectedIcon === icon;
              return (
                <button
                  type="button"
                  key={icon}
                  onClick={() => onSelectIcon(icon)}
                  title={icon}
                  className={`relative p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all tap-target ${
                    isSelected
                      ? 'border-sky-600 bg-sky-100 text-sky-700 dark:bg-sky-900/80 dark:text-sky-200 ring-2 ring-sky-500 scale-105'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <IconRenderer name={icon} className="w-5 h-5" />
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 bg-sky-600 text-white rounded-full p-0.5 shadow">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
