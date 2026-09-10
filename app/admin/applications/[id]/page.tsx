'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { recruitmentConfig } from '@/lib/recruitment-config';

type Candidate = Record<string, any> & {
  id: string;
  full_name: string;
  email: string;
  role_applied: string | null;
  status: string;
  submitted_at: string | null;
  updated_at: string | null;
};
type Assessment = Record<string, any> & {
  id: string;
  round: number;
  role: string;
  pathway: string;
  status: string;
  score: number | null;
  total_questions: number | null;
  pass_percent: number | null;
  percent: number | null;
  second_interview_id: string | null;
  started_at: string;
  submitted_at: string | null;
};
type Detail = {
  application: Candidate;
  invite: any;
  interviews: any[];
  secondInterviews: any[];
  assessments: Assessment[];
  nurseInterview: any;
  documentRequests: any[];
  documents: any[];
  evidenceReviews: any[];
  readiness: any[];
  contracts: any[];
  statusHistory: any[];
  adminActions: any[];
  staff: any;
  audit: any[];
};

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5eaf0',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 8px 28px rgba(15,23,42,.04)',
};
const subcard: React.CSSProperties = {
  border: '1px solid #edf2f7',
  borderRadius: 12,
  padding: 14,
  background: '#fbfcfe',
};
const buttonBase: React.CSSProperties = {
  border: '1px solid #d9e2ec',
  background: '#fff',
  color: '#102a43',
  padding: '10px 13px',
  borderRadius: 9,
  fontWeight: 800,
  textDecoration: 'none',
  cursor: 'pointer',
};
const primary: React.CSSProperties = {
  ...buttonBase,
  border: 0,
  background: '#102a43',
  color: '#fff',
};
const muted: React.CSSProperties = { color: '#627d98' };
const row: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  flexWrap: 'wrap',
};
const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))',
  gap: 14,
};
const statusTransitions: Record<string, string[]> = {
  Enquiry: ['Invited', 'Rejected', 'Withdrawn'],
  Invited: ['Application', 'Rejected', 'Withdrawn'],
  Application: ['Screening', 'Rejected', 'Withdrawn'],
  Screening: ['Interview', 'Documents', 'Rejected', 'Withdrawn'],
  Interview: ['Second Interview', 'Documents', 'Offer', 'Rejected', 'Withdrawn'],
  'Second Interview': ['Documents', 'Offer', 'Rejected', 'Withdrawn'],
  Documents: ['Sponsorship', 'Offer', 'Onboarding', 'Rejected', 'Withdrawn'],
  Sponsorship: ['Offer', 'Rejected', 'Withdrawn'],
  Offer: ['Onboarding', 'Rejected', 'Withdrawn'],
  Onboarding: ['Hired', 'Rejected', 'Withdrawn'],
  Hired: [],
  Rejected: [],
  Withdrawn: [],
};

const pre: React.CSSProperties = {
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  background: '#f7fafc',
  border: '1px solid #edf2f7',
  borderRadius: 10,
  padding: 12,
  overflowX: 'auto',
  fontSize: 12,
};

function fmt(value: any) {
  if (!value) return 'Not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

function badge(value: string) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '6px 9px',
        borderRadius: 999,
        background: '#edf2f7',
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {value || 'Not set'}
    </span>
  );
}

function show(value: any) {
  if (value === null || value === undefined || value === '') return 'Not provided';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div style={{ ...muted, fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, wordBreak: 'break-word' }}>{show(value)}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ ...muted, fontSize: 12, marginBottom: 5 }}>{label}</div>
      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{show(value)}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <article style={card}>
      <div style={{ ...muted, fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, marginTop: 3 }}>{value}</div>
    </article>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ ...muted, padding: '12px 0' }}>{text}</div>;
}

export default function Candidate360Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/applications/${encodeURIComponent(id)}`, { cache: 'no-store' });
      const body = await response.json();
      if (response.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(body.error || 'Unable to load candidate record.');
      setData(body as Detail);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load candidate record.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) void load();
  }, [id]);

  async function changeStatus(status: string) {
    if (!data || status === data.application.status) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(`/api/admin/applications?id=${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to update status.');
      setNotice('Candidate status updated.');
      await load();
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'Unable to update status.');
    } finally {
      setBusy(false);
    }
  }

  async function sendSecondInterview() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/second-interviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ applicationId: id }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to create second interview.');
      setNotice(
        body.email?.status === 'sent'
          ? 'Second interview link emailed to the candidate.'
          : 'Second interview link created, but email delivery needs attention.',
      );
      await load();
    } catch (interviewError) {
      setError(interviewError instanceof Error ? interviewError.message : 'Unable to create second interview.');
    } finally {
      setBusy(false);
    }
  }

  async function reviewDocument(documentId: string, status: 'approved' | 'rejected') {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const reviewNote = status === 'rejected' ? window.prompt('Reason for rejecting this document?')?.trim() || '' : '';
      if (status === 'rejected' && !reviewNote) {
        setBusy(false);
        return;
      }
      const response = await fetch(`/api/admin/documents?id=${encodeURIComponent(documentId)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status, reviewNote }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to review document.');
      setNotice(`Document ${status}.`);
      await load();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Unable to review document.');
    } finally {
      setBusy(false);
    }
  }

  async function downloadDocument(documentId: string) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/documents/download?id=${encodeURIComponent(documentId)}`, { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok || !body.document?.url) throw new Error(body.error || 'Unable to prepare document download.');
      window.open(body.document.url, '_blank', 'noopener,noreferrer');
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Unable to prepare document download.');
    } finally {
      setBusy(false);
    }
  }

  const readiness = useMemo(() => data?.readiness || [], [data]);
  const requiredOpen = readiness.filter((item: any) => item.required && item.status !== 'completed' && item.status !== 'waived').length;
  const approvedDocs = data?.documents.filter((document: any) => document.status === 'approved').length || 0;

  if (loading) {
    return (
      <main style={{ maxWidth: 1160, margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui' }}>
        <div style={card}>Loading Candidate 360…</div>
      </main>
    );
  }

  if (!data) {
    return (
      <main style={{ maxWidth: 1160, margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui' }}>
        <div style={card}>
          <p>{error || 'Candidate record unavailable.'}</p>
          <Link href="/admin" style={buttonBase}>Back to recruiter workspace</Link>
        </div>
      </main>
    );
  }

  const application = data.application;
  const nurseAnswers = data.nurseInterview?.answers;
  const round1Assessment = data.assessments.find((assessment) => assessment.round === 1);
  const round2Assessment = data.assessments.find((assessment) => assessment.round === 2);
  const activeSecondInvitation = data.secondInterviews.find((item: any) => item.status === 'sent' && item.expires_at && new Date(item.expires_at).getTime() > Date.now());
  const availableStatuses = [application.status, ...(statusTransitions[application.status] || [])].filter((status, index, values) => values.indexOf(status) === index);
  const applicationData = application.application_data && typeof application.application_data === 'object' ? application.application_data : {};
  const pathway = String((applicationData as any).pathway || (application.living_in_uk === 'Yes' ? 'uk' : application.living_in_uk === 'No' ? 'international' : ''));

  return (
    <main style={{ minHeight: '100vh', background: '#f4f7fb', color: '#102a43', fontFamily: 'system-ui', padding: '26px 18px 70px' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <div style={row}>
          <div>
            <Link href="/admin" style={buttonBase}>← Recruiter workspace</Link>
            <div style={{ marginTop: 18, fontSize: 12, fontWeight: 900, letterSpacing: 1.3, color: '#0f766e' }}>LAUREM CANDIDATE 360</div>
            <h1 style={{ fontSize: 40, margin: '5px 0 5px' }}>{application.full_name}</h1>
            <div style={muted}>{application.role_applied || 'Role not set'} · {application.email}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {badge(application.status)}
            <button disabled={busy} onClick={() => void load()} style={buttonBase}>Refresh</button>
            {data.staff && <Link href={`/admin/workforce/${encodeURIComponent(data.staff.id)}`} style={buttonBase}>Staff 360</Link>}
          </div>
        </div>

        {error && <div role="alert" style={{ ...card, marginTop: 16, color: '#8a2323' }}>{error}</div>}
        {notice && <div role="status" style={{ ...card, marginTop: 16, color: '#176b4f' }}>{notice}</div>}

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginTop: 18 }}>
          <Metric label="Readiness blockers" value={requiredOpen} />
          <Metric label="Approved documents" value={approvedDocs} />
          <Metric label="First interviews" value={data.interviews.length} />
          <Metric label="Round 1" value={round1Assessment?.status || 'Not started'} />
          <Metric label="Round 2" value={round2Assessment?.status || 'Locked'} />
          <Metric label="Second interviews" value={data.secondInterviews.length} />
          <Metric label="Contracts" value={data.contracts.length} />
        </section>

        <section style={{ ...card, marginTop: 18 }}>
          <div style={row}>
            <div>
              <h2 style={{ margin: '0 0 5px' }}>Recruitment controls</h2>
              <div style={muted}>Every lifecycle change is recorded against this candidate.</div>
            </div>
            <select value={application.status} disabled={busy} onChange={(event) => void changeStatus(event.target.value)} aria-label="Recruitment status" style={{ padding: 11, border: '1px solid #d9e2ec', borderRadius: 9, fontWeight: 700 }}>
              {availableStatuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14, alignItems: 'stretch' }}>
            {application.status === 'Application' && (
              <button disabled={busy} onClick={() => void changeStatus('Screening')} style={primary}>Move to screening</button>
            )}
            {application.status === 'Screening' && (
              <div style={{ ...subcard, flex: '1 1 320px' }}>
                <div style={{ fontWeight: 800 }}>Ready for first assessment</div>
                <div style={{ ...muted, fontSize: 13, marginTop: 4 }}>The candidate receives the 20-question role-based assessment automatically after application submission.</div>
              </div>
            )}
            {round1Assessment?.status === 'in_progress' && (
              <div style={{ ...subcard, flex: '1 1 320px' }}>
                <div style={{ fontWeight: 800 }}>First assessment in progress</div>
                <div style={{ ...muted, fontSize: 13, marginTop: 4 }}>20 role-specific objective questions are assigned to this candidate.</div>
              </div>
            )}
            {round1Assessment?.status === 'passed' && activeSecondInvitation && (
              <div style={{ ...subcard, flex: '1 1 320px' }}>
                <div style={{ fontWeight: 800 }}>Second stage issued</div>
                <div style={{ ...muted, fontSize: 13, marginTop: 4 }}>Round 1 passed at {round1Assessment.percent}% and the second-stage link is active.</div>
              </div>
            )}
            {round1Assessment?.status === 'passed' && !activeSecondInvitation && (
              <button disabled={busy} onClick={() => void sendSecondInterview()} style={primary}>Reissue second stage</button>
            )}
            {round1Assessment?.status === 'failed' && (
              <div style={{ ...subcard, flex: '1 1 320px' }}>
                <div style={{ fontWeight: 800 }}>First assessment not passed</div>
                <div style={{ ...muted, fontSize: 13, marginTop: 4 }}>Score {round1Assessment.percent}% against the configured {round1Assessment.pass_percent || 80}% pass mark.</div>
              </div>
            )}
            {round2Assessment?.status === 'submitted' && (
              <div style={{ ...subcard, flex: '1 1 320px' }}>
                <div style={{ fontWeight: 800 }}>Second stage completed</div>
                <div style={{ ...muted, fontSize: 13, marginTop: 4 }}>Round 2 has been submitted and is ready for recruiter review.</div>
              </div>
            )}
            {['Offer', 'Onboarding', 'Hired'].includes(application.status) && (
              <Link href={`/admin/applications/${encodeURIComponent(id)}/contract`} style={buttonBase}>Prepare contract</Link>
            )}
            <Link href={`/admin/applications/${encodeURIComponent(id)}/readiness`} style={buttonBase}>Readiness gate</Link>
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.3fr) minmax(290px,.7fr)', gap: 16, marginTop: 16 }}>
          <article style={card}>
            <h2 style={{ marginTop: 0 }}>Candidate identity</h2>
            <div style={grid}>
              <Info label="Full name" value={application.full_name} />
              <Info label="Preferred name" value={application.preferred_name} />
              <Info label="Email" value={application.email} />
              <Info label="Phone" value={application.phone} />
              <Info label="Date of birth" value={application.date_of_birth} />
              <Info label="Nationality" value={application.nationality} />
              <Info label="Country of residence" value={application.country_of_residence} />
              <Info label="Address" value={application.address} />
              <Info label="Employment type" value={application.employment_type} />
              <Info label="Start date" value={application.start_date} />
              <Info label="Consent" value={application.consent ? 'Yes' : 'No'} />
              <Info label="Submitted" value={fmt(application.submitted_at)} />
              <Info label="Last updated" value={fmt(application.updated_at)} />
            </div>
          </article>
          <article style={card}>
            <h2 style={{ marginTop: 0 }}>Invitation</h2>
            <Info label="Candidate" value={data.invite?.candidate_name} />
            <Info label="Invitation role" value={data.invite?.role} />
            <Info label="Created" value={fmt(data.invite?.created_at)} />
            <Info label="Expires" value={fmt(data.invite?.expires_at)} />
            <Info label="Used" value={fmt(data.invite?.used_at)} />
            <p style={{ ...muted, fontSize: 12, marginTop: 18 }}>The private token itself is never displayed here.</p>
          </article>
        </section>

        <section style={{ ...card, marginTop: 16 }}>
          <h2 style={{ marginTop: 0 }}>Application pathway</h2>
          <div style={{ ...subcard, marginBottom: 14 }}>
            <div style={{ fontWeight: 800 }}>{pathway === 'international' ? 'International applicant' : pathway === 'uk' ? 'UK-based applicant' : 'Pathway not recorded'}</div>
            <div style={{ ...muted, fontSize: 13, marginTop: 4 }}>This is taken from the candidate's submitted application pathway, not inferred from their role.</div>
          </div>
          <div style={grid}>
            <Info label="Living in UK" value={application.living_in_uk} />
            <Info label="Living in Ireland" value={application.living_in_ireland} />
            <Info label="Current country" value={application.current_country} />
            <Info label="Work permission" value={application.work_permission} />
            <Info label="Requires sponsorship" value={application.requires_sponsorship} />
            <Info label="Requires employment permit" value={application.requires_employment_permit} />
            <Info label="International experience" value={application.international_experience} />
            <Info label="Relocation readiness" value={application.relocation_readiness} />
          </div>
        </section>

        <section style={{ ...card, marginTop: 16 }}>
          <h2 style={{ marginTop: 0 }}>Experience and qualifications</h2>
          <Detail label="Care experience" value={application.care_experience} />
          <Detail label="Qualifications" value={application.qualifications} />
          <Detail label="Training" value={application.training} />
          <Detail label="Professional experience" value={application.professional_experience} />
          <Detail label="Employment history" value={application.employment_history} />
          <Detail label="Employment gaps" value={application.employment_gaps} />
          <Detail label="Professional references" value={application.professional_references} />
        </section>

        <section style={{ ...card, marginTop: 16 }}>
          <div style={row}><h2 style={{ margin: 0 }}>Interviews</h2><span style={muted}>{data.interviews.length + data.secondInterviews.length} records</span></div>
          {data.interviews.length === 0 && data.secondInterviews.length === 0 ? <Empty text="No scheduled interviews yet." /> : (
            <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
              {data.interviews.map((interview: any) => (
                <article key={interview.id} style={subcard}>
                  <div style={row}><strong>Scheduled interview</strong>{badge(interview.status)}</div>
                  <div style={muted}>{fmt(interview.scheduled_at)} · {interview.duration_minutes || 60} minutes · {interview.location || 'Online'}</div>
                  {interview.interviewer && <div style={{ marginTop: 5 }}>Interviewer: {interview.interviewer}</div>}
                  {interview.candidate_instructions && <Detail label="Candidate instructions" value={interview.candidate_instructions} />}
                  {interview.cancellation_reason && <div style={{ marginTop: 5, color: '#8a2323' }}>Cancellation reason: {interview.cancellation_reason}</div>}
                  {interview.meeting_link && <a href={interview.meeting_link} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 8, color: '#0f766e', fontWeight: 800 }}>Open meeting link</a>}
                </article>
              ))}
              {data.secondInterviews.map((interview: any) => (
                <article key={interview.id} style={subcard}>
                  <div style={row}><strong>Second-stage invitation</strong>{badge(interview.status)}</div>
                  <div style={muted}>Sent {fmt(interview.sent_at)} · Expires {fmt(interview.expires_at)}</div>
                  {interview.completed_at && <div style={{ marginTop: 5 }}>Completed {fmt(interview.completed_at)}</div>}
                  {interview.answers && <pre style={{ ...pre, marginTop: 10 }}>{show(interview.answers)}</pre>}
                </article>
              ))}
            </div>
          )}
        </section>

        {data.nurseInterview && (
          <section style={{ ...card, marginTop: 16 }}>
            <div style={row}>
              <h2 style={{ margin: 0 }}>Legacy nurse interview response</h2>
              {badge(data.nurseInterview.pathway || 'pathway not set')}
            </div>
            <div style={{ ...muted, marginTop: 7 }}>Submitted {fmt(data.nurseInterview.created_at)}</div>
            {nurseAnswers ? <pre style={{ ...pre, marginTop: 14 }}>{show(nurseAnswers)}</pre> : <Empty text="No legacy nurse interview answers were recorded." />}
          </section>
        )}

        <section style={{ ...card, marginTop: 16 }}>
          <h2 style={{ marginTop: 0 }}>Documents & evidence</h2>
          {data.documents.length === 0 ? <Empty text="No uploaded documents yet." /> : (
            <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
              {data.documents.map((document: any) => (
                <article key={document.id} style={subcard}>
                  <div style={row}>
                    <div>
                      <strong>{document.document_type}</strong>
                      <div style={muted}>{document.original_filename} · {document.mime_type} · {Number(document.file_size_bytes || 0).toLocaleString()} bytes</div>
                    </div>
                    <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                      {badge(document.status)}
                      <button disabled={busy} onClick={() => void downloadDocument(document.id)} style={buttonBase}>Download</button>
                      {document.status !== 'approved' && <button disabled={busy} onClick={() => void reviewDocument(document.id, 'approved')} style={primary}>Approve</button>}
                      {document.status !== 'rejected' && <button disabled={busy} onClick={() => void reviewDocument(document.id, 'rejected')} style={buttonBase}>Reject</button>}
                    </div>
                  </div>
                  {document.review_note && <div style={{ marginTop: 7, ...muted }}>Review: {document.review_note}</div>}
                  <div style={{ marginTop: 7, fontSize: 12, ...muted }}>Uploaded {fmt(document.uploaded_at)} · Reviewed {fmt(document.reviewed_at)}</div>
                </article>
              ))}
            </div>
          )}

          {data.documentRequests.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <strong>Document requests</strong>
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                {data.documentRequests.map((request: any) => (
                  <div key={request.id} style={subcard}>
                    <div style={row}><span><strong>{request.document_type}</strong>{request.required && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 800 }}>REQUIRED</span>}</span>{badge(request.status)}</div>
                    {request.description && <div style={{ marginTop: 5 }}>{request.description}</div>}
                    <div style={{ ...muted, fontSize: 12, marginTop: 5 }}>Requested {fmt(request.requested_at)} · Expires {fmt(request.expires_at)}</div>
                    {request.review_note && <div style={{ marginTop: 5 }}>Review: {request.review_note}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.evidenceReviews.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <strong>Evidence review history</strong>
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                {data.evidenceReviews.slice(0, 20).map((review: any) => (
                  <div key={review.id} style={{ borderTop: '1px solid #edf2f7', paddingTop: 8 }}>
                    {review.evidence_type} · {review.status} · {review.reviewed_by || 'System'} · {fmt(review.reviewed_at)}
                    {review.review_note && <div style={{ marginTop: 3, ...muted }}>{review.review_note}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section style={{ ...card, marginTop: 16 }}>
          <div style={row}>
            <h2 style={{ margin: 0 }}>Readiness gate</h2>
            <Link href={`/admin/applications/${encodeURIComponent(id)}/readiness`} style={buttonBase}>Open gate</Link>
          </div>
          {readiness.length === 0 ? <Empty text="No readiness checklist has been created yet." /> : (
            <div style={{ display: 'grid', gap: 9, marginTop: 14 }}>
              {readiness.map((item: any) => (
                <div key={item.id} style={subcard}>
                  <div style={row}>
                    <div><strong>{item.title}</strong>{item.required && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 800, color: '#8a2323' }}>REQUIRED</span>}</div>
                    {badge(item.status)}
                  </div>
                  {item.description && <div style={{ marginTop: 5, ...muted }}>{item.description}</div>}
                  {item.notes && <div style={{ marginTop: 5 }}>{item.notes}</div>}
                  {item.completed_at && <div style={{ marginTop: 5, ...muted, fontSize: 12 }}>Completed {fmt(item.completed_at)} · {item.completed_by || 'System'}</div>}
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={{ ...card, marginTop: 16 }}>
          <h2 style={{ marginTop: 0 }}>Contracts</h2>
          {data.contracts.length === 0 ? <Empty text="No contracts generated yet." /> : (
            <div style={{ display: 'grid', gap: 10 }}>
              {data.contracts.map((contract: any) => (
                <article key={contract.id} style={subcard}>
                  <div style={row}><strong>Version {contract.version} · {contract.job_title}</strong>{badge(contract.status)}</div>
                  <div style={muted}>Type: {contract.contract_type} · Start: {contract.start_date || 'Not set'} · Weekly hours: {contract.weekly_hours ?? contract.minimum_weekly_hours ?? 'Not set'}</div>
                  <div style={{ marginTop: 6 }}>Issued {fmt(contract.issued_at)} · Viewed {fmt(contract.viewed_at)} · Accepted {fmt(contract.accepted_at)}</div>
                  {contract.accepted_by_name && <div style={{ marginTop: 5 }}>Accepted by: {contract.accepted_by_name}</div>}
                  {contract.decline_reason && <div style={{ marginTop: 5, color: '#8a2323' }}>Decline reason: {contract.decline_reason}</div>}
                  {contract.contract_source && <div style={{ marginTop: 5, ...muted }}>Source: {contract.contract_source}</div>}
                </article>
              ))}
            </div>
          )}
        </section>

        {data.staff && (
          <section style={{ ...card, marginTop: 16 }}>
            <div style={row}><h2 style={{ margin: 0 }}>Workforce conversion</h2><Link href={`/admin/workforce/${encodeURIComponent(data.staff.id)}`} style={buttonBase}>Open Staff 360</Link></div>
            <div style={{ ...grid, marginTop: 14 }}>
              <Info label="Staff number" value={data.staff.employee_number || data.staff.laurm_id} />
              <Info label="Job title" value={data.staff.job_title} />
              <Info label="Employment status" value={data.staff.employment_status} />
              <Info label="Start date" value={data.staff.start_date} />
              <Info label="Location" value={data.staff.location} />
              <Info label="Right to work verified" value={data.staff.right_to_work_verified ? 'Yes' : 'No'} />
              <Info label="DBS verified" value={data.staff.dbs_verified ? 'Yes' : 'No'} />
            </div>
          </section>
        )}

        <section style={{ ...card, marginTop: 16 }}>
          <h2 style={{ marginTop: 0 }}>Lifecycle & audit history</h2>
          {data.statusHistory.length === 0 && data.adminActions.length === 0 && data.audit.length === 0 ? <Empty text="No lifecycle or audit records yet." /> : (
            <div style={{ display: 'grid', gap: 12 }}>
              {data.statusHistory.length > 0 && (
                <div>
                  <strong>Status history</strong>
                  <div style={{ display: 'grid', gap: 7, marginTop: 8 }}>
                    {data.statusHistory.map((item: any) => <div key={item.id} style={subcard}>{item.from_status || 'Start'} → {item.to_status} · {item.changed_by} · {fmt(item.created_at)}{item.note && <div style={{ ...muted, marginTop: 4 }}>{item.note}</div>}</div>)}
                  </div>
                </div>
              )}
              {data.adminActions.length > 0 && (
                <div>
                  <strong>Admin actions</strong>
                  <div style={{ display: 'grid', gap: 7, marginTop: 8 }}>
                    {data.adminActions.slice(0, 30).map((item: any) => <div key={item.id} style={subcard}>{item.action_type} · {item.actor} · {item.outcome} · {fmt(item.created_at)}{item.reason && <div style={{ ...muted, marginTop: 4 }}>{item.reason}</div>}</div>)}
                  </div>
                </div>
              )}
              {data.audit.length > 0 && (
                <div>
                  <strong>Workforce audit</strong>
                  <div style={{ display: 'grid', gap: 7, marginTop: 8 }}>
                    {data.audit.slice(0, 30).map((item: any) => <div key={item.id} style={subcard}>{item.event_type} · {item.actor || 'System'} · {fmt(item.created_at)}{item.details && <pre style={{ ...pre, marginTop: 7 }}>{show(item.details)}</pre>}</div>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
