# LAUREM Portal onboarding security notes

Staff onboarding is bound to the accepted employment contract loaded from the candidate application. Caller-supplied contract IDs are not trusted for staff creation.

A waived readiness item is not equivalent to verified evidence. In particular, `staff_profiles.right_to_work_verified` is true only when the readiness item is actually completed.

Lifecycle: accepted contract → matching role → readiness complete → pending staff profile → onboarding package → portal activation.
