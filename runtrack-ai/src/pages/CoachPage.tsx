import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bot, CheckCircle2, Gauge, Heart, RefreshCw, Send, Trash2, TrendingUp } from 'lucide-react';
import type { AppState } from '../types/runtrack';
import { t } from '../i18n/translations';

interface CoachPageProps {
  state: AppState;
  onSendMessage: (message: string) => Promise<void>;
  onClearChat: () => Promise<void>;
  onRefreshInsights: () => Promise<void>;
}

export function CoachPage({
  state,
  onSendMessage,
  onClearChat,
  onRefreshInsights,
}: CoachPageProps) {
  const { preferences, insights, coachMessages, activities } = state;
  const { language } = preferences;
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [refreshingInsights, setRefreshingInsights] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [coachMessages.length]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setError(null);
    setSending(true);
    setInput('');
    try {
      await onSendMessage(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach AI Running Coach.');
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  };

  const handleRefreshInsights = async () => {
    setError(null);
    setRefreshingInsights(true);
    try {
      await onRefreshInsights();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to refresh insights.');
    } finally {
      setRefreshingInsights(false);
    }
  };

  const quickPrompts = [
    "How should I pace Wednesday's tempo?",
    'Why is my high-intensity share elevated?',
    'Build a 7-day plan for next week based on my HRV',
  ];

  const getBadgeColor = (badgeType: string) => {
    if (badgeType === 'warning') return 'text-warning';
    if (badgeType === 'info') return 'text-tertiary';
    return 'text-primary';
  };

  const getCategoryIcon = (badgeType: string) => {
    if (badgeType === 'warning') return TrendingUp;
    if (badgeType === 'info') return Gauge;
    return Heart;
  };

  return (
    <div className="flex flex-col gap-5 flex-1">
      <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
        <h1 className="text-[26px] leading-8 font-bold tracking-tight text-on-surface">
          {t(language, 'coach_title')}
        </h1>
        <span className="text-[13px] text-on-surface-variant">{t(language, 'coach_subtitle')}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch flex-1">
        {/* Personalized Data Insights (5 cols) */}
        <section aria-label="Personalized Running Insights" className="order-2 lg:order-1 lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[19px] font-bold text-on-surface">{t(language, 'key_insights')}</h2>
            <button
              type="button"
              onClick={handleRefreshInsights}
              disabled={refreshingInsights}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant hover:border-outline text-xs font-semibold text-on-surface disabled:opacity-60 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingInsights ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>{t(language, 'refresh_insights')}</span>
            </button>
          </div>

          {insights.map((item) => {
            const Icon = getCategoryIcon(item.badgeType);
            const colorClass = getBadgeColor(item.badgeType);
            return (
              <article
                key={item.id}
                className="bg-surface-container-low border border-outline-variant rounded-xl p-4 sm:p-5 flex flex-col gap-2.5"
              >
                <header className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${colorClass}`}>
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{item.category}</span>
                  </span>
                  <span className={`font-mono text-xs tabular-nums ${colorClass}`}>{item.deltaLabel}</span>
                </header>
                <h3 className="text-[15px] font-semibold text-on-surface">{item.title}</h3>
                <p className="text-[13px] text-on-surface-variant leading-relaxed">{item.body}</p>
              </article>
            );
          })}
        </section>

        {/* Interactive AI Coach Chat (7 cols) */}
        <section
          aria-label="AI Coach Chat"
          className="order-1 lg:order-2 lg:col-span-7 bg-surface-container-low border border-outline-variant rounded-xl flex flex-col justify-between overflow-hidden min-h-[540px]"
        >
          <header className="px-4 sm:px-5 py-4 border-b border-outline-variant bg-surface-container flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-lg bg-secondary-container text-on-secondary-container border border-outline-variant flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold text-on-surface truncate">RunTrack Coach</h2>
                <p className="text-xs text-on-surface-variant truncate">
                  Analyzing {activities.length} logged runs &amp; recovery logs
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="inline-flex items-center gap-1 font-mono text-xs text-primary">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t(language, 'coach_ready')}</span>
              </span>
              <button
                type="button"
                onClick={onClearChat}
                title="Clear conversation"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-high border border-outline-variant text-xs font-medium text-on-surface-variant hover:text-on-surface"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t(language, 'clear_chat')}</span>
              </button>
            </div>
          </header>

          {/* Chat Thread */}
          <div className="flex-1 p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto max-h-[440px]">
            {coachMessages.map((msg) =>
              msg.role === 'user' ? (
                <div key={msg.id} className="flex items-start gap-3 justify-end">
                  <div className="bg-surface-container-high border border-outline rounded-xl p-3.5 sm:p-4 max-w-prose">
                    <p className="text-sm text-on-surface whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex items-start gap-3 max-w-prose">
                  <span className="w-7 h-7 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <div className="bg-surface-container border border-outline-variant rounded-xl p-3.5 sm:p-4">
                    <p className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ),
            )}

            {sending && (
              <div className="flex items-start gap-3 max-w-prose">
                <span className="w-7 h-7 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 animate-pulse" aria-hidden="true" />
                </span>
                <div className="bg-surface-container border border-outline-variant rounded-xl p-3.5 text-sm text-on-surface-variant">
                  Analyzing your training load and pace telemetry...
                </div>
              </div>
            )}

            <div ref={threadEndRef} />
          </div>

          {/* Quick Prompts + Input Bar */}
          <footer className="p-4 border-t border-outline-variant bg-surface-container flex flex-col gap-3">
            {error && (
              <div role="alert" className="px-3 py-2 rounded-lg bg-surface-container-lowest border border-error text-xs text-error">
                {error}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setInput(prompt)}
                  className="px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline text-on-surface hover:text-primary hover:border-primary-container text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="flex items-center gap-2.5 sm:gap-3">
              <label htmlFor="coach-input" className="sr-only">
                Ask AI Running Coach
              </label>
              <input
                id="coach-input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={sending}
                placeholder="Ask about pace, heart rate drift, or race pacing..."
                className="flex-1 min-w-0 px-3.5 py-2.5 rounded-lg bg-surface-container-lowest border border-outline text-on-surface text-sm placeholder:text-on-surface-variant focus:border-primary-container focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-lg bg-primary-container text-on-primary-container hover:opacity-90 disabled:opacity-60 text-sm font-semibold whitespace-nowrap shrink-0 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="hidden sm:inline">{t(language, 'ask_coach_btn')}</span>
                <Send className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>
          </footer>
        </section>
      </div>
    </div>
  );
}
