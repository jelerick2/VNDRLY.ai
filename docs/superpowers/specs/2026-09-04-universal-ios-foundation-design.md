# Universal iOS Foundation Design

## Objective

Evolve the existing Expo/React Native VNDRLY app into one adaptive iPhone and iPad application without replacing its approved industrial visual language. The app must preserve PNG pill/button/toggle chrome, branded back controls, notification treatment, organization logos, dynamic partner/vendor primary colors, and the branded AskV artwork.

This specification deliberately separates the work into independently releasable phases. Phase 1 establishes the universal navigation and branding foundation. Later phases add the role dashboard, shared map workspace, office/admin modules, and durable offline reconciliation.

## Approved Product Direction

- Use Option A: an adaptive command-center application.
- iPhone uses a bottom navigation tray optimized for fast field actions.
- iPad uses a persistent left navigation rail and a larger content canvas.
- Screens and workflows are shared; their composition changes at responsive breakpoints.
- Gate users retain a dedicated navigation set with Voice as the center action.
- Gate Voice uses the same two PNG layers as the web app: `white-circle-voice-back.png` tinted with the active organization primary color and `white-circle-voice-overlay.png` rendered above it.
- The Gate Voice mark is 12.5% larger than ordinary navigation icons, toggles listening with successive taps, has no UI timeout, and clearly exposes idle/listening accessibility state.
- AskV uses the exact web 1024×512 branded image family. It is grey while idle and selects the closest organization-specific/primary-color active image when selected or engaged.
- Existing mobile PNG controls remain canonical. No flat approximations replace pills, toggles, buttons, branded back buttons, or logos.
- iPad is enabled in the existing App Store application rather than published as a separate app.

## Phase 1: Adaptive Shell and Branded Navigation

### Navigation model

Navigation is derived from the authenticated viewer. The route manifest remains the single source of truth for visibility, label, icon, badge, Voice behavior, and AskV treatment.

On compact widths, routes render in the existing bottom tray. Gate routes are ordered `Gate`, `AskV`, `Voice`, `History`, `Profile`, keeping Voice centered. Other roles retain their current available routes during Phase 1 so this release does not remove existing access.

At widths of 768 points or greater, the same route manifest renders as a 228-point persistent sidebar. The active organization identity appears at the top; navigation fills the middle; connectivity/sync status and Profile belong at the bottom in later phases.

### Responsive behavior

- `compact`: width below 768 points; bottom navigation.
- `regular`: width at least 768 points; sidebar navigation.
- Device type is not the deciding signal. iPad split view can collapse to compact navigation when its window narrows.
- The content route is unchanged when the window crosses the breakpoint.
- iPad supports portrait, landscape, and multitasking widths. The first universal build changes Expo orientation to `default` and enables tablet support.

### Brand and image behavior

`useBrand()` remains authoritative for primary color, organization name, and logo. Gate Voice tints only the background mask; the highlight/voice overlay is never tinted. AskV selection follows the web resolver's organization overrides first, then hue-based nearest palette match. All images are bundled locally so navigation remains visually correct without a network connection.

### Accessibility and motion

- Every navigation item exposes button role, selected/pressed state, and a localized label.
- Compact touch targets are at least 44×44 points.
- Voice exposes `accessibilityState.checked` while listening and the active label changes to the localized listening text where available.
- Listening pulse is opacity-based and disabled when reduced-motion support is added in a later polish task; the Phase 1 control remains understandable without animation.

### Compatibility

Phase 1 does not change APIs, database schema, authentication, route URLs, or Gate transcription logic. Existing route components continue to render within the new shell. No external runtime dependency is introduced.

## Later Phases

1. Role-aware Home command center and compact `Home / Map / Tickets / More` information architecture.
2. Shared Map workspace: iPhone map plus sliding detail sheet; iPad map plus persistent site/crew/ticket panel.
3. Gate iPad workspace and full Gate history/on-site coordination.
4. Office/admin capabilities migrated from web in role-permitted modules.
5. Local durable database, mutation outbox, media queue, automatic reconnection, idempotent API writes, conflict review, and visible sync states.

Each phase must ship as a working application and preserve the live route set until its replacement is verified.

## Verification

- Unit-test navigation order and role visibility.
- Unit-test AskV brand asset selection.
- Component-test Gate Voice layering, sizing, accessibility state, and press behavior.
- Component-test compact versus regular shell rendering.
- Run mobile typecheck and mobile Vitest suite.
- Validate iPhone compact, iPad portrait, iPad landscape, and iPad split-view dimensions before TestFlight.
