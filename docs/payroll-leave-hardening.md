# Payroll and leave hardening

This pass makes leave-day totals deterministic at the database layer and adds operational indexes for assignment and timesheet review.

Payroll remains calculation-only. No payment rail, bank transfer, or payroll disbursement is introduced here.
