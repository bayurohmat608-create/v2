# CP18 — V1 social feature parity inventory

Baseline V2: d3f74a4. Source evidence only, not Android runtime certification.
Screenshots V1: group chat, direct messages, story viewer, models, media and code.

| ID | V1 capability | V2 source status |
|---|---|---|
| 01 | Chats/unread/preview | PRESENT, untested on Android |
| 02 | Group Budi/Rian | PRESENT; Zovia target only |
| 03 | Private Budi/Rian chats | PRESENT, authorization hardening required |
| 04 | Private Zovia chat | METADATA ONLY, no runtime/UI |
| 05 | Typing indicator | PRESENT |
| 06 | Pinned topic | PRESENT |
| 07 | Bubbles/timestamps/receipts | PRESENT |
| 08 | Quoted replies | PRESENT |
| 09 | Images/file uploads | PRESENT |
| 10 | Agent file attachment | PRESENT, permissions unverified |
| 11 | Expandable code preview | PRESENT |
| 12 | Per-agent model labels | PRESENT, hardcoded catalog |
| 13 | Status/story and expiry | PRESENT |
| 14 | Agent reactions to Status | PRESENT |
| 15 | Voice note and TTS | PARTIAL |
| 16 | Call-style audio/video UI | SIMULATED, not real video call |
| 17 | Audio/notifications | PARTIAL |
| 18 | Quick actions/mentions | PARTIAL; receipts needed |
| 19 | WhatsApp-like UI appearance | PRESERVED, no edits in CP18 |
| 20 | Long history/scroll | PRESENT, stress QA needed |
| 21 | Multi-profile and model choices | PARTIAL |
| 22 | Antigravity from V1 | MANAGED SUPPORT DISABLED in V2 |
| 23 | E2EE display claim | UNVERIFIED: must correct before release |
| 24 | Wake lock/monitoring | PARTIAL; evidence needed |
| 25 | Contact avatars | PRESENT Budi/Rian; Zovia pending |
| 26 | Selective group/private context | PARTIAL, proper scoped ACL pending |

All statuses labeled PRESENT refer to source presence, not end-to-end verification.
New static regression test in scripts/qa checks 15 important UI/backend symbols.
Follow-up: golden screenshot tests, physical-device tests, and scoped room APIs.
