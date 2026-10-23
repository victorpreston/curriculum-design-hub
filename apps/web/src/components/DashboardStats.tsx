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

function HalfRadial({ value, ratio, tone }: { value: number; ratio: number; tone: StatTone }) {
  const percentage = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return (
    <div className={`half-radial half-radial-${tone}`} aria-label={`${percentage}% progress`}>
      <svg viewBox="0 0 120 72" role="img" aria-hidden="true">
        <path className="half-radial-track" d="M 14 58 A 46 46 0 0 1 106 58" pathLength="100" />
        <path
          className="half-radial-value"
          d="M 14 58 A 46 46 0 0 1 106 58"
          pathLength="100"
          strokeDasharray={`${percentage} 100`}
        />
      </svg>
      <strong>{value}</strong>
    </div>
  );
}

export function DashboardStats({ stats }: { stats: DashboardStat[] }) {
  return (
    <section className="stat-grid" aria-label="Workspace summary">
      {stats.map((stat) => (
        <article className={`stat-card stat-card-${stat.tone ?? 'navy'}`} key={stat.label}>
          <div className="stat-card-topline">
            <span className="stat-icon" aria-hidden="true">
              {stat.icon}
            </span>
            <span className="stat-label">{stat.label}</span>
          </div>
          <div className="stat-card-body">
            <div>
              <div className="stat-value">{stat.value}</div>
              <p className="stat-detail">{stat.detail}</p>
            </div>
            <HalfRadial
              value={stat.value}
              ratio={stat.ratio ?? (stat.value > 0 ? 1 : 0)}
              tone={stat.tone ?? 'navy'}
            />
          </div>
        </article>
      ))}
    </section>
  );
}
