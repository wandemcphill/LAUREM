'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StaffTimesheetsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignmentId, setAssignmentId] = useState('');
  const [workDate, setWorkDate] = useState('');
  const [clockIn, setClockIn] = useState('');
  const [clockOut, setClockOut] = useState('');
  const [breakMinutes, setBreakMinutes] = useState('0');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const response = await fetch('/api/staff/timesheets', { cache: 'no-store' });
    if (response.status === 401) { router.replace('/staff/login'); return; }
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setRows(data.timesheets || []);
      const shiftResponse = await fetch('/api/staff/shifts', { cache: 'no-store' });
      if (shiftResponse.status === 401) { router.replace('/staff/login'); return; }
      const shiftData = await shiftResponse.json().catch(() => ({}));
      if (!shiftResponse.ok) {
        setError(shiftData.error || 'Unable to load your assignments.');
        return;
      }
      const merged = [...(shiftData.shifts || []), ...(shiftData.history || [])];
      const unique = merged.filter((item: any, index: number, list: any[]) => index === list.findIndex((other) => other.id === item.id));
      setAssignments(unique);
      if (!assignmentId && unique.length) setAssignmentId(unique[0].id);
    } else setError(data.error || 'Unable to load timesheets.');
  }

  useEffect(() => { void load(); }, [router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    const response = await fetch('/api/staff/timesheets', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ assignmentId, workDate, clockIn, clockOut, breakMinutes: Number(breakMinutes), notes }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setError(data.error || 'Unable to submit timesheet.'); setBusy(false); return; }
    setClockIn(''); setClockOut(''); setBreakMinutes('0'); setNotes('');
    await load(); setBusy(false);
  }

  return <main style={{ minHeight: '100vh', background: '#f4f7fb', fontFamily: 'system-ui', padding: 24, color: '#102a43' }}>
    <div style={{ maxWidth: 1050, margin: '0 auto' }}>
      <button onClick={() => router.push('/staff')} style={{ border: 0, background: 'transparent', padding: 0, color: '#0f766e', fontWeight: 800 }}>← Staff Portal</button>
      <h1>Timesheets</h1>
      <p style={{ color: '#627d98' }}>Submit worked hours for payroll review. Every timesheet must be linked to a scheduled LAUREM assignment.</p>
      <form onSubmit={submit} style={{ background: '#fff', border: '1px solid #e5eaf0', borderRadius: 14, padding: 18, marginBottom: 18, display: 'grid', gap: 10 }}>
        <label>Assignment
          <select required value={assignmentId} onChange={(e) => setAssignmentId(e.target.value)} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: 10, marginTop: 5 }}>
            <option value="" disabled>Select a LAUREM assignment</option>
            {assignments.map((assignment: any) => <option key={assignment.id} value={assignment.id}>{assignment.client_name || 'LAUREM Assignment'} · {new Date(assignment.scheduled_start).toLocaleString('en-GB')}</option>)}
          </select>
        </label>
        <label>Work date<input type="date" required value={workDate} onChange={(e) => setWorkDate(e.target.value)} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: 10, marginTop: 5 }} /></label>
        <label>Clock in<input type="datetime-local" required value={clockIn} onChange={(e) => setClockIn(e.target.value)} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: 10, marginTop: 5 }} /></label>
        <label>Clock out<input type="datetime-local" required value={clockOut} onChange={(e) => setClockOut(e.target.value)} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: 10, marginTop: 5 }} /></label>
        <label>Break minutes<input type="number" min="0" max="480" value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: 10, marginTop: 5 }} /></label>
        <label>Notes<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: 10, marginTop: 5 }} /></label>
        <button disabled={busy} style={{ padding: 11, border: 0, borderRadius: 10, background: '#0f766e', color: '#fff', fontWeight: 900 }}>{busy ? 'Submitting…' : 'Submit timesheet'}</button>
        {error && <p style={{ color: '#b42318', margin: 0 }}>{error}</p>}
      </form>
      <div style={{ display: 'grid', gap: 12 }}>{rows.map((row) => <article key={row.id} style={{ background: '#fff', border: '1px solid #e5eaf0', borderRadius: 14, padding: 18 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><strong>{row.work_date}</strong><span style={{ fontSize: 12, fontWeight: 800 }}>{String(row.status).toUpperCase()}</span></div><p style={{ marginBottom: 4 }}>{row.total_hours ?? '0'} hours</p><p style={{ color: '#627d98', margin: 0 }}>{row.clock_in ? new Date(row.clock_in).toLocaleString('en-GB') : '—'} → {row.clock_out ? new Date(row.clock_out).toLocaleString('en-GB') : '—'}</p>{row.notes && <p style={{ color: '#486581', whiteSpace: 'pre-wrap' }}>{row.notes}</p>}</article>)}</div>
    </div>
  </main>;
}
