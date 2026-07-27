# Driver Attendance — Security Audit

**Date:** 2026-07-27  
**Project:** `cuit-a24e8` (Firebase Hosting live, 20+ drivers / 3 managers)  
**Firestore:** Standard edition, native mode, `asia-southeast1`

## Summary

The app is live and functional, but **Firestore and Storage rules are too open for production**. Authorization is mostly enforced in the React UI, not in security rules. Any authenticated driver can potentially read/write sensitive collections by calling Firestore directly.

## Critical findings

### 1. Firestore blanket authenticated access

`firestore.rules` allows:
- Public `get` on any `drivers/{id}` (needed for registration checks)
- Authenticated `list`/`write` on all drivers
- Authenticated `read`/`write` on **every other collection** via catch-all

Impact: any signed-in driver can modify leave approvals, cover approvals, points, `isManager`, chats, DMs, shop items, clock-ins, and FCM token docs.

### 2. Storage blanket authenticated access

`storage.rules` allows any signed-in user to read/write any object path.

Impact: leave documents and other uploads are not owner-scoped.

### 3. Cloud Functions trust client-writable token docs

`functions/index.js`:
- `sendChatNotification` — on `chats/{messageId}` create; fans out via `users` FCM tokens
- `sendPrivateMessageNotification` — on `private_chats/{messageId}` create; uses recipient token from `users/{recipientId}`

Clients write `users/{driverId}` with `{ fcmToken, id }` from `src/firebase/services.js`. Because rules allow any authenticated write to `users`, tokens can be spoofed or overwritten.

## High / medium issues

| Severity | Issue |
|----------|--------|
| High | Manager-only actions (approve leave/cover, resign, reset, change area) are UI-only; not enforced in rules |
| High | No role check (`isManager`) in Firestore rules |
| Medium | No schema validation (types, sizes, immutable fields, state transitions) |
| Medium | Dual FCM token paths: `users/{id}` in `services.js` vs `drivers/{id}.fcmToken` in `messaging.js` |
| Medium | `sendToDevice` (legacy FCM API) used; prefer `sendEachForMulticast` / modern messaging APIs |
| Low | Firestore PITR / delete protection disabled on the live database |

## Collections in use

`drivers`, `leave_requests`, `cover_requests`, `clock_ins`, `chats`, `private_chats`, `vlogs`, `global_shouts`, `users`, `shop_items`, `point_transactions`, `typing_status`, `team_chat_reads`

## Recommended next steps

1. Harden `firestore.rules` with least privilege + manager helpers + ownership checks (prototype first; validate against live queries before deploy).
2. Harden `storage.rules` to scope uploads by path/owner.
3. Make `users` token docs owner-only (or move token registration to a callable function).
4. Unify FCM token storage to one source of truth.
5. Re-test registration, clock-in, leave/cover approval, chat, and shop after rules deploy.

## Notes

This document captures an audit only. Rules/functions were **not** changed in this pass. Prototype secure rules should be reviewed carefully before deploying to the live user base.
