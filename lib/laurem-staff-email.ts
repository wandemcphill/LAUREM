import { Resend } from 'resend';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureLauremMailbox } from './laurem-messaging';

function esc(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
}

export async function sendLauremStaffActivation(client: SupabaseClient, staff: Record<string, any>, token: string) {
  const mailbox = await ensureLauremMailbox(client, {
    id: staff.id,
    full_name: staff.full_name,
    job_title: staff.job_title,
  });
  const address = `${mailbox.handle}@${mailbox.namespace}`;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const activationUrl = `${appUrl}/staff/activate?token=${encodeURIComponent(token)}&email=${encodeURIComponent(staff.email)}`;

  if (!process.env.RESEND_API_KEY) return { status: 'not_configured' as const, address, url: activationUrl };

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL || 'LAUREM Care <onboarding@resend.dev>';
  const result = await resend.emails.send({
    from,
    to: staff.email,
    subject: 'Activate your LAUREM Care Personal Portal',
    html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto"><p style="color:#0f766e;font-weight:800">LAUREM CARE</p><h1>Your Personal Portal is ready</h1><p>Hello ${esc(staff.full_name)},</p><p>Your employment has passed LAUREM's onboarding checks and your private staff portal is ready for activation.</p><p><strong>LAUREM ID:</strong> ${esc(staff.laurem_id || staff.employee_number)}<br><strong>LAUREM address:</strong> ${esc(address)}</p><p><a href="${activationUrl}" style="background:#0f766e;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:800">Activate portal</a></p><p>Use your portal for messages, shifts, timesheets, payroll documents and employment information.</p></div>`,
    text: `Your LAUREM Care Personal Portal is ready. LAUREM ID: ${staff.laurem_id || staff.employee_number}. Address: ${address}. Activate: ${activationUrl}`,
  });
  return { status: result.error ? 'failed' : 'sent' as const, address, url: activationUrl, error: result.error?.message || null };
}
