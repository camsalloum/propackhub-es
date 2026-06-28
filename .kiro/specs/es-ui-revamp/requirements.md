# Requirements Document

## Introduction

Estimation Studio (ES) is a flexible-packaging cost estimation web application built with React 18, TypeScript, Vite 5, Tailwind CSS 3, and react-router-dom 6, wrapped with Capacitor for iOS/Android delivery. This feature is a deep, end-to-end UI/UX revamp of the existing application spanning every route from login through every internal page and interactive control.

The revamp is a visual and interaction layer effort. It introduces a user-selectable color theme system (light, dark, and multiple accent themes), modern motion and micro-interactions, a consistent design-token foundation (color, spacing, radius, shadow, elevation), livelier cards, smooth scrolling, and polished loading states. The Standard Templates page is specifically targeted for color and card-vitality improvements.

The revamp MUST preserve all existing application behavior, routes, data flows, and form logic. No functional regressions are permitted. Accessibility (WCAG AA contrast) and Capacitor mobile/touch behavior MUST be maintained or improved.

This document scopes the *what* of the revamp. Implementation choices (specific animation library, exact token values) are deferred to design.

This document is intentionally a hybrid of behavioral requirements and a migration checklist: it references specific existing files, CSS class names, and component names (for example `packages/web/src/index.css`, `.cell-input`, `TemplateStructureCard`, `LaminationFormulaModal`) to ensure migration completeness. These references identify where behavior must be preserved or re-themed, not new implementation mandates.

Accessibility scope for this revamp is: (a) WCAG AA color contrast across all themes, and (b) keyboard operability and focus management for the new/animated overlays (modals, drawer, BottomSheet). A full WCAG AA audit of all success criteria is out of scope. Verification tiers: contrast ratios, cumulative layout shift, routing preservation, and functional/data preservation are contractual and verified in automated tests; fine-grained motion timings (sub-100 ms start latencies, frame-rate targets) are design guidance verified by spot-check rather than gated in CI, except where explicitly noted.

## Glossary

- **ES**: Estimation Studio, the flexible-packaging cost estimation web application being revamped.
- **ES_App**: The complete running Estimation Studio web/Capacitor application, treated as the system under specification for cross-cutting requirements.
- **Theme_System**: The subsystem responsible for defining, applying, switching, and persisting visual themes across ES_App.
- **Theme**: A named, complete set of design-token values (colors for surfaces, text, borders, accents, and state colors) that can be applied to ES_App. Includes at minimum a Light theme, a Dark theme, and additional accent themes.
- **Active_Theme**: The Theme currently applied to ES_App for the current user session.
- **Theme_Switcher**: The user-facing control that allows a user to select the Active_Theme.
- **Design_Token**: A named design value (color, spacing unit, border radius, shadow/elevation level, typography setting) referenced by components instead of a hardcoded value.
- **Token_Layer**: The CSS-variable-based layer that exposes Design_Token values and is consumed by Tailwind utilities and component classes.
- **Motion_System**: The subsystem governing animations, transitions, and micro-interactions across ES_App.
- **Reduced_Motion_Mode**: The application state in which non-essential motion is minimized or disabled, driven by the operating system `prefers-reduced-motion` setting.
- **Card**: A bounded content surface used to present grouped information (for example dashboard metrics, estimate items, template structures).
- **Layout_Chrome**: The persistent application shell defined in `components/Layout.tsx`, including the desktop fixed left sidebar, the mobile hamburger drawer, and the mobile bottom navigation.
- **Skeleton**: The placeholder UI shown while content loads, provided by the existing `Skeleton` component.
- **WCAG_AA**: The Web Content Accessibility Guidelines 2.1 Level AA contrast requirement (4.5:1 for normal text, 3:1 for large text and meaningful UI components).
- **Preference_Store**: The persistence mechanism for user UI preferences, using browser `localStorage` on web and Capacitor Preferences on native platforms.
- **Tap_Target**: An interactive control sized for touch input, with a minimum hit area of 48x48 CSS pixels.
- **Pointer_Capable_Device**: A device whose primary input matches the CSS media query `(hover: hover) and (pointer: fine)` (for example a mouse or trackpad), as opposed to a touch-only device.
- **Motion_Token**: A named Design_Token in the motion category defining a duration and/or easing value. The defined Motion_Tokens and their duration ranges are:
  - `motion-micro` — micro-interaction feedback (hover, focus, press): 100–250 ms
  - `motion-enter` — entrance animation for page, list, or card content: 150–400 ms
  - `motion-stagger-step` — delay between successive items in a staggered entrance: 40–120 ms per item
  - `motion-overlay` — modal, drawer, and BottomSheet enter/exit transitions: 150–400 ms
  - `motion-page` — route-to-route page transition: 150–500 ms
  - `motion-theme-swap` — propagation of an Active_Theme change to currently visible components: at most 200 ms

  Each Motion_Token also defines an easing value. All animated components MUST source their timing and easing from these Motion_Tokens.

## Requirements

### Requirement 1: Design Token Foundation

**User Story:** As a developer maintaining ES, I want a centralized design-token layer, so that colors, spacing, radius, shadow, and typography are consistent and themeable across every page.

#### Acceptance Criteria

1. THE ES_App SHALL expose every surface, text, border, accent, and state color as a Design_Token defined as a CSS custom property under a single root scope in the Token_Layer, such that each named color used by the application resolves to exactly one Design_Token.
2. THE ES_App SHALL reference Design_Token values (rather than literal color, spacing, radius, shadow, or font values) from the Tailwind utility configuration and from each component class defined in `packages/web/src/index.css` (`.btn-primary`, `.btn-secondary`, `.card`, `.input`, `.input-compact`, `.data-table` and its `th`/`td` rules, `.cell-input`, `.badge`, and every `.badge-*` variant).
3. THE ES_App SHALL define Design_Token values for the spacing scale, the border-radius scale, the shadow/elevation levels, and the typography settings, where typography exposes exactly three font-family tokens: Inter (sans), DM Sans (display), and JetBrains Mono (mono).
4. WHERE the application defines its core brand palette, THE ES_App SHALL expose every such color as a themeable Design_Token referenced by components (rather than a hardcoded literal), so that a single token change re-themes every consumer. (Revamp note: the Premium v2 visual reset intentionally replaces the original navy `#0F1F3D` / gold `#C8962A` Light identity with a near-black + violet identity; exact byte-for-byte preservation of the legacy literals is therefore explicitly NOT required. Contrast thresholds of Requirement 5 always take precedence.)
5. WHEN any single Design_Token value is changed at the root scope, THE ES_App SHALL apply the changed value to every component that references that token without requiring changes to component class definitions or component source code.
6. IF a referenced Design_Token is undefined or fails to resolve at render time, THEN THE ES_App SHALL apply a defined fallback value for that property so that the component still renders with a resolved value and no unstyled or transparent output occurs.
7. THE ES_App SHALL preserve a comfortable display density after the Token_Layer is introduced, keeping the root (`html`) computed `font-size` at the Comfortable-density baseline the application uses (95% of the browser default base font-size, scaled by the active `--density-scale`).

### Requirement 2: Theme Definition and Coverage

**User Story:** As a user, I want multiple visual themes available, so that I can choose an appearance that suits my preference and environment.

#### Acceptance Criteria

1. THE Theme_System SHALL provide a minimum of four selectable Themes, including exactly one Light theme, exactly one Dark theme, and at least two additional accent/color Themes beyond the base Light theme.
2. THE Theme_System SHALL define, for every available Theme, a complete set of Design_Token color values covering surfaces, text, borders, accents, and the state colors success, warning, and danger, with no token left unassigned.
3. WHEN a Theme is applied, THE Theme_System SHALL apply that Theme's Design_Token values to every route and every shared component, including Layout_Chrome, cards, modals, badges, inputs, tables, and buttons, such that no element retains a previously applied Theme's Design_Token values.
4. WHEN a Theme is applied, THE Theme_System SHALL complete the application of that Theme's Design_Token values across ALL routes and shared components, including those not currently visible, within 500 milliseconds, while components currently visible update within the `motion-theme-swap` budget; this 500-millisecond bound covers the full application (including offscreen routes/components), whereas the `motion-theme-swap` budget in Requirement 3 criterion 4 governs only currently visible components, so the two bounds do not conflict.
5. IF an applied Theme is missing one or more required Design_Token values, THEN THE Theme_System SHALL retain the previously applied Theme's Design_Token values and surface an indication that the Theme could not be applied.

### Requirement 3: Theme Switching

**User Story:** As a user, I want to switch themes from Settings and from the app chrome, so that I can change appearance quickly without navigating away from my current task.

#### Acceptance Criteria

1. THE Settings page SHALL present a Theme_Switcher that lists every available Theme, displaying for each Theme its name and a visual indicator marking which Theme is the current Active_Theme.
2. WHEN a user selects a Theme from the Theme_Switcher, THE Theme_System SHALL set that Theme as the Active_Theme and apply it to ES_App within 200ms.
3. THE Layout_Chrome SHALL present a quick Theme_Switcher control that changes the Active_Theme while the user remains on the current page, without navigating to the Settings page.
4. WHEN the Active_Theme changes, THE Theme_System SHALL update all currently visible components to the new Active_Theme within the `motion-theme-swap` budget without requiring a full page reload.
5. WHEN the Active_Theme changes, THE Theme_System SHALL persist the selected Active_Theme so that it remains the Active_Theme across subsequent ES_App sessions.
6. IF the selected Theme fails to load or apply, THEN THE Theme_System SHALL retain the previously Active_Theme, leave all visible components rendered in that previous Theme, and present an error indication informing the user that the Theme could not be applied.
7. IF no Themes are available to populate the Theme_Switcher, THEN THE Theme_System SHALL apply a default Theme as the Active_Theme and present an indication that no selectable Themes are available.

### Requirement 4: Theme Persistence and Defaults

**User Story:** As a user, I want my chosen theme to be remembered and to start from a sensible default, so that the application looks consistent across sessions and devices.

#### Acceptance Criteria

1. WHEN a user selects an Active_Theme, THE Theme_System SHALL persist the selection to the Preference_Store within 500 milliseconds.
2. WHEN ES_App starts and a valid persisted Active_Theme exists in the Preference_Store, THE Theme_System SHALL apply the persisted Active_Theme before the first contentful render.
3. WHEN ES_App starts and no persisted Active_Theme exists, THE Theme_System SHALL apply a default Theme derived from the operating system `prefers-color-scheme` setting, applying the dark Theme WHERE `prefers-color-scheme` reports `dark` and applying the light Theme in all other cases.
4. IF reading the persisted Active_Theme from the Preference_Store fails, THEN THE Theme_System SHALL apply the default Theme, continue operation, and present no blocking error to the user.
5. IF the persisted Active_Theme value is missing, malformed, or not one of the recognized Themes, THEN THE Theme_System SHALL apply the default Theme and overwrite the invalid persisted value with the applied Theme.
6. IF persisting the Active_Theme to the Preference_Store fails, THEN THE Theme_System SHALL retain the Active_Theme for the current session and present an error indication that the selection was not saved.
7. WHERE ES_App runs on a native Capacitor platform, THE Theme_System SHALL persist and read the Active_Theme using Capacitor Preferences.

### Requirement 5: Theme Accessibility and Contrast

**User Story:** As a user with visual accessibility needs, I want every theme to remain readable, so that text and controls meet contrast standards regardless of which theme is active.

#### Acceptance Criteria

1. THE Theme_System SHALL render normal-size body text and accent text under any available Theme at a contrast ratio of at least 4.5:1 against their background surfaces.
2. THE Theme_System SHALL render large-size text (defined as text at or above 18pt, or at or above 14pt when bold) under any available Theme at a contrast ratio of at least 3:1 against their background surfaces.
3. THE Theme_System SHALL render interactive controls and their focus indicators under any available Theme at a contrast ratio of at least 3:1 against their adjacent background surfaces.
4. WHEN the active Theme changes, THE Theme_System SHALL apply the newly active Theme such that all body text, accent text, interactive controls, and focus indicators continue to meet the contrast ratios defined in criteria 1 through 3.
5. WHERE an accent color yields a contrast ratio below 4.5:1 for text usage against its background surface, THE Theme_System SHALL substitute an accessible accent Design_Token (equivalent to the existing gold-accessible token) that meets a contrast ratio of at least 4.5:1 for text and meaningful UI elements.
6. WHERE preserving a previously hardcoded color value (Requirement 1, criterion 4) would yield a contrast ratio below the thresholds defined in criteria 1 through 3 of this requirement, THE Theme_System SHALL prioritize these contrast thresholds over exact color preservation and substitute an accessible Design_Token; in such conflicts Requirement 5 takes precedence over Requirement 1 criterion 4.

### Requirement 6: Motion and Micro-Interactions

**User Story:** As a user, I want smooth, modern animations and responsive micro-interactions, so that the application feels lively rather than static.

#### Acceptance Criteria

1. WHEN a page or list of content first renders, THE Motion_System SHALL apply an entrance animation to the primary content within the `motion-enter` duration.
2. WHEN a user hovers over or focuses an interactive Card or button on a pointer-capable device, THE Motion_System SHALL apply a micro-interaction response (elevation, scale, or color transition) within the `motion-micro` duration; the response SHALL begin within 100 milliseconds of the hover or focus event (a sub-100-millisecond start-latency target treated as design guidance per the Introduction).
3. WHEN a user navigates between routes, THE Motion_System SHALL apply a page transition between the outgoing and incoming views within the `motion-page` duration.
4. THE Motion_System SHALL apply transition timing and easing values sourced exclusively from defined Design_Token values across all animated components, such that all components using the same Design_Token render identical timing and easing.
5. WHEN a user presses a button, THE Motion_System SHALL apply a visible press-state micro-interaction (scale or color change) within the `motion-micro` duration; the press-state response SHALL begin within 100 milliseconds of the press event (a sub-100-millisecond start-latency target treated as design guidance per the Introduction).
6. WHILE in Reduced_Motion_Mode (as defined in Requirement 7), THE Motion_System SHALL render the affected content in its final visual state without entrance, page-transition, or movement micro-interaction animation.
7. IF an animation asset or transition fails to initialize, THEN THE Motion_System SHALL render the affected content in its final visual state without animation and preserve all interactive functionality.

### Requirement 7: Reduced Motion Support

**User Story:** As a user sensitive to motion, I want animations minimized when I request reduced motion, so that the application remains comfortable to use.

#### Acceptance Criteria

1. WHILE the operating system `prefers-reduced-motion` setting is enabled, THE Motion_System SHALL operate in Reduced_Motion_Mode.
2. WHEN the operating system `prefers-reduced-motion` setting changes to enabled while the application is running, THE Motion_System SHALL enter Reduced_Motion_Mode within 1 second and apply it to the current view without requiring a page reload.
3. WHILE in Reduced_Motion_Mode, THE Motion_System SHALL suppress all non-essential entrance animations, hover motion, and page transitions such that each affected element is rendered directly in its final visual state with a movement duration of 0 milliseconds.
4. WHERE an animation conveys essential state feedback (such as loading or progress indication), THE Motion_System SHALL retain that feedback while limiting any associated movement to a duration not exceeding 200 milliseconds.
5. WHILE in Reduced_Motion_Mode, THE ES_App SHALL keep all content and controls fully visible and operable in their final state at the moment they appear, with no control requiring any animation to complete before it can be activated.
6. THE reduced-motion rules defined in this Requirement 7 SHALL govern every page and shared component across ES_App and SHALL be inherited by all other requirements; any page-level or component-level reduced-motion criterion elsewhere in this document restates these rules and does not override them.

### Requirement 8: Smooth Scrolling and Performance

**User Story:** As a user, I want smooth scrolling and animations that do not stutter, so that the experience feels fluid on both desktop and mobile.

#### Acceptance Criteria

1. WHEN in-page navigation is triggered or a scrollable content region is scrolled, THE ES_App SHALL apply smooth scrolling behavior that completes the scroll-to-target transition within 800 milliseconds.
2. WHEN animations run during scrolling or interaction, THE Motion_System SHALL animate only compositor-friendly properties (transform and opacity) for continuous animations, and SHALL maintain a rendering rate of at least 60 frames per second (no more than 1 dropped frame per 60 frames) on supported desktop and mobile devices.
3. WHILE in Reduced_Motion_Mode, THE ES_App SHALL disable smooth-scroll animation and complete navigation by repositioning the viewport to the target within 100 milliseconds without intermediate animation frames.
4. IF sustained frame drops occur during scrolling or continuous animation such that the target frame rate in criterion 2 cannot be maintained, THEN THE Motion_System SHALL prioritize sustaining the target frame rate over completing non-essential continuous animations, reducing or suspending those animations until the target frame rate is restored. The specific frame-drop detection mechanism is determined at design time.

### Requirement 9: Card Vitality

**User Story:** As a user, I want cards to feel alive and interactive, so that the interface looks modern instead of flat and dead.

#### Acceptance Criteria

1. THE ES_App SHALL render Cards using themeable surface, border, and elevation Design_Token values, with no hardcoded color, border, or shadow values outside the Design_Token set.
2. WHEN a Card enters the viewport on first render, THE Motion_System SHALL apply an entrance animation to the Card within the `motion-enter` duration.
3. WHEN a user hovers or focuses an interactive Card on a pointer-capable device, THE Motion_System SHALL apply an elevation or transform micro-interaction within the `motion-micro` duration and SHALL revert to the resting state within the `motion-micro` duration after the hover or focus ends.
4. WHERE a Card is interactive, THE ES_App SHALL render a visible focus indicator whose contrast ratio against adjacent colors is at least 3:1, meeting WCAG_AA non-text contrast.
5. WHILE in Reduced_Motion_Mode (as defined in Requirement 7), THE Motion_System SHALL render the affected content in its final visual state without entrance, page-transition, or movement micro-interaction animation.

### Requirement 10: Loading and Skeleton Polish

**User Story:** As a user, I want polished loading states, so that the application feels responsive while data is being fetched.

#### Acceptance Criteria

1. WHILE content is loading and the load duration has exceeded 200 milliseconds, THE ES_App SHALL display the Skeleton component using Design_Token color and spacing values equal to those defined by the Active_Theme, with the Skeleton occupying the same width and height as the content it represents within a tolerance of 4 pixels.
2. WHILE the Skeleton is displayed and ES_App is not in Reduced_Motion_Mode, THE Motion_System SHALL apply a shimmer or pulse animation to the Skeleton with a repeating cycle duration between 1000 and 2000 milliseconds.
3. WHILE the Skeleton is displayed and ES_App is in Reduced_Motion_Mode, THE Motion_System SHALL display the Skeleton as a static element with no animation.
4. WHEN loaded content replaces a Skeleton, THE Motion_System SHALL complete the transition from the Skeleton to the content within 300 milliseconds and SHALL keep the cumulative layout shift at 0.1 or less during the transition.
5. IF content loading fails, THEN THE ES_App SHALL remove the Skeleton within 200 milliseconds of detecting the failure and SHALL display an error indication conveying that the content could not be loaded.

### Requirement 11: Responsive and Touch Preservation

**User Story:** As a mobile user, I want the revamped UI to work with touch and across screen sizes, so that the application remains usable on phones and tablets.

#### Acceptance Criteria

1. THE ES_App SHALL render its layout using the existing responsive breakpoints, applying the mobile layout at viewport widths from 320 to 767 CSS pixels, the tablet layout from 768 to 1023 CSS pixels, and the desktop layout at 1024 CSS pixels and above, with no horizontal scrolling introduced at any width within these ranges.
2. WHERE ES_App runs on a touch platform, THE ES_App SHALL render every interactive control with a Tap_Target hit area of at least 48x48 CSS pixels and a minimum spacing of 8 CSS pixels between adjacent Tap_Targets.
3. WHERE ES_App runs on a touch device, WHEN a user presses an interactive control, THE Motion_System SHALL display active/pressed state feedback within 100 milliseconds in place of hover-only micro-interactions.
4. IF the viewport width changes across a breakpoint boundary defined in criterion 1, THEN THE ES_App SHALL re-render the corresponding layout within 500 milliseconds while preserving all current user input values and scroll position.
5. WHERE ES_App runs on a touch platform, IF an interactive control cannot meet the 48x48 CSS pixel Tap_Target minimum, THEN THE ES_App SHALL extend the control's hit area to 48x48 CSS pixels without altering its visible dimensions.

### Requirement 12: Functional and Routing Preservation

**User Story:** As a user, I want all existing functionality and routes to keep working after the revamp, so that the visual changes do not break my workflow.

#### Acceptance Criteria

1. WHEN a user navigates to any route that existed in the pre-revamp baseline, THE ES_App SHALL resolve it to the same destination view and render the same primary content as the pre-revamp baseline, with zero routes returning a not-found or error state for paths that previously resolved successfully.
2. WHEN a user submits any form that existed in the pre-revamp baseline with identical input values, THE ES_App SHALL execute the same data submission and produce the same stored result and the same displayed output as the pre-revamp baseline.
3. WHEN a user views any data display that existed in the pre-revamp baseline, THE ES_App SHALL display the same data values, fields, and ordering as the pre-revamp baseline.
4. IF a visual or interaction change would alter the data flow or functional behavior defined by the pre-revamp baseline, THEN THE ES_App SHALL retain the pre-revamp functional behavior and apply only the visual change.
5. IF a route, form submission, or data load fails after the revamp where it succeeded in the pre-revamp baseline, THEN THE ES_App SHALL display an error message indicating the failure, preserve any user-entered data without loss, and leave stored data unchanged.

### Requirement 13: Login Page

**User Story:** As a user, I want a modern, animated login experience, so that my first impression of the application is polished.

#### Acceptance Criteria

1. THE Login page (`/login`) SHALL render all visual properties (colors, typography, spacing, borders) using themeable Design_Token values, with zero hard-coded color or spacing values in the rendered output.
2. WHEN the Active_Theme changes while the Login page is displayed, THE Login page SHALL re-render using the Design_Token values of the newly selected Active_Theme within the `motion-theme-swap` budget, with no page reload.
3. WHEN the Login page first renders, THE Motion_System SHALL apply an entrance animation to the login form within the `motion-enter` duration.
4. WHILE in Reduced_Motion_Mode (as defined in Requirement 7), THE Login page SHALL render the affected content in its final visual state without entrance, page-transition, or movement micro-interaction animation.
5. WHEN a login input receives focus, THE Motion_System SHALL apply a focus micro-interaction within the `motion-micro` duration; the micro-interaction SHALL begin within 100 milliseconds of the focus event (a sub-100-millisecond start-latency target treated as design guidance per the Introduction).
6. WHEN the submit control is pressed, THE Motion_System SHALL apply a press micro-interaction within the `motion-micro` duration; the micro-interaction SHALL begin within 100 milliseconds of the press event (a sub-100-millisecond start-latency target treated as design guidance per the Introduction).
7. THE Login page SHALL preserve its existing authentication submission behavior and post-authentication navigation, with no change to the inputs accepted or the destination reached on successful authentication.
8. IF authentication submission fails, THEN THE Login page SHALL remain on `/login`, retain the values previously entered in the login inputs, and display an indication that authentication did not succeed.

### Requirement 14: Register Page

**User Story:** As a new user, I want a polished registration experience, so that signing up feels consistent with the rest of the application.

#### Acceptance Criteria

1. WHEN the Register page (`/register`) renders, THE Register page SHALL apply Design_Token values for color, typography, spacing, and border tokens that match the Active_Theme, with no hard-coded values overriding any token.
2. WHEN the Active_Theme changes while the Register page is displayed, THE Register page SHALL re-render all themeable elements using the new Active_Theme Design_Token values within the `motion-theme-swap` budget.
3. WHEN the Register page first renders, THE Motion_System SHALL apply an entrance animation to the registration form within the `motion-enter` duration that completes in a single play without looping.
4. WHILE in Reduced_Motion_Mode (as defined in Requirement 7), THE Register page SHALL render the affected content in its final visual state without entrance, page-transition, or movement micro-interaction animation.
5. WHEN a registration input receives focus, THE Motion_System SHALL apply a focus micro-interaction within the `motion-micro` duration.
6. WHEN the submit control is pressed, THE Motion_System SHALL apply a press micro-interaction within the `motion-micro` duration.
7. THE Register page SHALL preserve its existing account-creation submission behavior and post-submission navigation without altering the inputs sent or the destination reached on success.
8. IF the account-creation submission fails, THEN THE Register page SHALL retain all user-entered input values and display an error indication identifying that registration did not complete.

### Requirement 15: Dashboard Page

**User Story:** As a user, I want a lively dashboard, so that key metrics feel engaging and easy to scan.

#### Acceptance Criteria

1. WHEN the Dashboard page (`/dashboard`) renders, THE Dashboard page SHALL render each metric and content Card using themeable Design_Token values resolved from the Active_Theme.
2. WHEN the Active_Theme changes while the Dashboard page is displayed, THE Dashboard page SHALL re-resolve all Card Design_Token values to the new Active_Theme within the `motion-theme-swap` budget without a full page reload.
3. WHEN the Dashboard page first renders, THE Motion_System SHALL apply a staggered entrance animation to the dashboard Cards within the `motion-enter` duration, with each successive Card offset from the previous Card by the `motion-stagger-step` delay.
4. WHEN a user hovers or focuses an interactive Dashboard Card on a pointer-capable device, THE Motion_System SHALL apply a micro-interaction response within the `motion-micro` duration; the response SHALL begin within 100 milliseconds of the hover or focus event (a sub-100-millisecond start-latency target treated as design guidance per the Introduction) and SHALL reverse to the resting state within the `motion-micro` duration after the hover or focus ends.
5. WHILE in Reduced_Motion_Mode (as defined in Requirement 7), THE Dashboard page SHALL render the affected content in its final visual state without entrance, page-transition, or movement micro-interaction animation.
6. THE Dashboard page SHALL preserve its existing metric data values, formatting, and navigation behavior such that the displayed metric values and navigation targets are identical to those produced before the Card themeable and motion changes.
7. IF a Card's metric data fails to load, THEN THE Dashboard page SHALL render the affected Card in an error state with an indication that the metric is unavailable, SHALL continue rendering all Cards whose data loaded successfully, and SHALL retain the last successfully loaded metric values for the unaffected Cards.

### Requirement 16: Estimates List Page

**User Story:** As a user, I want the estimates list to look modern and respond to interaction, so that browsing estimates is pleasant and clear.

#### Acceptance Criteria

1. THE Estimates List page (`/estimates`) SHALL render all text, background, border, and Card surfaces using themeable Design_Token values resolved from the Active_Theme, with no hard-coded color values.
2. WHEN the Active_Theme changes while the Estimates List page is displayed, THE Estimates List page SHALL re-resolve all Design_Token values to the new theme within the `motion-theme-swap` budget without a full page reload.
3. WHEN the Estimates List page first renders, THE Motion_System SHALL apply an entrance animation to the list content within the `motion-enter` duration, ending with all list content at full opacity and final position.
4. WHEN a user hovers or focuses a list row or Card on a pointer-capable device (a device matching `(hover: hover) and (pointer: fine)`), THE Motion_System SHALL apply a micro-interaction response within the `motion-micro` duration; the response SHALL begin within 16 milliseconds of the hover or focus event (a sub-100-millisecond start-latency target treated as design guidance per the Introduction).
5. WHEN the hover or focus state on a list row or Card ends, THE Motion_System SHALL revert the micro-interaction response to the row or Card's resting state within the `motion-micro` duration.
6. WHILE in Reduced_Motion_Mode (as defined in Requirement 7), THE Estimates List page SHALL render the affected content in its final visual state without entrance, page-transition, or movement micro-interaction animation.
7. THE Estimates List page SHALL preserve its existing estimate listing, filtering, and navigation behavior, producing the same estimate set, filter results, and navigation destinations as before these criteria were applied.

### Requirement 17: Estimate Editor Page

**User Story:** As a user, I want the form-heavy estimate editor to stay clear and usable while looking refreshed, so that complex estimation work is not disrupted.

#### Acceptance Criteria

1. WHEN the Estimate Editor page (`/estimate/new` and `/estimate/:id`) renders, THE Estimate Editor page SHALL apply Design_Token values from the Active_Theme to all inputs, sections, and controls so that no hard-coded color, spacing, or typography values remain.
2. WHEN the Active_Theme changes while the Estimate Editor page is open, THE Estimate Editor page SHALL re-render all inputs, sections, and controls with the new Active_Theme's Design_Token values within the `motion-theme-swap` budget without losing any unsaved field values.
3. WHILE the Estimate Editor page is in editing mode, THE Estimate Editor page SHALL keep the mobile bottom navigation hidden.
4. WHEN a user focuses or presses an editor input or control, THE Motion_System SHALL render the corresponding focus or press micro-interaction within the `motion-micro` duration, and SHALL accept and reflect input within 100 milliseconds of the interaction (a sub-100-millisecond responsiveness target treated as design guidance per the Introduction).
5. WHERE the operating system or browser reduced-motion preference is enabled, THE Motion_System SHALL disable focus and press micro-interaction animations on the Estimate Editor page while preserving the focus and press visual states.
6. THE Estimate Editor page SHALL preserve all existing form fields, calculation outputs, input validation rules, validation error indications, and save and navigation behavior, producing identical results to the pre-refresh implementation for identical inputs.

### Requirement 18: Template Picker Page

**User Story:** As a user, I want the template picker to feel engaging, so that choosing a starting template is inviting.

#### Acceptance Criteria

1. THE Template Picker page (`/estimate/choose`) SHALL render its option Cards using themeable Design_Token values resolved from the Active_Theme, with no hard-coded color, spacing, or typography values bypassing the Design_Token set.
2. WHEN the Active_Theme changes while the Template Picker page is displayed, THE Template Picker page SHALL re-render its option Cards using the new Active_Theme's Design_Token values within the `motion-theme-swap` budget, without a full page reload.
3. WHEN the Template Picker page first renders, THE Motion_System SHALL apply an entrance animation to the option Cards within the `motion-enter` duration, after which each Card SHALL remain fully visible and interactive.
4. WHEN a user hovers or focuses a template option Card on a pointer-capable device, THE Motion_System SHALL apply a micro-interaction response within the `motion-micro` duration; the response SHALL begin within 100 milliseconds of the hover or focus event (a sub-100-millisecond start-latency target treated as design guidance per the Introduction) and SHALL revert to the Card's resting state within the `motion-micro` duration of the hover or focus ending.
5. WHILE in Reduced_Motion_Mode (as defined in Requirement 7), THE Template Picker page SHALL render the affected content in its final visual state without entrance, page-transition, or movement micro-interaction animation.
6. THE Template Picker page SHALL preserve its existing template-selection and navigation behavior, such that selecting a template and navigating away produce the same outcome as before these criteria were applied.

### Requirement 19: Standard Templates Page

**User Story:** As a user, I want the Standard Templates page to have appealing colors and lively cards, so that it no longer looks flat and dead.

#### Acceptance Criteria

1. THE Standard Templates page (`/templates`) SHALL render all foreground text, background, and accent colors using themeable Design_Token values, with no hard-coded or previously flagged static color treatment remaining.
2. WHEN the Active_Theme changes, THE Standard Templates page SHALL re-render all themeable surfaces, text, borders, and accents to match the newly selected Active_Theme within the `motion-theme-swap` budget, with no element retaining the prior theme's color values.
3. THE Standard Templates page SHALL render `TemplateStructureCard` instances using themeable surface, border, and elevation Design_Token values, such that no `TemplateStructureCard` displays a hard-coded color, border, or shadow value.
4. WHEN the Standard Templates grid first renders, THE Motion_System SHALL apply a staggered entrance animation to the template Cards within the `motion-enter` duration, with each Card offset from the previous Card by the `motion-stagger-step` delay.
5. WHEN a user hovers or focuses a `TemplateStructureCard` on a pointer-capable device, THE Motion_System SHALL apply an elevation or transform micro-interaction within the `motion-micro` duration; the micro-interaction SHALL begin within 100 milliseconds of the hover or focus event (a sub-100-millisecond start-latency target treated as design guidance per the Introduction), and THE Motion_System SHALL reverse the micro-interaction when the hover or focus ends.
6. WHILE in Reduced_Motion_Mode (as defined in Requirement 7), THE Standard Templates page SHALL render the affected content in its final visual state without entrance, page-transition, or movement micro-interaction animation.
7. THE Standard Templates page SHALL render the `ClassFilterPanel`, `TemplateBuilder`, and template layer visualizers using themeable Design_Token values that respond to the Active_Theme, with no hard-coded color values remaining in these components.
8. THE Standard Templates page SHALL preserve its existing template filtering, building, and layer-visualization behavior, producing identical functional results to the pre-refinement behavior for the same user inputs.

### Requirement 20: Customers List Page

**User Story:** As a user, I want the customers list to look modern and interactive, so that managing customers is pleasant.

#### Acceptance Criteria

1. THE Customers List page (`/customers`) SHALL render all text, background, border, and surface colors using themeable Design_Token values, with no hard-coded color values.
2. WHEN the Active_Theme changes while the Customers List page is displayed, THE Customers List page SHALL update all rendered Design_Token values to match the new Active_Theme within the `motion-theme-swap` budget, without requiring a page reload.
3. WHEN the Customers List page first renders, THE Motion_System SHALL apply an entrance animation to the list content within the `motion-enter` duration; the entrance SHALL begin within 100 milliseconds of content mount (a sub-100-millisecond start-latency target treated as design guidance per the Introduction).
4. WHEN a user hovers or focuses a customer row or Card on a pointer-capable device (a device matching a fine pointer with hover capability), THE Motion_System SHALL apply a visual micro-interaction response (a change in at least one of background, border, elevation, or scale) within the `motion-micro` duration; the response SHALL begin within 100 milliseconds of the hover or focus event (a sub-100-millisecond start-latency target treated as design guidance per the Introduction).
5. WHILE in Reduced_Motion_Mode (as defined in Requirement 7), THE Customers List page SHALL render the affected content in its final visual state without entrance, page-transition, or movement micro-interaction animation.
6. THE Customers List page SHALL preserve its existing customer listing, search, and navigation behavior such that the set of customers displayed, the search results returned for any given query, and the navigation destinations remain identical to those produced before these visual changes were applied.

### Requirement 21: Customer Detail Page

**User Story:** As a user, I want the customer detail view to feel refreshed, so that reviewing a customer is clear and engaging.

#### Acceptance Criteria

1. THE Customer Detail page (`/customers/:id`) SHALL render all Cards and sections using themeable Design_Token values, with no hard-coded color, spacing, or typography values outside the Design_Token set.
2. WHEN the Active_Theme changes while the Customer Detail page is displayed, THE Customer Detail page SHALL update all rendered Cards and sections to the newly selected theme's Design_Token values within the `motion-theme-swap` budget, with no element retaining the previous theme's values.
3. WHEN the Customer Detail page first renders, THE Motion_System SHALL apply an entrance animation to the detail content within the `motion-enter` duration, ending with the content at full opacity and final position.
4. WHILE in Reduced_Motion_Mode (as defined in Requirement 7), THE Customer Detail page SHALL render the affected content in its final visual state without entrance, page-transition, or movement micro-interaction animation.
5. WHEN a user hovers or focuses an interactive element on a pointer-capable device, THE Motion_System SHALL apply a micro-interaction response within the `motion-micro` duration; the response SHALL begin within 100 milliseconds of the hover or focus event (a sub-100-millisecond start-latency target treated as design guidance per the Introduction) and SHALL produce an observable visual state change on that element.
6. WHEN the hover or focus ends on an interactive element, THE Motion_System SHALL revert the element to its resting visual state within the `motion-micro` duration.
7. THE Customer Detail page SHALL display the same customer data fields and provide the same navigation actions that were available before the refresh, with no field or navigation action removed.
8. IF the customer data for the requested `:id` fails to load, THEN THE Customer Detail page SHALL display an error indication identifying that the customer could not be loaded and SHALL retain the existing navigation actions.

### Requirement 22: Master Data Library Page

**User Story:** As a user, I want the raw materials library to look modern, so that browsing master data is clear and consistent with the rest of the application.

#### Acceptance Criteria

1. THE Master Data Library page (`/library`) SHALL render all themeable visual properties using Design_Token values resolved from the Active_Theme.
2. WHEN the Active_Theme changes while the Master Data Library page is displayed, THE Master Data Library page SHALL re-render its themeable visual properties using the newly active Design_Token values within the `motion-theme-swap` budget, without a full page reload.
3. WHEN the Master Data Library page first renders, THE Motion_System SHALL apply an entrance animation to the library content within the `motion-enter` duration.
4. WHEN a user hovers or focuses an interactive element on a pointer-capable device, THE Motion_System SHALL apply a micro-interaction response within the `motion-micro` duration; the response SHALL begin within 100 milliseconds of the hover or focus event (a sub-100-millisecond start-latency target treated as design guidance per the Introduction).
5. WHILE in Reduced_Motion_Mode (as defined in Requirement 7), THE Master Data Library page SHALL render the affected content in its final visual state without entrance, page-transition, or movement micro-interaction animation.
6. THE Master Data Library page SHALL preserve its existing material listing, editing, and navigation behavior such that the available actions and their outcomes are observably equivalent to the pre-redesign page.

### Requirement 23: Settings Page

**User Story:** As a user, I want a refreshed settings page that hosts the theme switcher, so that I can manage preferences in a clear, modern interface.

#### Acceptance Criteria

1. WHEN the Settings page (`/settings`) renders, THE Settings page SHALL apply Design_Token values mapped to the current Active_Theme to all of its visible UI elements.
2. WHEN the Active_Theme changes while the Settings page is displayed, THE Settings page SHALL re-render its UI elements using the Design_Token values of the newly selected Active_Theme within the `motion-theme-swap` budget.
3. IF a Design_Token value required for rendering cannot be resolved for the Active_Theme, THEN THE Settings page SHALL render the affected element using the default theme Design_Token value and SHALL display the page without blocking user interaction.
4. THE Settings page SHALL host the Theme_Switcher described in Requirement 3 as a visible and interactive control.
5. WHEN the Settings page first renders, THE Motion_System SHALL apply an entrance animation to the settings content within the `motion-enter` duration, completing in a single play with no looping.
6. WHEN the Settings page loads, THE Settings page SHALL display all settings values that were persisted from the most recent saved state.
7. WHEN a user changes a setting and the change is committed, THE Settings page SHALL persist the updated value such that it is retained and redisplayed on the next load of the Settings page.
8. IF persistence of a changed setting fails, THEN THE Settings page SHALL retain the last successfully persisted value and SHALL display an error indication informing the user that the change was not saved.

### Requirement 24: Layout Chrome and Navigation

**User Story:** As a user, I want consistent, modern navigation chrome, so that moving through the application feels cohesive on desktop and mobile.

#### Acceptance Criteria

1. THE Layout_Chrome SHALL render the desktop fixed left sidebar, mobile hamburger drawer, and mobile bottom navigation using themeable Design_Token values, and WHEN the Active_Theme changes, THE Layout_Chrome SHALL re-render these elements using the updated Design_Token values within the `motion-theme-swap` budget.
2. WHEN a user opens or closes the mobile hamburger drawer, THE Motion_System SHALL apply an open/close transition within the `motion-overlay` duration that runs to completion before the drawer reaches its final open or closed state.
3. WHEN a user activates a navigation item, THE Motion_System SHALL apply an active-state micro-interaction within the `motion-micro` duration and SHALL render a visible active indicator on the activated item that persists while that item remains the active destination.
4. THE Layout_Chrome SHALL render every navigation control with a Tap_Target hit area of at least 48x48 CSS pixels on touch platforms.
5. THE Layout_Chrome SHALL preserve its existing navigation destinations and SHALL apply its existing responsive show/hide behavior such that the desktop fixed left sidebar is shown and the mobile hamburger drawer and mobile bottom navigation are hidden at viewport widths of 1024 CSS pixels and above, and the mobile hamburger drawer and mobile bottom navigation are shown and the desktop fixed left sidebar is hidden at viewport widths below 1024 CSS pixels.
6. WHILE in Reduced_Motion_Mode (as defined in Requirement 7), THE Layout_Chrome SHALL render the affected content in its final visual state without entrance, page-transition, or movement micro-interaction animation.

### Requirement 25: Shared Components — Badges, Modals, and Sheets

**User Story:** As a user, I want shared overlays and indicators to match the active theme and animate smoothly, so that the experience is consistent everywhere.

#### Acceptance Criteria

1. THE ES_App SHALL render badges (`.badge-*`) and data tables (`.data-table`) using themeable Design_Token values that resolve to the colors, borders, and typography of the Active_Theme.
2. WHEN the Active_Theme changes, THE ES_App SHALL re-render all visible badges (`.badge-*`), data tables (`.data-table`), modals (`TemplateBuilder`, `LaminationFormulaModal`), and the `BottomSheet` using the newly Active_Theme Design_Token values within the `motion-theme-swap` budget, with no element retaining a prior-theme token value.
3. WHEN a modal (`TemplateBuilder`, `LaminationFormulaModal`) opens or closes, THE Motion_System SHALL apply an enter/exit transition within the `motion-overlay` duration that completes (reaches its final opacity and position) before the modal is considered fully open or fully closed.
4. WHEN the `BottomSheet` opens or closes, THE Motion_System SHALL apply a slide transition within the `motion-overlay` duration that moves the sheet between its fully off-screen position and its fully on-screen resting position.
5. WHILE in Reduced_Motion_Mode (as defined in Requirement 7), THE ES_App SHALL render the affected content in its final visual state without entrance, page-transition, or movement micro-interaction animation.
6. THE ES_App SHALL render modals (`TemplateBuilder`, `LaminationFormulaModal`) and the `BottomSheet` using themeable Design_Token values that resolve to the colors, borders, and typography of the Active_Theme.
7. THE ES_App SHALL preserve the existing open, close, and content-rendering behavior of all modals and the `BottomSheet`, such that the set of triggers that open or close each overlay and the content displayed within it remain unchanged from the pre-refactor behavior.
8. WHEN a modal (`TemplateBuilder`, `LaminationFormulaModal`) or the `BottomSheet` opens, THE ES_App SHALL move keyboard focus into the opened overlay and SHALL confine Tab and Shift+Tab focus traversal within that overlay while it remains open.
9. WHEN a modal or the `BottomSheet` closes, THE ES_App SHALL return keyboard focus to the control that had focus immediately before the overlay opened.
10. WHEN a user presses the Escape key while a modal or the `BottomSheet` is open, THE ES_App SHALL close that overlay, preserving any existing close behavior.
11. THE ES_App SHALL keep every control within a modal or the `BottomSheet` operable by keyboard while the overlay is open.
