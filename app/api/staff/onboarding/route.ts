import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getStaffSession } from '@/lib/laurem-staff-auth';

export async function GET(req: NextRequest) {
  const session = await getStaffSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const client = db();
  const { data: packageRow, error: packageError } = await client
    .from('staff_onboarding_packages')
    .select('id,staff_id,audience,title,status,assigned_at,completed_at,created_at,updated_at')
    .eq('staff_id', session.staff_id)
    .maybeSingle();
  if (packageError) return NextResponse.json({ error: 'Unable to load onboarding package.' }, { status: 500 });
  if (!packageRow) return NextResponse.json({ package: null, tasks: [] });

  const { data: tasks, error: taskError } = await client
    .from('staff_onboarding_tasks')
    .select('id,package_id,task_key,category,title,description,required,status,document_path,acknowledgement_required,acknowledged_at,completed_at,notes,sort_order')
    .eq('package_id', packageRow.id)
    .order('sort_order', { ascending: true });
  if (taskError) return NextResponse.json({ error: 'Unable to load onboarding tasks.' }, { status: 500 });

  return NextResponse.json({ package: packageRow, tasks: tasks || [] });
}

export async function PATCH(req: NextRequest) {
  const session = await getStaffSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const taskId = typeof body?.taskId === 'string' ? body.taskId : '';
  const action = typeof body?.action === 'string' ? body.action : '';
  if (!taskId || action !== 'acknowledge') return NextResponse.json({ error: 'A task id and acknowledge action are required.' }, { status: 400 });

  const client = db();
  const { data: packageRow, error: packageError } = await client
    .from('staff_onboarding_packages')
    .select('id,staff_id,status')
    .eq('staff_id', session.staff_id)
    .maybeSingle();
  if (packageError) return NextResponse.json({ error: 'Unable to load onboarding package.' }, { status: 500 });
  if (!packageRow) return NextResponse.json({ error: 'Onboarding package not found.' }, { status: 404 });

  const { data: task, error: taskError } = await client
    .from('staff_onboarding_tasks')
    .select('id,package_id,status,acknowledgement_required,acknowledged_at')
    .eq('id', taskId)
    .eq('package_id', packageRow.id)
    .maybeSingle();
  if (taskError) return NextResponse.json({ error: 'Unable to load onboarding task.' }, { status: 500 });
  if (!task) return NextResponse.json({ error: 'Onboarding task not found.' }, { status: 404 });
  if (!task.acknowledgement_required) return NextResponse.json({ error: 'This onboarding task does not require employee acknowledgement.' }, { status: 409 });
  if (task.acknowledged_at) return NextResponse.json({ error: 'This task has already been acknowledged.' }, { status: 409 });

  const now = new Date().toISOString();
  const { data: updatedTask, error: updateError } = await client
    .from('staff_onboarding_tasks')
    .update({ acknowledged_at: now, acknowledged_by: session.staff_id, updated_at: now })
    .eq('id', taskId)
    .eq('package_id', packageRow.id)
    .is('acknowledged_at', null)
    .select('id,package_id,task_key,category,title,description,required,status,document_path,acknowledgement_required,acknowledged_at,completed_at,notes,sort_order')
    .single();
  if (updateError || !updatedTask) return NextResponse.json({ error: 'Unable to acknowledge onboarding task.' }, { status: 409 });

  const { data: allTasks, error: allTasksError } = await client
    .from('staff_onboarding_tasks')
    .select('required,status,acknowledgement_required,acknowledged_at')
    .eq('package_id', packageRow.id);
  if (allTasksError) return NextResponse.json({ error: 'Task acknowledged, but package progress could not be refreshed.' }, { status: 500 });

  const required = allTasks || [];
  const requiredDone = required.filter((item) => !item.required || item.status === 'completed' || item.status === 'waived').length;
  const acknowledgementsDone = required.filter((item) => !item.acknowledgement_required || Boolean(item.acknowledged_at)).length;
  const packageComplete = required.length > 0 && requiredDone === required.length && acknowledgementsDone === required.length;
  const packageStatus = packageComplete ? 'complete' : 'in_progress';

  const { data: updatedPackage, error: packageUpdateError } = await client
    .from('staff_onboarding_packages')
    .update({ status: packageStatus, completed_at: packageComplete ? now : null, updated_at: now })
    .eq('id', packageRow.id)
    .eq('staff_id', session.staff_id)
    .select('id,staff_id,audience,title,status,assigned_at,completed_at,created_at,updated_at')
    .single();
  if (packageUpdateError || !updatedPackage) return NextResponse.json({ error: 'Task acknowledged, but package status could not be refreshed.' }, { status: 500 });

  return NextResponse.json({ task: updatedTask, package: updatedPackage });
}
