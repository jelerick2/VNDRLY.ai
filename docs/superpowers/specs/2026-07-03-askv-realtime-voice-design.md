# AskV Realtime Voice Design

Date: 2026-07-03
Status: Ready for user review

## Decision

AskV will migrate to OpenAI Realtime as the shared voice engine for iOS and web. Realtime is a transport and interaction layer, not a replacement brain. The existing AskV backend tools remain the source of truth, with role gates, audit logging, and confirmation rules enforced on the VNDRLY server.

The target experience is that logged-in users can say "AskV" or "V" while the iOS app or web tab is open, issue one command, hear the result, and have AskV return to wake-word listening.

## Goals

- Make AskV useful as an operating layer over VNDRLY, not just a text chat panel.
- Support Field Employees, Foremen, Vendors, Partners, and admins from the same AskV tool catalog.
- Keep web and iOS behavior aligned.
- Execute normal field/ops actions immediately when confidence is high.
- Require spoken confirmation for high-impact actions.
- Log AskV actions into the audit chain as actions performed by AskV on behalf of the authenticated user.
- Preserve privacy and storage cost by saving transcript plus metadata only by default, not raw audio.

## Non-Goals For V1

- Always-on locked-screen wake phrase listening.
- Raw audio retention.
- Quiet-hours scheduling.
- Separate mobile-only AskV tools.
- A hidden or silent microphone mode.
- Replacing existing text AskV.

## Platform Behavior

### iOS

When a user is logged in and the VNDRLY iOS app is open in the foreground, the app listens for the wake phrase. The wake listener is active by default unless the user has selected remembered Text Only mode.

After wake phrase detection, AskV opens a one-command Realtime voice session. AskV handles one command, speaks the result, and returns to wake-word listening.

iOS locked/background behavior is not part of v1. Future background/locked audio work must use the correct iOS audio background mode, system microphone indicator, and App Review-safe copy. VNDRLY already has background location support; background audio is a separate permission/review surface.

### Web

When a user is logged in and the browser tab is open and active, the web app listens for the wake phrase unless the user has selected remembered Text Only mode.

The web app uses the same backend Realtime session endpoint, same tool catalog, same audit rules, and same confirmation rules as iOS.

### Text Only / Mute

Both iOS and web include a remembered per-user/per-device Text Only mode.

When Text Only is enabled:

- wake listening is off
- spoken responses are off
- notification read-aloud prompts are off
- text AskV remains fully available

This setting persists across app restarts and logins on that device/browser. V1 does not include quiet hours.

## Wake And Command Loop

Wake phrases:

- "AskV"
- "V"

"AskV" is the primary phrase. "V" is supported but should use stricter confidence because it is short and more likely to false-trigger.

Loop:

1. User is logged in and app/tab is open.
2. Wake listener waits for "AskV" or "V".
3. Wake phrase is detected.
4. App plays a short activation cue.
5. Realtime session accepts one command.
6. AskV executes the action or asks for missing required information.
7. AskV speaks the result.
8. App returns to wake-word listening.

If no command follows wake activation, AskV times out and returns to wake-word listening.

## Realtime Architecture

The architecture is server-owned.

1. Client requests a Realtime session from VNDRLY API.
2. VNDRLY API authenticates the user and creates an ephemeral OpenAI Realtime session.
3. VNDRLY API includes session instructions, role context, allowed tool schemas, and a safety/user identifier.
4. Client connects to OpenAI Realtime using the ephemeral session.
5. Realtime receives audio and emits tool calls when actions are needed.
6. Client forwards Realtime tool-call requests to a VNDRLY API tool-call endpoint.
7. VNDRLY API executes the existing AskV tool executor under the authenticated session.
8. VNDRLY API writes audit entries for mutating actions.
9. Tool result is returned to Realtime.
10. Realtime speaks the result to the user.

The OpenAI API key never ships to iOS or browser clients.

For v1, clients connect directly to OpenAI Realtime with ephemeral sessions and forward requested tool calls back to VNDRLY API for execution. A fully server-side Realtime bridge is out of scope for v1 and should only be added later if direct client sessions create reliability, compliance, or observability problems.

## Shared Tool Catalog

AskV tools must be provider-neutral. The current AskV tool definitions and executors should be refactored behind a shared registry that can emit:

- existing text AskV tool definitions
- OpenAI Realtime tool definitions
- role-filtered tool schemas
- audit metadata about mutating tools

All tools remain server-side. Realtime may request a tool call, but the VNDRLY backend decides whether the logged-in user can run it.

The iOS and web voice clients do not maintain a separate subset of tools. If a tool is in AskV and permitted for the user's role, it should be available through voice unless the tool requires a native capability that is unavailable on that surface.

## Role Scope

Field Employee voice actions include assigned-ticket lifecycle, route/ETA, onsite/offsite, notes, safety reports, crew communication, notification read-aloud, and ticket close-for-review where role rules allow it.

Foreman voice actions include Field Employee actions plus crew assignment, reassignment, schedule updates, ETA/status lookup, safety oversight, and crew coordination.

Vendor and office/admin voice actions include vendor operations, scheduling, employee/certification checks, ticket package submission, field nudges, flagged/billing issue triage, and vendor-side reporting.

Partner voice actions include hotlist/job posting support, vendor comparison, award workflow, ticket approval/kickback, invoice/payment review, vendor performance, and partner-side reporting.

When a requested action does not yet exist as an AskV tool, it should be added once to the shared AskV tool catalog rather than coded separately into iOS or web.

## Execution And Confirmation

Normal actions execute immediately when confidence is high.

Examples:

- start day
- en route
- arrived onsite
- start work
- add note
- read notification
- ask ETA/status
- mark basic field state
- start/stop route tracking
- create a draft safety report

High-impact actions require spoken confirmation.

Examples:

- close ticket for review
- submit final ticket package
- award work
- approve or reject invoice/ticket
- disperse or reverse funds
- reassign crew from one job to another
- delete records
- send external/customer-facing messages
- any action affecting pay, billing, compliance, or a legal record

Accepted confirmation phrases include:

- confirm
- sounds good
- execute
- do it
- yes
- that's right
- send it
- submit it
- go ahead

If the user says no, cancel, stop, or never mind, AskV cancels the pending action and returns to wake listening.

## Context Resolution

AskV can resolve vague references such as "the ticket", "my job", "this job", "this site", "there", "him", or "close it" using short-lived context.

Confidence ladder:

1. Explicit ticket/site/person named in the command.
2. Current ticket/screen context.
3. Active route or onsite state.
4. GPS inside one known ticket/site geofence.
5. Only one active assignment today.
6. Recent AskV voice context.

If multiple records remain plausible, AskV asks a short follow-up such as "Which ticket, 10959 or 10958?"

GPS may be used automatically when confidence is high. When GPS affects a decision, the audit metadata records that GPS was used and stores the relevant coordinate/accuracy metadata already permitted by VNDRLY's location policy.

## Short Voice Memory

AskV keeps short voice context until app close, logout, account switch, org switch, session expiry, or process restart.

Memory includes:

- recent command transcript
- last resolved ticket
- last mentioned employee/crew member
- last site/location
- last pending confirmation action
- current route/onsite state
- current screen context

AskV must not blindly reuse stale context if GPS, current assignment, or current screen contradicts it.

## Notification Read-Aloud

When a new notification arrives while app/tab is open and voice is not muted, AskV says:

"New notification. Do you want to hear it?"

For urgent notifications:

"Urgent notification. Do you want to hear it?"

AskV waits briefly for yes/no. If yes, it reads a concise summary. If no or timeout, it returns to wake listening.

Urgent notifications interrupt by default. Normal notifications wait until AskV is idle.

Urgent categories include:

- crew reassigned or removed
- schedule changed
- ticket kicked back
- safety event
- certification/compliance issue
- partner/vendor action required
- high-priority job/ticket update

## Audit And Privacy

Every mutating AskV action creates an audit entry.

Audit phrasing:

"AskV performed [action] on behalf of [user]."

Audit metadata includes:

- authenticated user
- role and org at action time
- client surface: iOS voice, iOS text, web voice, or web text
- transcript
- parsed intent
- affected record type and id
- confidence
- GPS metadata if used
- confirmation phrase if required
- tool result
- success/failure
- timestamp

Raw audio is not stored in v1. Audio may be processed transiently for recognition/Realtime and then discarded.

## Voice Personality

AskV should sound like a male American English professional in his mid-30s: expert, concise, positive, and direct.

Response style:

- direct answer first
- minimal fluff
- if AskV can do the task, do it
- if AskV cannot do it, give the shortest useful manual path
- speak in short field-appropriate sentences

## Error Handling

Low confidence:

- AskV asks one concise follow-up.

Missing required data:

- AskV asks only for the missing field.

Tool denied:

- AskV explains the role boundary and names who can do it.

Network failure:

- AskV says the action did not complete and keeps the pending command available for retry where safe.

Permission failure:

- AskV explains the missing permission, such as microphone, location, notifications, or camera.

GPS ambiguity:

- AskV asks the user to name the ticket/site.

High-impact action without confirmation:

- AskV keeps the pending action and waits for a confirmation phrase or cancellation.

## Rollout Plan

1. Inventory current AskV tools and classify read/write/high-impact/native-capability requirements.
2. Refactor AskV tools into a provider-neutral registry.
3. Add AskV action audit logging for text actions first.
4. Add Realtime session endpoint and ephemeral session creation.
5. Add Realtime adapter for tool schemas and tool-result routing.
6. Add web Realtime voice client behind a development flag.
7. Add iOS Realtime voice client behind a development flag.
8. Add wake phrase loop and one-command session behavior.
9. Add remembered Text Only mode to web and iOS.
10. Add notification read-aloud prompt.
11. Expand missing AskV tools for field, foreman, vendor, and partner workflows.
12. Run role-gated end-to-end tests across iOS and web.
13. Enable for internal testers, then TestFlight.

## Testing Requirements

Unit tests:

- tool registry emits valid text and Realtime definitions
- role gating filters tools correctly
- high-impact classifier requires confirmation
- confirmation phrase parser accepts known variations
- context resolver picks current ticket only when confidence is high
- audit payload is complete and redacts raw audio

API tests:

- Realtime session endpoint requires authentication
- Realtime session endpoint never exposes permanent OpenAI API keys
- tool-call endpoint executes under the user's session
- denied tool calls are refused server-side
- mutating calls write audit entries

iOS tests:

- Text Only setting persists
- wake listener disabled in Text Only mode
- one-command voice loop returns to wake listening
- current ticket/GPS context is passed to AskV
- notification prompt respects Text Only mode

Web tests:

- tab-open wake mode starts only for authenticated users
- Text Only setting persists in browser storage
- Realtime client uses ephemeral sessions
- spoken notification prompt does not fire while muted

Manual smoke tests:

- Field Employee: en route, arrive, start work, note, complete, close for review with confirmation
- Foreman: schedule/reassign crew, ask ETA, create safety report
- Vendor: find action-needed tickets, nudge field, review close-for-review tickets
- Partner: hotlist status, award workflow, approval/kickback flow

## References

- OpenAI Realtime guide: https://developers.openai.com/api/docs/guides/realtime
- OpenAI Realtime WebRTC guide: https://developers.openai.com/api/docs/guides/realtime-webrtc
- OpenAI function calling guide: https://developers.openai.com/api/docs/guides/function-calling
- Apple Speech framework: https://developer.apple.com/documentation/speech/
- Apple UIBackgroundModes: https://developer.apple.com/documentation/bundleresources/information-property-list/uibackgroundmodes
