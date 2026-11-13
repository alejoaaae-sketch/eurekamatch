# Architecture rules
- Keep the landing presentation experiment behind `LANDING_EXPERIMENT_ENABLED`, preserving the legacy landing independently, so reverting presentation does not alter account data or business rules.
- Use the same experiment switch for the Love display-name override and direct landing authentication links; keep the stored mode identifier unchanged so existing picks and matches remain available.
- Authenticate database match callbacks with a private, per-match, single-use token; check live bilateral blocks in both match reads and notification delivery to prevent forged callbacks and stale contact access.
- Require verified profile emails for email-based matching and reset verification on email changes so mailbox identity cannot be claimed through editable profile fields.
- Charge replacement-pick credits inside the insert transaction with a per-user lock; never separately debit in the client so direct inserts cannot bypass payment or charge twice.