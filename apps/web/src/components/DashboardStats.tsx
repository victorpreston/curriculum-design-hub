import type { ReactNode } from 'react';

type StatTone = 'navy' | 'gold' | 'green' | 'purple';

export interface DashboardStat {
  label: string;
  value: number;
  detail: string;
  ratio?: number;
  tone?: StatTone;
  icon: ReactNode;
}

export function DashboardStats({ stats }: { stats: DashboardStat[] }) {
  return (
    <section className="stat-grid" aria-label="Workspace summary">
      {stats.map((stat) => (
        <article
          className={`stat-card stat-card-${stat.tone ?? 'navy'}`}
          key={stat.label}
          aria-label={`${stat.label}: ${stat.value}. ${stat.detail}`}
        >
          <div className="stat-card-topline">
            <div className="stat-card-label">
              <span className="stat-icon" aria-hidden="true">
                {stat.icon}
              </span>
              <span className="stat-label">{stat.label}</span>
            </div>
            <span className="stat-signal">
              {Math.round(Math.max(0, Math.min(1, stat.ratio ?? (stat.value > 0 ? 1 : 0))) * 100)}%
            </span>
          </div>
          <div className="stat-card-body">
            <div>
              <div className="stat-value">{stat.value}</div>
              <p className="stat-detail">{stat.detail}</p>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
