import {
  Activity,
  Bot,
  CheckCircle2,
  Dumbbell,
  LayoutDashboard,
  RefreshCw,
  Settings,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import type { IntegrationsState, LanguageCode, PageKey } from '../types/runtrack';
import { t } from '../i18n/translations';

interface HeaderProps {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  language: LanguageCode;
  integrations: IntegrationsState;
  isSyncing: boolean;
  justSynced: boolean;
  onSyncGarmin: () => void;
}

export function Header({
  currentPage,
  onNavigate,
  language,
  integrations,
  isSyncing,
  justSynced,
  onSyncGarmin,
}: HeaderProps) {
  const navItems: { key: PageKey; labelKey: string; Icon: typeof LayoutDashboard }[] = [
    { key: 'dashboard', labelKey: 'nav_dashboard', Icon: LayoutDashboard },
    { key: 'analytics', labelKey: 'nav_analytics', Icon: TrendingUp },
    { key: 'training', labelKey: 'nav_training', Icon: Dumbbell },
    { key: 'coach', labelKey: 'nav_coach', Icon: Bot },
    { key: 'predictions', labelKey: 'nav_predictions', Icon: Trophy },
    { key: 'settings', labelKey: 'nav_settings', Icon: Settings },
  ];

  const syncTime = integrations.garmin.lastSync?.split('·')[1]?.trim() ?? '06:42';

  return (
    <header className="sticky top-0 z-40 w-full bg-surface-dim border-b border-outline-variant shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2.5 shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary whitespace-nowrap"
        >
          <span className="w-8 h-8 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" aria-hidden="true" />
          </span>
          <span className="text-[19px] font-bold text-on-surface tracking-tight">
            RunTrack <span className="text-primary">AI</span>
          </span>
        </button>

        <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-1 lg:gap-1.5">
          {navItems.map(({ key, labelKey, Icon }) => {
            const active = currentPage === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onNavigate(key)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap shrink-0 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  active
                    ? 'bg-surface-container-high text-primary border border-outline'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{t(language, labelKey)}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <span
            role="status"
            className="hidden xl:inline-flex items-center gap-1.5 text-xs font-medium text-on-surface-variant whitespace-nowrap"
          >
            <CheckCircle2
              className={`w-3.5 h-3.5 ${integrations.garmin.connected ? 'text-primary' : 'text-outline'}`}
              aria-hidden="true"
            />
            <span>
              {integrations.garmin.connected
                ? `${t(language, 'garmin_synced')} · ${syncTime}`
                : t(language, 'garmin_disconnected')}
            </span>
          </span>

          <button
            type="button"
            onClick={onSyncGarmin}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-primary-container text-on-primary-container hover:opacity-90 disabled:opacity-70 text-sm font-semibold whitespace-nowrap shrink-0 transition-opacity duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <RefreshCw className={`w-4 h-4 shrink-0 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>
              {isSyncing
                ? t(language, 'btn_syncing')
                : justSynced
                  ? t(language, 'btn_synced')
                  : t(language, 'btn_sync_garmin')}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('settings')}
            aria-label={t(language, 'nav_settings')}
            className={`md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              currentPage === 'settings'
                ? 'bg-surface-container-high text-primary border-primary-container'
                : 'bg-surface-container-high text-on-surface border-outline-variant hover:bg-surface-bright'
            }`}
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
