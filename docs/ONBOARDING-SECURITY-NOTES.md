# LAUREM Portal onboarding security notes

The staff-conversion route must bind a staff profile to the accepted employment contract already loaded for the candidate. A caller-supplied contract ID must never be allowed to substitute another contract for the candidate.

The pre-staff readiness gate may contain waived checks. A waived right-to-work item is not itself evidence that right-to-work was verified, so `staff_profiles.right_to_work_verified` remains false unless the checklist item is actually completed.

The staff lifecycle remains:

`accepted contract → matching role → readiness complete → pending staff profile → onboarding package → portal activation`

This document applies to LAUREM Portal only.
