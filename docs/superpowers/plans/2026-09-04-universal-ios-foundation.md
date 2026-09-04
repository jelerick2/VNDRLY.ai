# Universal iOS Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first universal-app foundation: iPad enablement, adaptive sidebar/bottom navigation, the web-derived branded AskV mark, and the centered oversized Gate Voice control.

**Architecture:** A pure route-manifest module derives role-visible navigation items. `AdaptiveNavigationShell` renders that manifest as bottom navigation below 768 points and as a sidebar at or above 768 points. Specialized image components own AskV palette selection and two-layer Gate Voice rendering while reusing the existing brand context and Gate voice event bus.

**Tech Stack:** Expo 54, React Native 0.81, Expo Router 6, TypeScript 5.9, Vitest 4, React Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-04-universal-ios-foundation-design.md`

## Global Constraints

- Preserve existing routes, APIs, authentication, Gate transcription, and non-gate phone access in Phase 1.
- Use a width breakpoint of exactly 768 React Native points.
- Gate Voice is the third of five Gate navigation actions and its image is 12.5% larger than ordinary 26-point icons.
- Reuse the existing web Gate Voice and AskV PNG assets exactly.
- Introduce no external runtime dependency.

---

### Task 1: Universal Expo target

**Files:**
- Modify: `artifacts/vndrly-mobile/app.json`

**Interfaces:**
- Produces: an iOS target with `supportsTablet: true` and `orientation: "default"`.

- [x] Change the Expo configuration to support iPad and adaptive orientation.
- [x] Run `pnpm --filter @workspace/vndrly-mobile run typecheck` and confirm it exits 0.
- [x] Commit with `feat(mobile): enable universal ios target`.

### Task 2: Branded AskV asset resolver

**Files:**
- Create: `artifacts/vndrly-mobile/assets/askv/*.png`
- Create: `artifacts/vndrly-mobile/lib/pick-askv-logo.ts`
- Create: `artifacts/vndrly-mobile/lib/pick-askv-logo.test.ts`
- Create: `artifacts/vndrly-mobile/components/AskVNavLogo.tsx`

**Interfaces:**
- Produces: `pickAskVLogo(brandColor, brandName): ImageSourcePropType` and `pickAskVLogoIdle(): ImageSourcePropType`.
- Produces: `<AskVNavLogo active size testID />`.

- [x] Copy the exact 1024×512 web AskV palette into the mobile asset bundle.
- [x] Write tests for VNDRLY, Baker, Winchester, Flywheel, Midcon, red, blue, green, orange, purple, invalid-color, and idle selection.
- [x] Run the resolver test and verify it fails before implementation.
- [x] Port the organization-first and hue-nearest resolver using static React Native `require` sources.
- [x] Run the resolver test and verify it passes.
- [x] Implement `AskVNavLogo` with idle/active image selection and `contain` sizing.
- [x] Commit with `feat(mobile): add branded AskV navigation art`.

### Task 3: Gate Voice composite control

**Files:**
- Create: `artifacts/vndrly-mobile/assets/buttons/white-circle-voice-back.png`
- Create: `artifacts/vndrly-mobile/assets/buttons/white-circle-voice-overlay.png`
- Create: `artifacts/vndrly-mobile/components/GateVoiceNavButton.tsx`
- Create: `artifacts/vndrly-mobile/components/GateVoiceNavButton.test.tsx`

**Interfaces:**
- Produces: `<GateVoiceNavButton active label onPress testID />` with `VOICE_NAV_ICON_SIZE = 29.25`.

- [x] Copy the exact web composite Voice layers into the mobile asset bundle.
- [x] Write a failing test asserting two image layers, brand tint only on the back layer, 29.25-point image size, button accessibility, and press forwarding.
- [x] Implement the control with a minimum 44-point target and an active brand ring.
- [x] Run the component test and verify it passes.
- [x] Commit with `feat(gate): add branded Voice navigation control`.

### Task 4: Role-derived navigation manifest

**Files:**
- Create: `artifacts/vndrly-mobile/lib/app-navigation.ts`
- Create: `artifacts/vndrly-mobile/lib/app-navigation.test.ts`

**Interfaces:**
- Consumes: existing `mobile-viewer` role predicates and translated labels supplied by the caller.
- Produces: `buildAppNavigation({ user, labels, badges }): AppNavigationItem[]`.

- [x] Write failing tests for Gate ordering, Voice center position, field/foreman visibility, office visibility, and badge propagation.
- [x] Move route-visibility decisions from the tab component into the pure manifest builder.
- [x] Run manifest tests and verify they pass.
- [x] Commit with `refactor(mobile): centralize role navigation manifest`.

### Task 5: Adaptive navigation shell

**Files:**
- Create: `artifacts/vndrly-mobile/components/AdaptiveNavigationShell.tsx`
- Create: `artifacts/vndrly-mobile/components/AdaptiveNavigationShell.test.tsx`
- Modify: `artifacts/vndrly-mobile/app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: `AppNavigationItem[]`, pathname, active Gate listening state, safe-area insets, and route activation callback.
- Produces: bottom navigation for width below 768 and persistent 228-point sidebar otherwise.

- [x] Write failing compact and regular-width tests.
- [x] Implement shared navigation item rendering with Feather icons, AskV art, Gate Voice art, badges, selected states, and organization primary color.
- [x] Replace `_layout.tsx` inline tab rendering with the pure manifest and adaptive shell.
- [x] Ensure Voice routes to Gate before requesting voice entry and remains center action for Gate viewers.
- [x] Run shell, layout, Gate, and navigation tests.
- [x] Commit with `feat(mobile): add adaptive iphone ipad navigation`.

### Task 6: Verification and release readiness

**Files:**
- Modify only files required to correct demonstrated failures.

**Interfaces:**
- Produces: a releasable Phase 1 tree suitable for OTA where possible and a native TestFlight build because tablet support changes native metadata.

- [x] Run `pnpm --filter @workspace/vndrly-mobile run typecheck`.
- [x] Run `pnpm --filter @workspace/vndrly-mobile run test`.
- [x] Run `pnpm lint:i18n`.
- [x] Inspect the final diff for route loss, untracked assets, generated-file noise, and accidental dependency changes.
- [x] Commit any verification fixes with focused messages.
