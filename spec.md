# Blood Net

## Current State
The Area Manager dashboard has a "Received Requests" tab (`received-requests`) that fetches blood requests where `toRole="am"` and `toId=amId`. In the display, it resolves the sender name by looking up `getDmUsername(req.fromId)` — which only works when `fromRole="dm"`. When a request comes from another Area Manager (`fromRole="am"`), the sender name and area/district info are not shown.

## Requested Changes (Diff)

### Add
- Load area managers list (approved AMs in the same district) on dashboard init, so AM-to-AM request senders can be identified by name
- Load areas list so we can resolve area names for AM senders
- In the Received Requests card, display a "From" row that shows:
  - Sender's name (DM username if `fromRole="dm"`, AM username if `fromRole="am"`)
  - Sender's district name (for DMs) OR area name + district name (for AMs)
  - Role label ("District Manager" or "Area Manager")

### Modify
- `loadData()`: also fetch `getApprovedAreaManagersByDistrict(districtId)` and areas for the district
- Received Requests card: replace the current simple DM username display with a rich "Received From" section showing role, name, and district/area

### Remove
- Nothing removed

## Implementation Plan
1. Add state variables: `areaManagers: AreaManagerDto[]`, `areas: AreaDto[]`
2. In `loadData()`, add parallel fetch of `getApprovedAreaManagersByDistrict(districtId)` and `getAreasByDistrict(districtId)`
3. Add helper `getSenderInfo(fromRole, fromId)` that returns `{ name, subtitle }` based on role
4. Update the Received Requests card to show a "Received From" section with name, role badge, and district/area name
