'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  StaffAction,
  StaffBadge,
  StaffLoading,
  StaffMetric,
  StaffNotice,
  StaffPage,
  StaffPageHeader,
  StaffPageInner,
  StaffPanel,
  StaffSectionHeader,
} from '@/components/StaffPortalUI';

type RequestState = 'action' | 'review' | 'complete' | 'closed' | 'neutral';

type CaseItem = {
  id: string;
  title: string;
  eyebrow: string;
  detail: string;
  status: string;
  state: RequestState;
  updatedAt: string | null;
  href: string;
  action: string;
  meta?: string;
};

function titleCase(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Not available';
  return parsed.toLocaleDateString('en-GB', { dateStyle: 'medium' });
}

function formatDateRange(start: string | null | undefined, end: string | null | undefined) {
  if (!start && !end) return null;
  if (start && end && start !== end) return formatDate(start) + ' to ' + formatDate(end);
  return formatDate(start || end);
}

function badgeTone(state: RequestState): 'live' | 'attention' | 'danger' | 'neutral' {
  if (state === 'complete') return 'live';
  if (state === 'action') return 'danger';
  if (state === 'review') return 'attention';
  return 'neutral';
}

function stateFor(value: unknown): RequestState {
  const status = String(value || '').toLowerCase();
  if (['approved', 'completed', 'paid', 'current', 'active', 'fully_registered', 'confirmed'].includes(status)) return 'complete';
  if (['rejected', 'declined', 'cancelled', 'withdrawn', 'expired', 'closed'].includes(status)) return 'closed';
  if (['missing', 'overdue', 'needs_action', 'resubmission_required'].includes(status)) return 'action';
  if (['pending', 'requested', 'processing', 'under_review', 'under review', 'in_progress', 'invoice_requested', 'cos_pending', 'preparing_sms', 'submitted_to_sms'].includes(status)) return 'review';
  return 'neutral';
}

function caseStatus(value: unknown) {
  const raw = String(value || 'Not set');
  return titleCase(raw);
}

function latestDate(...values: Array<string | null | undefined>) {
  const dates = values.filter(Boolean).map((value) => new Date(String(value)).getTime()).filter(Number.isFinite);
  if (!dates.length) return null;
  return new Date(Math.max(...dates)).toISOString();
}

export default function StaffRequestsPage() {
  const router = useRouter();
  const [items, setItems] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function load(showSpinner = true) {
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      const responses = await Promise.all([
        fetch('/api/staff/leave', { cache: 'no-store' }),
        fetch('/api/staff/rota', { cache: 'no-store' }),
        fetch('/api/staff/compliance', { cache: 'no-store' }),
        fetch('/api/staff/visa-sponsorship', { cache: 'no-store' }),
        fetch('/api/staff/visa-help', { cache: 'no-store' }),
        fetch('/api/staff/documents', { cache: 'no-store' }),
      ]);

      if (responses.some((response) => response.status === 401)) {
        router.replace('/staff/login');
        return;
      }

      const bodies = await Promise.all(responses.map((response) => response.json().catch(() => ({}))));
      const critical = responses.slice(0, 3).find((response) => !response.ok);
      if (critical) {
        const body = bodies[responses.indexOf(critical)];
        throw new Error(body?.error || 'Unable to load your request centre.');
      }

      const [leave, rota, compliance, sponsorship, visaHelp, documents] = bodies as [
        any,
        any,
        any,
        any,
        any,
        any,
      ];

      const next: CaseItem[] = [];

      for (const row of leave?.requests || []) {
        next.push({
          id: 'leave-' + row.id,
          title: titleCase(row.leave_type || 'Leave request'),
          eyebrow: 'Leave',
          detail: formatDateRange(row.start_date, row.end_date) || 'Dates not set',
          status: caseStatus(row.status),
          state: row.status === 'pending' ? 'review' : stateFor(row.status),
          updatedAt: latestDate(row.updated_at, row.reviewed_at, row.created_at),
          href: '/staff/leave',
          action: row.status === 'pending' ? 'Track request' : 'View request',
          meta: row.review_note ? 'LAUREM has added a review note' : undefined,
        });
      }

      if (rota?.current) {
        const row = rota.current;
        const state = row.status === 'requested' ? 'review' : stateFor(row.status);
        next.push({
          id: 'rota-' + row.id,
          title: 'Work preferences',
          eyebrow: 'Rota',
          detail: row.preferred_training_location
            ? 'Effective ' + formatDate(row.effective_from) + ' · Training: ' + row.preferred_training_location
            : 'Effective ' + formatDate(row.effective_from),
          status: caseStatus(row.status),
          state,
          updatedAt: latestDate(row.updated_at, row.reviewed_at, row.created_at),
          href: '/staff/availability',
          action: row.status === 'requested' ? 'View request' : 'Review preferences',
          meta: row.review_note ? 'LAUREM has left a note' : undefined,
        });
      }

      for (const row of compliance?.current || []) {
        const label = String(row.compliance_type || row.type || 'Compliance').toUpperCase();
        next.push({
          id: 'compliance-' + row.id,
          title: label + ' check',
          eyebrow: 'DBS & PVG',
          detail: row.invoice?.invoice_number
            ? 'Invoice ' + row.invoice.invoice_number
            : row.requested_at
              ? 'Requested ' + formatDate(row.requested_at)
              : 'Compliance request',
          status: caseStatus(row.status),
          state: row.status === 'pending' ? 'review' : stateFor(row.status),
          updatedAt: latestDate(row.updated_at, row.reviewed_at, row.requested_at, row.created_at),
          href: '/staff/compliance',
          action: row.status === 'pending' ? 'Track check' : 'Open compliance',
          meta: row.invoice?.status === 'unpaid' ? 'Payment is still outstanding' : undefined,
        });
      }

      const visaCase = sponsorship?.case;
      if (sponsorship?.request?.available || visaCase) {
        const visaState = visaCase?.status
          ? stateFor(visaCase.status)
          : sponsorship?.cosStatus?.key
            ? stateFor(sponsorship.cosStatus.key)
            : 'neutral';
        next.push({
          id: 'visa-' + (visaCase?.id || sponsorship?.request?.pathway || 'support'),
          title: 'Visa & Sponsorship',
          eyebrow: 'Immigration',
          detail: visaCase?.pathway === 'visa_switch'
            ? 'UK visa switch support'
            : visaCase?.pathway === 'international_sponsorship'
              ? 'International sponsorship support'
              : sponsorship?.request?.explanation || 'Sponsorship workspace',
          status: sponsorship?.cosStatus?.label || caseStatus(visaCase?.status || 'Not requested'),
          state: visaState,
          updatedAt: latestDate(visaCase?.updated_at, visaCase?.requested_at, sponsorship?.invoice?.created_at),
          href: '/staff/visa-sponsorship',
          action: sponsorship?.cosStatus?.canDownload ? 'Open COS & visa' : 'Track sponsorship',
          meta: sponsorship?.readiness?.ready === false ? 'Some sponsorship information still needs attention' : undefined,
        });
      }

      const helpCase = visaHelp?.case;
      const helpMilestones = Array.isArray(visaHelp?.milestones) ? visaHelp.milestones : [];
      const openStaffTasks = Array.isArray(visaHelp?.tasks)
        ? visaHelp.tasks.filter((task: any) => task.visibility !== 'internal' && !['completed', 'waived'].includes(String(task.status || '').toLowerCase()))
        : [];
      if (helpCase || helpMilestones.length || openStaffTasks.length) {
        const helpStatus = helpCase?.status || (openStaffTasks.length ? 'in_progress' : helpMilestones.length ? 'active' : 'not_started');
        next.push({
          id: 'visa-help-' + (helpCase?.id || 'workspace'),
          title: 'Visa Help Centre',
          eyebrow: 'Case support',
          detail: openStaffTasks.length
            ? openStaffTasks.length + ' action item' + (openStaffTasks.length === 1 ? '' : 's') + ' visible to you'
            : helpMilestones.length
              ? 'Guided immigration milestones are being tracked'
              : 'Visa route screening and support',
          status: caseStatus(helpStatus),
          state: openStaffTasks.length ? 'action' : stateFor(helpStatus),
          updatedAt: latestDate(helpCase?.updated_at, helpCase?.created_at),
          href: '/staff/visa-help',
          action: openStaffTasks.length ? 'Open action plan' : 'Open Visa Help',
          meta: undefined,
        });
      }

      const pendingSignatures = (documents?.documents || []).filter((document: any) => document.signature_status === 'pending').length;
      if (pendingSignatures) {
        next.push({
          id: 'documents-signature',
          title: pendingSignatures + ' document' + (pendingSignatures === 1 ? '' : 's') + ' awaiting signature',
          eyebrow: 'Documents',
          detail: 'Employment or workforce documents need your acknowledgement.',
          status: 'Awaiting signature',
          state: 'action',
          updatedAt: latestDate(...(documents?.documents || []).filter((document: any) => document.signature_status === 'pending').map((document: any) => document.issued_at)),
          href: '/staff/documents',
          action: 'Review & sign',
        });
      }

      setItems(
        next.sort((a, b) => {
          const left = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const right = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return right - left;
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load your request centre.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, [router]);

  const counts = useMemo(() => ({
    open: items.filter((item) => item.state === 'action' || item.state === 'review').length,
    action: items.filter((item) => item.state === 'action').length,
    review: items.filter((item) => item.state === 'review').length,
    complete: items.filter((item) => item.state === 'complete').length,
  }), [items]);

  if (loading) return <StaffLoading label="Loading your request centre…"/>;

  return (
    <StaffPage className="staff-page--requests">
      <StaffPageInner>
        <StaffPageHeader
          eyebrow="STAFF SELF-SERVICE"
          title="My Requests"
          subtitle="One place to track requests you have sent to LAUREM, what is being reviewed, and anything still waiting for you."
          actions={<><StaffAction onClick={() => void load(false)} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh'}</StaffAction><StaffAction href="/staff/messages">Message LAUREM</StaffAction></>}
        />

        {error && (
          <StaffNotice tone="danger">
            <strong>Request centre unavailable</strong>
            <p>{error}</p>
            <StaffAction onClick={() => void load(false)}>Try again</StaffAction>
          </StaffNotice>
        )}

        <div className="staff-stat-grid">
          <StaffMetric label="Open requests" value={counts.open} detail="Still moving through a LAUREM workflow"/>
          <StaffMetric label="Action needed" value={counts.action} detail="Something is waiting on you"/>
          <StaffMetric label="In review" value={counts.review} detail="With LAUREM / Admin now"/>
          <StaffMetric label="Completed" value={counts.complete} detail="Resolved records in this view"/>
        </div>

        <StaffPanel>
          <StaffSectionHeader
            title="Your request timeline"
            copy={items.length ? 'The newest request activity appears first. Use the action on each card to jump directly into the source workflow.' : 'No request or action records are currently visible for your staff account.'}
          />
          {items.length ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {items.map((item) => (
                <article key={item.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: 18, alignItems: 'center', padding: 16, border: '1px solid var(--line)', borderRadius: 16, background: 'var(--surface)' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 7 }}>
                      <span className="staff-document-category">{item.eyebrow}</span>
                      <StaffBadge tone={badgeTone(item.state)}>{item.status}</StaffBadge>
                    </div>
                    <h3 style={{ margin: 0, fontSize: 18, letterSpacing: '-0.02em' }}>{item.title}</h3>
                    <p className="staff-card-copy" style={{ marginBottom: 5 }}>{item.detail}</p>
                    {item.meta && <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>{item.meta}</p>}
                    {item.updatedAt && <p style={{ margin: '7px 0 0', color: 'var(--muted)', fontSize: 12 }}>Last recorded update: {formatDate(item.updatedAt)}</p>}
                  </div>
                  <StaffAction href={item.href} primary={item.state === 'action'}>{item.action}</StaffAction>
                </article>
              ))}
            </div>
          ) : (
            <div className="staff-empty">There is nothing to action here right now. New leave, rota, compliance and visa activity will appear automatically.</div>
          )}
        </StaffPanel>

        <div className="staff-workforce-grid">
          <StaffPanel>
            <StaffSectionHeader title="How the states work" copy="The request centre is a navigation layer. The source workflow remains the authoritative place to submit information, receive decisions and complete actions."/>
            <div style={{ display: 'grid', gap: 10 }}>
              <StateRow tone="danger" title="Action needed" text="Something in the source workflow needs your attention, correction, payment or signature."/>
              <StateRow tone="attention" title="In review" text="Your request has been submitted and is moving through a LAUREM review or processing stage."/>
              <StateRow tone="live" title="Completed" text="The source workflow currently reports a completed, approved, active or current state."/>
            </div>
          </StaffPanel>

          <StaffPanel>
            <StaffSectionHeader title="Open a source workflow" copy="Jump straight to the area where the record is managed."/>
            <div className="staff-week-links">
              <a href="/staff/leave"><span>Leave</span><strong>Requests</strong></a>
              <a href="/staff/availability"><span>Work preferences</span><strong>Rota</strong></a>
              <a href="/staff/compliance"><span>DBS & PVG</span><strong>Checks</strong></a>
              <a href="/staff/documents"><span>Documents</span><strong>Sign & view</strong></a>
              <a href="/staff/visa-help"><span>Visa Help</span><strong>Case centre</strong></a>
              <a href="/staff/visa-sponsorship"><span>Visa & COS</span><strong>Sponsorship</strong></a>
            </div>
          </StaffPanel>
        </div>
      </StaffPageInner>
    </StaffPage>
  );
}

function StateRow({ tone, title, text }: { tone: 'danger' | 'attention' | 'live'; title: string; text: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10, alignItems: 'start', padding: 12, borderRadius: 13, background: 'var(--soft)' }}>
      <StaffBadge tone={tone}>{title}</StaffBadge>
      <span style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}
