import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { isEditable, type PlanDetailDto, type SessionUser, type SourceDto } from '@hub/shared';
import { GroundingBadge, StatusBadge } from '../components/Badges';
import { EditablePlan } from '../components/EditablePlan';
import { ErrorNotice } from '../components/ErrorNotice';
import { GroundingBanner } from '../components/GroundingBanner';
import { LeadActions } from '../components/PlanActions';
import { HistoryPanel, SourcesPanel } from '../components/PlanSidebar';
import { PlanView } from '../components/PlanView';
import { api } from '../lib/api';
import { useSignedInUser } from '../lib/auth';
import { useResource } from '../lib/useResource';

function canEdit(user: SessionUser, plan: PlanDetailDto): boolean {
  return user.role === 'teacher' && plan.owner.id === user.id && isEditable(plan.status);
}

function latestReturnComment(plan: PlanDetailDto): string | null {
  if (plan.status !== 'returned') return null;
  return plan.reviews.findLast((review) => review.action === 'return')?.comment ?? null;
}

function VersionView({
  planId,
  version,
  sources,
  onClose,
}: {
  planId: string;
  version: number;
  sources: SourceDto[];
  onClose: () => void;
}) {
  const resource = useResource(() => api.version(planId, version), `version:${planId}:${version}`);
  return (
    <>
      <div className="banner banner-info" role="status">
        Viewing version {version} (read only).{' '}
        <button type="button" className="link-button" onClick={onClose}>
          Back to current version
        </button>
      </div>
      <ErrorNotice error={resource.error} onRetry={resource.reload} />
      {resource.data ? (
        <PlanView content={resource.data.version.content} sources={sources} />
      ) : (
        <p className="muted">Loading…</p>
      )}
    </>
  );
}

function PlanHeader({ plan }: { plan: PlanDetailDto }) {
  return (
    <header className="plan-header">
      <h1>{plan.title}</h1>
      <p className="muted">
        <span className="code">{plan.learningOutcome.code}</span> {plan.learningOutcome.description}{' '}
        · {plan.durationMinutes} minutes · by {plan.owner.name}
      </p>
      <div className="badges">
        <StatusBadge status={plan.status} />
        <GroundingBadge status={plan.groundingStatus} />
      </div>
    </header>
  );
}

export function PlanPage() {
  const { planId = '' } = useParams();
  const user = useSignedInUser();
  const resource = useResource(() => api.plan(planId), `plan:${planId}`);
  const [notice, setNotice] = useState('');
  const [viewingVersion, setViewingVersion] = useState<number | null>(null);

  if (resource.error) {
    return (
      <>
        <ErrorNotice error={resource.error} onRetry={resource.reload} />
        <Link to="/">Back</Link>
      </>
    );
  }
  const plan = resource.data?.plan;
  if (!plan) return <p className="muted">Loading lesson plan…</p>;

  function applyUpdate(updated: PlanDetailDto, message: string) {
    resource.replace({ plan: updated });
    setNotice(message);
  }

  const returnComment = latestReturnComment(plan);
  const showLeadActions =
    user.role === 'curriculum_lead' && plan.status === 'submitted' && viewingVersion === null;

  function mainContent(current: PlanDetailDto) {
    if (viewingVersion !== null) {
      return (
        <VersionView
          planId={current.id}
          version={viewingVersion}
          sources={current.sources}
          onClose={() => setViewingVersion(null)}
        />
      );
    }
    if (canEdit(user, current)) {
      return (
        <EditablePlan
          key={`${current.id}:${current.currentVersion}`}
          plan={current}
          onPlanChange={applyUpdate}
        />
      );
    }
    return <PlanView content={current.content} sources={current.sources} />;
  }

  return (
    <div className="plan-layout">
      <div className="plan-main stack">
        <PlanHeader plan={plan} />
        <p role="status" className="success">
          {notice}
        </p>
        {returnComment && (
          <div className="banner banner-warning" role="alert">
            <strong>Returned by the curriculum lead:</strong> {returnComment}
          </div>
        )}
        <GroundingBanner grounding={plan.grounding} />
        {mainContent(plan)}
        {showLeadActions && <LeadActions plan={plan} onPlanChange={applyUpdate} />}
      </div>
      <aside className="plan-aside stack" aria-label="Sources and history">
        <SourcesPanel plan={plan} />
        <HistoryPanel
          plan={plan}
          viewingVersion={viewingVersion}
          onViewVersion={setViewingVersion}
        />
      </aside>
    </div>
  );
}
