# CP20 • Structured Actions & Receipts (PARTIAL)

- ✅ [x] agent/action-protocol.js defines pending mention/delegate/share requests.
- ✅ [x] Input validation checks room membership, sender and recipient, request IDs, bounded text and idempotency.
- ✅ [x] Cross-room mention/delegation is denied, and cross-room share is held for explicit future Owner approval.
- ✅ [x] Unit tests in scripts/qa/action-protocol.test.js are passing.
- ⬜ [ ] Durable journal and verified execution receipt.
- ⬜ [ ] Real group event delivery for calling Rian or delegating jobs.
- ⬜ [ ] Owner consent signing, revocation, and cross-room context sharing.
- ⬜ [ ] UI and Android end-to-end action verification.

This checkpoint implements the **request contract** only. It does not run a CLI or perform a real agent action.
