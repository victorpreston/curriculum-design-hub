import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Clock3,
  Files,
  GraduationCap,
  History,
  UserRound,
} from 'lucide-react';
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
  onSourceSelect,
}: {
  planId: string;
  version: number;
  sources: SourceDto[];
  onClose: () => void;
  onSourceSelect: (id: string) => void;
}) {
  const resource = useResource(() => api.version(planId, version), `version:${planId}:${version}`);
  return (
    <>
      <div className="banner banner-info plan-version-notice" role="status">
        <span>
          <strong>Version {version}</strong> · Read only
        </span>
        <button type="button" className="link-button" onClick={onClose}>
          Back to current version
        </button>
      </div>
      <ErrorNotice error={resource.error} onRetry={resource.reload} />
      {resource.data && !resource.loading && !resource.error ? (
        <>
          <h2 className="plan-version-title">{resource.data.version.content.title}</h2>
          <GroundingBadge status={resource.data.version.groundingStatus} />
          <PlanView
            content={resource.data.version.content}
            sources={sources}
            onSourceSelect={onSourceSelect}
          />
        </>
      ) : resource.loading ? (
        <p className="muted">Loading…</p>
      ) : null}
    </>
  );
}

function PlanHeader({
  plan,
  backTo,
  backLabel,
}: {
  plan: PlanDetailDto;
  backTo: string;
  backLabel: string;
}) {
  return (
    <header className="plan-header card">
      <Link className="plan-back-link" to={backTo}>
        <ArrowLeft size={14} aria-hidden="true" />
        {backLabel}
      </Link>
      <div className="plan-title-row">
        <h1>{plan.title}</h1>
        <StatusBadge status={plan.status} compact />
      </div>
      <div className="plan-meta">
        <span>
          <GraduationCap size={14} aria-hidden="true" />
          Grade {plan.learningOutcome.grade}
        </span>
        <span>
          <Clock3 size={14} aria-hidden="true" />
          {plan.durationMinutes} minutes
        </span>
        <span>
          <UserRound size={14} aria-hidden="true" />
          {plan.owner.name}
        </span>
        <span>
          <Files size={14} aria-hidden="true" />
          Version {plan.currentVersion}
        </span>
      </div>
      <div className="plan-outcome">
        <span className="code">{plan.learningOutcome.code}</span>
        <p>{plan.learningOutcome.description}</p>
      </div>
    </header>
  );
}

export function PlanPage() {
  const { planId = '' } = useParams();
  return <PlanDetails key={planId} planId={planId} />;
}

function PlanDetails({ planId }: { planId: string }) {
  const user = useSignedInUser();
  const resource = useResource(() => api.plan(planId), `plan:${planId}`);
  const [notice, setNotice] = useState('');
  const [viewingVersion, setViewingVersion] = useState<number | null>(null);
  const [referencePanel, setReferencePanel] = useState<'sources' | 'history'>('sources');

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
  const backTo =
    plan.status === 'published' ? '/bank' : user.role === 'teacher' ? '/plans' : '/review';
  const backLabel =
    plan.status === 'published'
      ? 'Lesson bank'
      : user.role === 'teacher'
        ? 'My plans'
        : 'Review queue';

  function revealSource(id: string) {
    setReferencePanel('sources');
    window.requestAnimationFrame(() => {
      const source = document.getElementById(`source-${id}`);
      const details = source?.querySelector('details');
      if (details) details.open = true;
      source?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      source?.querySelector('summary')?.focus({ preventScroll: true });
    });
  }

  function mainContent(current: PlanDetailDto) {
    if (viewingVersion !== null) {
      return (
        <VersionView
          key={viewingVersion}
          planId={current.id}
          version={viewingVersion}
          sources={current.sources}
          onClose={() => setViewingVersion(null)}
          onSourceSelect={revealSource}
        />
      );
    }
    if (canEdit(user, current)) {
      return (
        <EditablePlan
          key={`${current.id}:${current.currentVersion}`}
          plan={current}
          onPlanChange={applyUpdate}
          onSourceSelect={revealSource}
        />
      );
    }
    return (
      <PlanView content={current.content} sources={current.sources} onSourceSelect={revealSource} />
    );
  }

  return (
    <div className="plan-detail stack" key={plan.id}>
      <PlanHeader plan={plan} backTo={backTo} backLabel={backLabel} />
      {notice && (
        <p role="status" className="plan-save-notice success">
          {notice}
        </p>
      )}
      {returnComment && (
        <div className="banner banner-warning" role="alert">
          <strong>Changes requested</strong>
          <p>{returnComment}</p>
        </div>
      )}
      <div className="plan-layout">
        <div className="plan-main stack">
          {viewingVersion === null && <GroundingBanner grounding={plan.grounding} />}
          {mainContent(plan)}
        </div>
        <aside className="plan-aside stack" aria-label="Sources and history">
          {showLeadActions && <LeadActions plan={plan} onPlanChange={applyUpdate} />}
          <div className="plan-reference-card card">
            <div className="plan-panel-switch" role="group" aria-label="Plan reference">
              <button
                type="button"
                aria-pressed={referencePanel === 'sources'}
                onClick={() => setReferencePanel('sources')}
              >
                <BookOpen size={15} aria-hidden="true" />
                Sources <span>{plan.sources.length}</span>
              </button>
              <button
                type="button"
                aria-pressed={referencePanel === 'history'}
                onClick={() => setReferencePanel('history')}
              >
                <History size={15} aria-hidden="true" />
                History <span>{plan.versions.length}</span>
              </button>
            </div>
            <div className="plan-reference-panel" hidden={referencePanel !== 'sources'}>
              <SourcesPanel plan={plan} historical={viewingVersion !== null} />
            </div>
            <div className="plan-reference-panel" hidden={referencePanel !== 'history'}>
              <HistoryPanel
                plan={plan}
                viewingVersion={viewingVersion}
                onViewVersion={setViewingVersion}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
