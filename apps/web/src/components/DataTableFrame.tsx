import { useId, type ReactNode } from 'react';

interface DataTableFrameProps {
  title: string;
  countLabel: string;
  tools?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function DataTableFrame({
  title,
  countLabel,
  tools,
  footer,
  children,
}: DataTableFrameProps) {
  const headingId = useId();
  return (
    <section className="data-panel" aria-labelledby={headingId}>
      <header className="data-panel-header">
        <h2 id={headingId}>
          {title} <span className="data-panel-count">{countLabel}</span>
        </h2>
        {tools && <div className="data-panel-tools">{tools}</div>}
      </header>
      <div className="data-table-region">{children}</div>
      {footer && <footer className="data-panel-footer">{footer}</footer>}
    </section>
  );
}
