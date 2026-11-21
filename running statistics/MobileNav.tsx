import { Bot, Dumbbell, LayoutDashboard, TrendingUp, Trophy } from 'lucide-react';
import type { LanguageCode, PageKey } from '../types/runtrack';
import { t } from '../i18n/translations';

interface MobileNavProps {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  language: LanguageCode;
}

export function MobileNav({ currentPage, onNavigate, language }: MobileNavProps) {
  const items: { key: PageKey; labelKey: string; Icon: typeof LayoutDashboard }[] = [
    { key: 'dashboard', labelKey: 'nav_dashboard', Icon: LayoutDashboard },
    { key: 'analytics', labelKey: 'nav_analytics', Icon: TrendingUp },
    { key: 'training', labelKey: 'nav_training', Icon: Dumbbell },
    { key: 'coach', labelKey: 'nav_coach', Icon: Bot },
    { key: 'predictions', labelKey: 'nav_predictions', Icon: Trophy },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-surface-dim border-t border-outline-variant px-2 py-1.5 grid grid-cols-5 gap-1"
    >
      {items.map(({ key, labelKey, Icon }) => {
        const active = currentPage === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onNavigate(key)}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              active
                ? 'text-primary bg-surface-container-high'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="truncate max-w-full px-0.5">{t(language, labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );
}
