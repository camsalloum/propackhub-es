# Requirements Document

## Introduction

Estimation Studio templates carry the basic structure of a laminate quote (name, product type, material class, structure tier, processes, and a layer stack). Today the structure tier is implicit (back-derived from substrate count), there is no way to author a template from scratch, smart classification is only partial, layer order is not freely editable in the template authoring flow, ownership tiers are not cleanly modeled, and some layers/quick-adds are hardcoded by material name.

This feature introduces an attribute-driven template builder where the user **declares** the defining attributes, the system **scaffolds** a matching layer skeleton from real raw materials, and **constrains** downstream choices to stay consistent. The same builder and rule set serve both creating and editing. It also models template ownership (platform standards for everyone vs private tenant/user add-ons), makes every layer reorderable, removes hardcoded material lookups, and removes the "+ Metallized Barrier" auto-add.

These requirements map to the Correctness Properties in `design.md` via the `Validates:` references there.

## Requirements

### Requirement 1: Create a template from scratch

**User Story:** As a template author, I want to create a new template without starting from an existing estimate, so that I can define reusable structures directly.

#### Acceptance Criteria
1.1. WHEN an authorized user opens the template builder in create mode THEN the system SHALL present a blank, attribute-driven builder that does not require an existing estimate.
1.2. WHEN the user saves a newly defined template THEN the system SHALL persist it and make it appear in that user's template catalog on reload.
1.3. WHEN a template is declared, scaffolded, saved, and reloaded THEN the system SHALL produce a template whose derived classification matches the originally declared attributes (round-trip stability).

### Requirement 2: Structure-tier scaffolding

**User Story:** As a template author, I want to choose a structure tier and have the matching layers generated, so that I do not build the stack one layer at a time.

#### Acceptance Criteria
2.1. WHEN the user declares a structure tier (Mono, Duplex, Triplex, Quadriplex) THEN the system SHALL scaffold exactly `tier` substrate layers.
2.2. WHEN the declared tier is multilayer THEN the system SHALL scaffold exactly `max(tier - 1, 0)` adhesive layers between substrates, each editable and removable.
2.3. WHEN the declared tier is Mono THEN the system SHALL keep exactly one substrate layer and SHALL NOT offer to add a second substrate while the tier remains Mono.
2.4. WHEN a template is saved THEN the system SHALL keep `structureType` consistent with the declared tier (`Mono` for Mono, `Multilayer` for Duplex/Triplex/Quadriplex), and declared tier and substrate count SHALL never silently disagree.
2.5. WHEN the user changes a declared attribute THEN the system SHALL re-derive the scaffold while preserving still-valid user edits.

### Requirement 3: Smart classification constraints

**User Story:** As a template author, I want material and layer choices constrained by my declared attributes, so that templates stay valid and consistent.

#### Acceptance Criteria
3.1. WHEN `materialClass = PE` THEN the system SHALL constrain every substrate dropdown to the PE family across all tiers (Mono through Quadriplex).
3.2. WHEN `printMode = Plain` THEN the system SHALL scaffold zero ink layers AND SHALL NOT offer an "add ink" action; WHEN `printMode = Printed` THEN ink layers SHALL be offerable.
3.3. WHEN the material class changes such that previously selected substrate materials are no longer allowed THEN the system SHALL prune those now-invalid material selections.

### Requirement 4: Unified create/edit parity

**User Story:** As a template author, I want editing an existing template to behave exactly like creating one, so that the two flows never diverge.

#### Acceptance Criteria
4.1. WHEN the builder is opened in edit mode THEN the system SHALL apply the same attribute controls, scaffolding, and constraints as create mode.
4.2. WHEN identical declared attributes are used in create and edit THEN the system SHALL produce the same scaffold, the same substrate-family constraints, and the same persisted classification.

### Requirement 5: Free layer ordering

**User Story:** As a user, I want to reorder layers in both templates and estimates, so that I can represent surface print, reverse print, and top coatings.

#### Acceptance Criteria
5.1. WHEN a user views layers in the template builder OR the estimate editor THEN the system SHALL allow moving any layer up or down (and/or drag-reorder).
5.2. WHEN a template is instantiated into an estimate THEN the system SHALL preserve the template's layer order.
5.3. WHEN layers are reordered THEN the system SHALL NOT change substrate/adhesive counts, material class, or print mode — only sequence; any permutation of a valid scaffold SHALL itself be valid (surface-print, reverse-print, top-varnish arrangements all permitted).

### Requirement 6: Ownership and visibility tiers

**User Story:** As the app owner, I want to publish standard templates to everyone, while tenant/user add-ons stay private to their creator, so that customization never leaks.

#### Acceptance Criteria
6.1. WHEN the platform admin authors a standard template THEN the system SHALL make it visible to all tenants and users by default.
6.2. WHEN a tenant admin creates an add-on THEN the system SHALL make it visible only within that tenant; WHEN a non-admin user creates an add-on THEN the system SHALL make it visible only to that user (`createdByUserId`).
6.3. WHEN a user lists templates THEN the system SHALL return exactly: platform standards, that user's tenant add-ons, and that user's own user add-ons, AND SHALL NEVER return another user's private add-on or another tenant's templates.

### Requirement 7: No hardcoded materials; clean material display

**User Story:** As a user, I want every layer to reference a real raw material and the material list to read cleanly, so that templates reflect the actual library and avoid duplicated text.

#### Acceptance Criteria
7.1. WHEN a layer is scaffolded or saved THEN the system SHALL reference a real `materials` row by `materialId` OR leave the slot explicitly unresolved, and SHALL NEVER fabricate a material from a hardcoded name.
7.2. WHEN the scaffold selects default materials THEN the system SHALL choose them by querying the library by type/family; IF no matching material exists THEN the slot SHALL remain unresolved (empty "select material" state).
7.3. WHEN a varnish/lacquer is needed THEN the system SHALL use the existing Ink & Coating raw material (e.g. Matt Varnish) as an ink-type layer, with no new layer type.
7.4. WHEN the material picker lists options THEN the system SHALL show the family once (group label), de-duplicating any trailing `(<family>)` suffix in the option label, without modifying stored material names.

### Requirement 8: Remove the Metallized-Barrier auto-add

**User Story:** As a user, I want barrier layers added manually, so that the structure reflects my deliberate choices rather than a hardcoded insert.

#### Acceptance Criteria
8.1. WHEN a user opens the estimate editor THEN the system SHALL NOT display a "+ Metallized Barrier" button.
8.2. WHEN a user needs a metallized/barrier layer THEN the system SHALL allow adding it manually via the standard add-layer control, linked to a real raw material.

## Glossary

- **Platform standard**: A template authored by the app owner (`isStandard = true`), deployed to every tenant and user by default.
- **Tenant add-on**: A template created by a tenant admin (`isStandard = false`, `createdByUserId = null`), visible only within that tenant.
- **User add-on**: A template created by a non-admin user (`createdByUserId` set), visible only to that user.
- **Structure tier**: Mono / Duplex / Triplex / Quadriplex — the declared number of substrate layers (1/2/3/4).
- **Scaffold**: The default layer skeleton generated from declared attributes (substrates + adhesives + optional ink).
- **Print mode**: Declared Plain or Printed; controls whether ink layers are scaffolded/offerable.
- **Material class**: PE or Non PE; constrains the allowed substrate families.
- **Substrate / Ink / Adhesive**: The `layer_type` values; varnish is an Ink & Coating material (ink type), not a separate type.
- **Reverse / surface print**: Ink positioned under the top film (reverse) vs on the outer surface (surface) — expressed via layer order.
