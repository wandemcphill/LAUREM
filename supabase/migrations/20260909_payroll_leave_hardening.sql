create or replace function public.validate_staff_leave_request()
returns trigger
language plpgsql
as $$
begin
  if new.end_date < new.start_date then
    raise exception 'Leave end date must be on or after start date';
  end if;
  new.total_days := (new.end_date - new.start_date) + 1;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists staff_leave_request_validate on staff_leave_requests;
create trigger staff_leave_request_validate
before insert or update of start_date, end_date, status, reason
on staff_leave_requests
for each row execute function public.validate_staff_leave_request();

create index if not exists staff_assignments_status_time_idx
  on staff_assignments(status, scheduled_start, scheduled_end);

create index if not exists staff_timesheets_status_work_date_idx
  on staff_timesheets(status, work_date desc);
