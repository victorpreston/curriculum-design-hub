import type { ReactNode } from 'react';

export type MetricIconName =
  | 'plans'
  | 'attention'
  | 'review'
  | 'published'
  | 'grounded'
  | 'coverage'
  | 'create'
  | 'library'
  | 'help'
  | 'team';

function IconFrame({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function MetricIcon({ name }: { name: MetricIconName }) {
  switch (name) {
    case 'plans':
      return (
        <IconFrame>
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v6h6M8 13h8M8 17h6M8 9h2" />
        </IconFrame>
      );
    case 'attention':
      return (
        <IconFrame>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </IconFrame>
      );
    case 'review':
      return (
        <IconFrame>
          <path d="M9 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4" />
          <path d="M9 3h6v4H9zM9 14l2 2 4-4" />
        </IconFrame>
      );
    case 'published':
      return (
        <IconFrame>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 2.5 2.5L16 9" />
        </IconFrame>
      );
    case 'grounded':
      return (
        <IconFrame>
          <path d="M12 3 5 6v5c0 4.5 2.9 7.8 7 9 4.1-1.2 7-4.5 7-9V6Z" />
          <path d="m9 12 2 2 4-4" />
        </IconFrame>
      );
    case 'coverage':
      return (
        <IconFrame>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </IconFrame>
      );
    case 'create':
      return (
        <IconFrame>
          <path d="M12 5v14M5 12h14" />
        </IconFrame>
      );
    case 'library':
      return (
        <IconFrame>
          <path d="M3 5a2 2 0 0 1 2-2h5a4 4 0 0 1 4 4v14a4 4 0 0 0-4-4H5a2 2 0 0 0-2 2Z" />
          <path d="M21 5a2 2 0 0 0-2-2h-5a4 4 0 0 0-4 4v14a4 4 0 0 1 4-4h5a2 2 0 0 1 2 2Z" />
        </IconFrame>
      );
    case 'help':
      return (
        <IconFrame>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 1 1 4.7 1.2c-.6.9-2.2 1.2-2.2 2.8M12 16h.01" />
        </IconFrame>
      );
    case 'team':
      return (
        <IconFrame>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.8M17 14a5 5 0 0 1 4 4" />
        </IconFrame>
      );
  }
}
