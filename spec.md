# Blood Net

## Current State

Full-stack blood donation management system with four roles: CEO, DM, AM, User.

**Backend capabilities:**
- Districts, Areas, DMs, AMs, Users, Donors CRUD
- Blood requests: create, forward, complete, getBloodRequestsForRecipient
- Notices: send, get for recipient
- Blood requests have: fromRole, fromId, toRole, toId, patient info, status, createdAt
- No messaging or chat functionality
- No feedback/complaints functionality

**Frontend state:**
- CEODashboard: districts, approvals, managers, notices, profile tabs
- DMDashboard: areas, approvals, blood requests, profile tabs
- AMDashboard: overview, donors, add-donor, requests (send), received-requests, profile tabs
  - Received requests shows requests from DMs and other AMs with sender badge (purple for DM, teal for AM)
  - Send request: currently sends only to DMs
  - Forward request: currently forwards only to DMs
- UserDashboard: become-donor, request (send to DM only), profile tabs

## Requested Changes (Diff)

### Add
1. **Private Chat system** - backend: MessageDto with id, fromRole, fromId, toRole, toId, content, createdAt. Methods: sendMessage, getMessagesForThread, getMyConversations. Frontend: Chat tab in all dashboards (CEO, DM, AM, User).
   - CEO can message any DM
   - DM can message any AM, any DM, and CEO
   - AM can message any DM, any AM
   - AM can message a User only after receiving a blood request from that user
   - User can message an AM only if they have sent a blood request to that AM

2. **Feedback & Complaints system** - backend: FeedbackDto with id, fromRole, fromId, targetRole, targetId, type (feedback/complaint), message, createdAt. Methods: submitFeedback, getFeedbackForDashboard. Frontend: Feedback tab with two sub-tabs (Feedback, Complaints) for DM, AM, User dashboards. CEO gets a Feedback tab showing only DM-vs-DM complaints.
   - DM complaints against another DM → CEO dashboard
   - AM complaint against a DM → that DM's district DM (the DM who supervises the AM)
   - AM complaint against another AM → target AM's District Manager
   - User complaint against an AM → that AM's District Manager
   - General feedback goes to a separate general feedback store (no recipient)

3. **User send blood request to AM** - User dashboard: add option to send to AM (select district → select area/AM → send)

4. **AM send blood request to any AM** - AM send request section: allow selecting any AM across all districts as recipient

5. **AM forward blood request to any AM or DM** - AM forward: allow selecting any AM or any DM across all districts

6. **AM received requests shows both DMs and Users** - Already partially implemented. Ensure Users are shown with name, contact, role badge + area label.

### Modify
1. **AMDashboard - Send Request section**: Load all approved AMs and all approved DMs. Let user choose to send to either a DM or an AM across all districts.
2. **AMDashboard - Forward section**: Allow forwarding to any DM or any AM across all districts.
3. **AMDashboard - Received Requests section**: Show requests from DMs AND Users, each with name, contact, and role badge with district/area name.
4. **UserDashboard - Send Request section**: Add option to send to AM (select district first, then area, then that area's AM). Keep existing DM option.

### Remove
- Nothing removed.

## Implementation Plan

### Backend (Motoko)
1. Add `MessageDto` type: `{ id: Nat; fromRole: Text; fromId: Nat; toRole: Text; toId: Nat; content: Text; createdAt: Int }`
2. Add `messages` map and `messageIdCounter`
3. Add `sendMessage(fromRole, fromId, toRole, toId, content)` → MessageDto
4. Add `getMessagesInThread(role1, id1, role2, id2)` → [MessageDto] (both directions)
5. Add `getConversationsForUser(role, id)` → list of unique (role, id) pairs who have exchanged messages with this user
6. Add `FeedbackDto` type: `{ id: Nat; fromRole: Text; fromId: Nat; toRole: Text; toId: ?Nat; itemType: Text; message: Text; createdAt: Int }`
   - itemType: "feedback" or "complaint"
   - For complaints, toRole = "ceo" or "dm", toId = relevant id
   - For general feedback, toRole = "system", toId = null
7. Add `submitFeedback(fromRole, fromId, toRole, toId, itemType, message)` → FeedbackDto
8. Add `getFeedbackForDashboard(role, id)` → [FeedbackDto] — returns items where toRole == role and toId == id (or null for general)
9. Add `getAllAMs()` → [AreaManagerDto] — returns all approved area managers across all districts
10. Add `getAllUsers()` → [UserDto] — needed for AM to see users who sent them requests

### Frontend
1. **Chat tab** in CEO, DM, AM, User dashboards
   - Contact picker based on role permissions
   - Thread view for selected contact
   - Message input and send
   - Auto-refresh polling
2. **Feedback tab** in DM, AM, User dashboards (and CEO)
   - Two sub-tabs: "Feedback" (general) and "Complaints"
   - Complaint target selection based on role
   - CEO sees DM-vs-DM complaints only
   - DM sees complaints directed to them
3. **User blood request**: add AM option with district → area picker
4. **AM send request**: add AM option alongside DM option
5. **AM forward request**: update to show both DMs and AMs
6. **AM received requests**: show Users with name, contact, role badge
