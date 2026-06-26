import {
  pgTable,
  pgEnum,
  varchar,
  text,
  integer,
  smallint,
  decimal,
  timestamp,
  uuid,
  boolean,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['user', 'tenant_admin', 'platform_admin']);
export const estimateStatusEnum = pgEnum('estimate_status', ['draft', 'sent', 'won', 'lost']);
export const layerTypeEnum = pgEnum('layer_type', ['substrate', 'ink', 'adhesive', 'solvent']);
export const productTypeEnum = pgEnum('product_type', ['roll', 'sleeve', 'pouch', 'bag']);
export const tenantTypeEnum = pgEnum('tenant_type', ['individual', 'company']);
export const printingWebClassEnum = pgEnum('printing_web_class', ['wide_web', 'narrow_web']);
export const materialPriceSourceEnum = pgEnum('material_price_source', ['excel', 'manual', 'platform']);
export const platformReferenceCategoryEnum = pgEnum('platform_reference_category', [
  'product_type',
  'unit',
  'rm_type',
  'printing_web',
  'ink_coating',
  'adhesive',
  'packaging',
  'product_subtype',
  'process',
]);

// Platform master (single source of truth — replaces the retired Excel + JSON seed pipeline)
export const platformMasterMaterials = pgTable(
  'platform_master_materials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: varchar('key', { length: 128 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    type: layerTypeEnum('type').notNull(),
    solidPercent: integer('solid_percent').notNull(),
    density: decimal('density', { precision: 10, scale: 4 }).notNull(),
    costPerKgUsd: decimal('cost_per_kg_usd', { precision: 12, scale: 4 }).notNull(),
    /** Liquid ink/adhesive price entered by user — stored to avoid floating-point round-trip loss */
    liquidCostUsd: decimal('liquid_cost_usd', { precision: 12, scale: 2 }),
    wastePercent: integer('waste_percent').notNull().default(0),
    isSolventBased: boolean('is_solvent_based').notNull().default(false),
    substrateFamily: varchar('substrate_family', { length: 100 }),
    substrateGrade: varchar('substrate_grade', { length: 255 }),
    hoover: varchar('hoover', { length: 255 }),
    marketPriceUsd: decimal('market_price_usd', { precision: 12, scale: 4 }),
    costingKey: varchar('costing_key', { length: 64 }),
    sortOrder: integer('sort_order').notNull().default(0),
    active: boolean('active').notNull().default(true),
    /** Optional PEBI/MES/Oracle item ID — admin-editable; never overwritten by sync (MES Phase E) */
    externalId: varchar('external_id', { length: 128 }),
    externalSource: varchar('external_source', { length: 64 }),
    /** GP/MP/HP lamination formula (binder + hardener + EA parts). */
    laminationRecipe: jsonb('lamination_recipe'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    typeIdx: index('platform_master_materials_type_idx').on(table.type),
    familyIdx: index('platform_master_materials_family_idx').on(table.substrateFamily),
  })
);

export const platformReferenceItems = pgTable(
  'platform_reference_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    category: platformReferenceCategoryEnum('category').notNull(),
    label: varchar('label', { length: 255 }).notNull(),
    code: varchar('code', { length: 64 }),
    metadata: jsonb('metadata'),
    sortOrder: integer('sort_order').notNull().default(0),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    categoryIdx: index('platform_reference_items_category_idx').on(table.category),
    categoryCodeIdx: index('platform_reference_items_category_code_idx').on(
      table.category,
      table.code
    ),
  })
);

/** Singleton row — monotonic master_data_version bumped on platform catalog mutations (MES Phase B). */
export const platformMasterState = pgTable('platform_master_state', {
  id: smallint('id').primaryKey().default(1),
  masterDataVersion: integer('master_data_version').notNull().default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

/** Append-only log of platform master mutations (MES Phase E). */
export const platformMasterAuditLog = pgTable(
  'platform_master_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    masterDataVersion: integer('master_data_version').notNull(),
    entityType: varchar('entity_type', { length: 64 }).notNull(),
    entityKey: varchar('entity_key', { length: 256 }).notNull(),
    action: varchar('action', { length: 32 }).notNull(),
    beforeJson: jsonb('before_json'),
    afterJson: jsonb('after_json'),
    actorType: varchar('actor_type', { length: 32 }),
    actorId: varchar('actor_id', { length: 128 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    versionIdx: index('platform_master_audit_log_version_idx').on(table.masterDataVersion),
    createdAtIdx: index('platform_master_audit_log_created_at_idx').on(table.createdAt),
  })
);

/** Machine credentials for MES change-feed consumers (MES Phase E). */
export const platformServiceKeys = pgTable(
  'platform_service_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    keyHash: varchar('key_hash', { length: 128 }).notNull().unique(),
    label: varchar('label', { length: 255 }).notNull(),
    scopes: jsonb('scopes').notNull().default(['master_data:read']),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    labelIdx: index('platform_service_keys_label_idx').on(table.label),
  })
);

// Tenants
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  type: tenantTypeEnum('type').notNull().default('individual'),
  displayCurrency: varchar('display_currency', { length: 3 }).notNull().default('USD'),
  exchangeRateUsdToDisplay: decimal('exchange_rate_usd_to_display', { precision: 10, scale: 6 }).notNull().default('1.0'),
  exchangeRateUpdatedAt: timestamp('exchange_rate_updated_at', { withTimezone: true }).defaultNow(),
  useAutoFx: boolean('use_auto_fx').default(true), // Auto-refresh exchange rates
  logo: text('logo'), // Base64 or URL
  primaryColor: varchar('primary_color', { length: 7 }).default('#0F1F3D'),
  termsAndConditions: text('terms_and_conditions'),
  footerText: text('footer_text'),
  defaultMarkupPercent: decimal('default_markup_percent', { precision: 5, scale: 2 }).default('15.00'),
  defaultSlabTemplate: varchar('default_slab_template', { length: 50 }).default('standard'),
  quotationValidDays: integer('quotation_valid_days').notNull().default(30),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Estimation cost snapshots (B4)
export const estimationCosts = pgTable('estimation_costs', {
  id: uuid('id').primaryKey().defaultRandom(),
  estimateId: uuid('estimate_id')
    .notNull()
    .references(() => estimates.id, { onDelete: 'cascade' }),
  computedAt: timestamp('computed_at', { withTimezone: true }).defaultNow(),
  // Store a JSON snapshot of all calculated fields for audit/debug
  breakdownJson: jsonb('breakdown_json').notNull(),
});

// Users
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('user'),
  visibilityProfile: jsonb('visibility_profile'), // VisibilityProfile type from engine
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdEmailIdx: index('users_tenant_id_email_idx').on(table.tenantId, table.email),
  tenantIdIdx: index('users_tenant_id_idx').on(table.tenantId),
}));

// Material categories (B1) — defined before materials for FK reference
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdx: index('categories_tenant_idx').on(table.tenantId),
}));

// Material subcategories (B1)
export const subcategories = pgTable('subcategories', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdx: index('subcategories_tenant_idx').on(table.tenantId),
  categoryIdx: index('subcategories_category_idx').on(table.categoryId),
}));

// Materials (tenant-owned)
export const materials = pgTable('materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: layerTypeEnum('type').notNull(),
  solidPercent: integer('solid_percent').notNull(), // 30 for Ink SB, 100 for Ink UV
  density: decimal('density', { precision: 10, scale: 4 }).notNull(), // g/cm³
  costPerKgUsd: decimal('cost_per_kg_usd', { precision: 12, scale: 4 }).notNull(),
  wastePercent: integer('waste_percent').notNull().default(0),
  isSolventBased: boolean('is_solvent_based').default(false), // True for SB ink/adhesive
  // Substrate-specific fields
  substrateFamily: varchar('substrate_family', { length: 100 }), // BOPP, PET, PE, CPP, PA, ALU, PAPER, SLEEVE, SPECIALTY
  substrateGrade: varchar('substrate_grade', { length: 255 }), // e.g. BOPP Transparent, PET Metalized HB
  hoover: varchar('hoover', { length: 255 }), // Description / grade notes
  marketPriceUsd: decimal('market_price_usd', { precision: 12, scale: 4 }), // Market reference price
  // B1: taxonomy FK (nullable — added via SQL patch, backfilled by seed-categories)
  subcategoryId: uuid('subcategory_id').references(() => subcategories.id, { onDelete: 'set null' }),
  /** Template ref_material_key alias for standard stack resolution (e.g. ink-sb, ldpe-shrink) */
  costingKey: varchar('costing_key', { length: 64 }),
  /** RM type code from Master Data (substrate, ink, plate, …) — MES Phase C */
  itemClass: varchar('item_class', { length: 64 }),
  /** platform = synced from catalog; excel = legacy alias; manual = tenant override */
  priceSource: materialPriceSourceEnum('price_source').notNull().default('platform'),
  /** Tenant-created row — never pruned on Excel refresh */
  isTenantOnly: boolean('is_tenant_only').notNull().default(false),
  /** Platform master catalog key — null for tenant-only custom rows (MES Phase A) */
  platformMasterKey: varchar('platform_master_key', { length: 128 }),
  platformSyncedAt: timestamp('platform_synced_at', { withTimezone: true }),
  externalId: varchar('external_id', { length: 128 }),
  externalSource: varchar('external_source', { length: 64 }),
  laminationRecipe: jsonb('lamination_recipe'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdIdx: index('materials_tenant_id_idx').on(table.tenantId),
  typeIdx: index('materials_type_idx').on(table.type),
  familyIdx: index('materials_substrate_family_idx').on(table.substrateFamily),
  platformMasterKeyIdx: index('materials_platform_master_key_idx').on(table.tenantId, table.platformMasterKey),
}));

// Customers (tenant-owned)
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  contactName: varchar('contact_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdIdx: index('customers_tenant_id_idx').on(table.tenantId),
}));

// Estimates (tenant-owned)
// @ts-expect-error Drizzle self-referential FK (sourceEstimationId)
export const estimates = pgTable('estimates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
  refNumber: varchar('ref_number', { length: 20 }).notNull(), // QT-2026-XXXXX
  jobName: varchar('job_name', { length: 255 }).notNull(),
  status: estimateStatusEnum('status').notNull().default('draft'),

  // Structure
  productType: productTypeEnum('product_type').notNull(),
  /** UI product kind + subtype (e.g. 'pouch_stand_up', 'bag_wicket'); productType stays the engine costing code. */
  productSubtype: varchar('product_subtype', { length: 64 }),
  printingWebClass: printingWebClassEnum('printing_web_class').notNull().default('wide_web'),

  // Dimensions (stored as JSON for flexibility)
  dimensions: jsonb('dimensions').notNull(), // EstimateDimensions type

  // Pricing
  markupPercent: decimal('markup_percent', { precision: 5, scale: 2 }).notNull(),
  platesPerKg: decimal('plates_per_kg', { precision: 12, scale: 4 }).notNull().default('0'),
  deliveryPerKg: decimal('delivery_per_kg', { precision: 12, scale: 4 }).notNull().default('0'),

  // Currency snapshot
  displayCurrency: varchar('display_currency', { length: 3 }).notNull(),
  exchangeRateUsdToDisplay: decimal('exchange_rate_usd_to_display', { precision: 10, scale: 6 }).notNull(),

  // Solvent mix config (for SB ink/adhesive)
  solventMaterialId: uuid('solvent_material_id').references(() => materials.id, { onDelete: 'set null' }),
  solventCostPerKgUsd: decimal('solvent_cost_per_kg_usd', { precision: 12, scale: 4 }),
  solventRatio: decimal('solvent_ratio', { precision: 5, scale: 4 }),
  /** Per-layer lamination recipe overrides keyed by layer id (estimate snapshot). */
  laminationRecipeOverrides: jsonb('lamination_recipe_overrides'),
  cleaningSolventKgPerJob: decimal('cleaning_solvent_kg_per_job', { precision: 12, scale: 4 }).default('20'),
  /** flexo | rotogravure — on-press SB ink makeup; null = infer from stack (PE→flexo). */
  inkPrintingProcess: varchar('ink_printing_process', { length: 16 }),
  orderQuantityKg: decimal('order_quantity_kg', { precision: 12, scale: 2 }),
  orderQuantityUnit: varchar('order_quantity_unit', { length: 32 }).default('kgs'),

  // Calculated
  totalGsm: decimal('total_gsm', { precision: 12, scale: 2 }),
  totalMicron: decimal('total_micron', { precision: 12, scale: 2 }),
  materialCostPerKg: decimal('material_cost_per_kg', { precision: 12, scale: 4 }),
  salePricePerKg: decimal('sale_price_per_kg', { precision: 12, scale: 4 }),

  // Proposal lifecycle
  sentAt: timestamp('sent_at', { withTimezone: true }),
  validUntil: timestamp('valid_until', { withTimezone: true }),

  // Notes
  notes: text('notes'),

  // Re-quote tracking
  // @ts-expect-error Drizzle self-referential FK callback
  sourceEstimationId: uuid('source_estimation_id').references(() => estimates.id, { onDelete: 'set null' }),

  // Soft delete support
  deletedAt: timestamp('deleted_at', { withTimezone: true }),

  /** Platform master catalog revision at estimate create (MES Phase B) */
  masterDataVersion: integer('master_data_version'),
  /** Structure template key when created from template (MES Phase B / D) */
  sourceTemplateKey: varchar('source_template_key', { length: 128 }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdIdx: index('estimates_tenant_id_idx').on(table.tenantId),
  customerIdIdx: index('estimates_customer_id_idx').on(table.customerId),
  statusIdx: index('estimates_status_idx').on(table.status),
  refNumberIdx: index('estimates_ref_number_idx').on(table.refNumber),
  deletedAtIdx: index('estimates_deleted_at_idx').on(table.deletedAt),
  // BUG-11: unique ref number per tenant (partial — excludes soft-deleted rows handled in app layer)
  tenantRefUq: index('estimates_tenant_ref_uq').on(table.tenantId, table.refNumber),
}));

// Layers (estimate details)
export const layers = pgTable('layers', {
  id: uuid('id').primaryKey().defaultRandom(),
  estimateId: uuid('estimate_id').notNull().references(() => estimates.id, { onDelete: 'cascade' }),
  materialId: uuid('material_id').notNull().references(() => materials.id),
  position: integer('position').notNull(),
  micron: decimal('micron', { precision: 10, scale: 2 }).notNull(),

  // Cached calculations
  gsm: decimal('gsm', { precision: 12, scale: 4 }),
  costPerM2: decimal('cost_per_m2', { precision: 12, scale: 4 }),
  // Backward‑compatible column used by legacy routes (customers.ts)
  materialName: varchar('material_name', { length: 255 }),
  // Snapshot fields for re‑quote "was" pricing (B5)
  material_name_snapshot: varchar('material_name_snapshot', { length: 255 }),
  unit_cost_snapshot_usd: decimal('unit_cost_snapshot_usd', { precision: 12, scale: 4 }),
  platform_master_key_snapshot: varchar('platform_master_key_snapshot', { length: 128 }),
  costing_key_snapshot: varchar('costing_key_snapshot', { length: 64 }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  estimateIdIdx: index('layers_estimate_id_idx').on(table.estimateId),
  materialIdIdx: index('layers_material_id_idx').on(table.materialId),
}));

// Processes/Machines (tenant-owned)
export const processes = pgTable('processes', {
  id: uuid('id').primaryKey().defaultRandom(),
  estimateId: uuid('estimate_id').notNull().references(() => estimates.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  costPerHour: decimal('cost_per_hour', { precision: 12, scale: 4 }).notNull(),
  speedBasis: varchar('speed_basis', { length: 20 }).notNull(), // kg_per_hour, m_per_min, pcs_per_min
  speedValue: decimal('speed_value', { precision: 12, scale: 2 }).notNull(),
  setupHours: decimal('setup_hours', { precision: 10, scale: 2 }).notNull().default('0'),
  enabled: boolean('enabled').notNull().default(true),

  // Cached calculations
  runHours: decimal('run_hours', { precision: 10, scale: 2 }),
  totalCost: decimal('total_cost', { precision: 12, scale: 4 }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  estimateIdIdx: index('processes_estimate_id_idx').on(table.estimateId),
}));

// Slabs (pricing tiers)
export const slabs = pgTable('slabs', {
  id: uuid('id').primaryKey().defaultRandom(),
  estimateId: uuid('estimate_id').notNull().references(() => estimates.id, { onDelete: 'cascade' }),
  quantityKg: decimal('quantity_kg', { precision: 12, scale: 2 }).notNull(),
  pricePerKg: decimal('price_per_kg', { precision: 12, scale: 4 }).notNull(),
  // Optional explicit ordering for UI display (SCHEMA-01)
  sortOrder: integer('sort_order').notNull().default(0),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  estimateIdIdx: index('slabs_estimate_id_idx').on(table.estimateId),
}));

// ---------------------------------------------------------------------------
// Additional tables required for Phase 2 (B/C sections)
// ---------------------------------------------------------------------------

// (categories and subcategories are defined above, before materials)

// Slab templates (B5)
export const slabTemplates = pgTable('slab_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  templateKey: varchar('template_key', { length: 50 }).notNull(), // e.g. 'standard', 'large'
  name: varchar('name', { length: 255 }).notNull(),
  quantities: jsonb('quantities').notNull(), // number[] — quantity breakpoints in kg
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdx: index('slab_templates_tenant_idx').on(table.tenantId),
}));

// Proposals (PDF persistence) (B3)
export const proposals = pgTable('proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  estimateId: uuid('estimate_id').notNull().references(() => estimates.id, { onDelete: 'cascade' }),
  pdfPath: varchar('pdf_path', { length: 512 }), // local path or S3 key
  validUntil: timestamp('valid_until', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdx: index('proposals_tenant_idx').on(table.tenantId),
  estimateIdx: index('proposals_estimate_idx').on(table.estimateId),
}));

// Activity logs for audit
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 50 }).notNull(), // created, updated, deleted, etc.
  entityType: varchar('entity_type', { length: 50 }).notNull(), // estimate, material, customer
  entityId: uuid('entity_id'),
  changes: jsonb('changes'), // What changed
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdIdx: index('activity_logs_tenant_id_idx').on(table.tenantId),
  userIdIdx: index('activity_logs_user_id_idx').on(table.userId),
  createdAtIdx: index('activity_logs_created_at_idx').on(table.createdAt),
}));

// Price history for auto-refreshed market prices
export const priceHistory = pgTable('price_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  materialId: uuid('material_id').notNull().references(() => materials.id, { onDelete: 'cascade' }),
  oldPrice: decimal('old_price', { precision: 12, scale: 4 }).notNull(),
  newPrice: decimal('new_price', { precision: 12, scale: 4 }).notNull(),
  source: varchar('source', { length: 100 }).notNull(), // 'investing', 'tradingeconomics', etc.
  scrapedAt: timestamp('scraped_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  materialIdIdx: index('price_history_material_id_idx').on(table.materialId),
  scrapedAtIdx: index('price_history_scraped_at_idx').on(table.scrapedAt),
}));

// Structure Templates (seeded per tenant from ES_STANDARD_TEMPLATES_SEED.json)
export const structureTemplates = pgTable('structure_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  /** Immutable stable key for MES / API lookup (MES Phase D) */
  templateKey: varchar('template_key', { length: 128 }),
  externalId: varchar('external_id', { length: 128 }),
  externalSource: varchar('external_source', { length: 64 }),
  name: varchar('name', { length: 255 }).notNull(), // e.g. "Commercial Items Plain"
  pebiParentPg: varchar('pebi_parent_pg', { length: 255 }).notNull(), // PEBI parent product group name
  productType: productTypeEnum('product_type').notNull(), // roll, sleeve, pouch
  /** UI product kind + subtype (e.g. 'pouch_stand_up', 'bag_wicket'). */
  productSubtype: varchar('product_subtype', { length: 64 }),
  materialClass: varchar('material_class', { length: 50 }), // PE, Non PE
  structureType: varchar('structure_type', { length: 50 }), // Mono, Multilayer
  substrateOrigin: varchar('substrate_origin', { length: 50 }), // PE or null
  displayOrder: integer('display_order').notNull().default(0),
  // Flag to indicate standard (built‑in) templates vs. tenant‑created (B2)
  isStandard: boolean('is_standard').notNull().default(true),
  /**
   * Ownership tier (Smart Template Builder — Task 2.1):
   *   null         → platform standard (isStandard=true) or tenant add-on (isStandard=false)
   *   <userId>     → user-private add-on, visible only to that user
   */
  createdByUserId: uuid('created_by_user_id'),
  defaultDimensions: jsonb('default_dimensions'), // Default dimension values; also stores printMode key
  defaultLayers: jsonb('default_layers').notNull(), // Array of { layer_order, layer_type, ref_material_key, default_micron }
  defaultProcesses: jsonb('default_processes'), // Array of { process_key, enabled }
  defaultPrintingWebClass: printingWebClassEnum('default_printing_web_class').default('wide_web'),
  solventMixEnabled: boolean('solvent_mix_enabled').default(false),
  inkSystemOptions: jsonb('ink_system_options'), // ["SB"] or ["SB", "UV"]
  substrateOptions: jsonb('substrate_options'), // For shrink sleeves: ["PET Shrink Film", "PVC Shrink Film"]
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdIdx: index('structure_templates_tenant_id_idx').on(table.tenantId),
  displayOrderIdx: index('structure_templates_display_order_idx').on(table.displayOrder),
  templateKeyIdx: index('structure_templates_tenant_key_idx').on(table.tenantId, table.templateKey),
  createdByUserIdx: index('structure_templates_created_by_user_idx').on(table.createdByUserId),
}));

export const structureTemplatesRelations = relations(structureTemplates, ({ one }) => ({
  tenant: one(tenants, { fields: [structureTemplates.tenantId], references: [tenants.id] }),
}));

// Sessions (Phase 2.3 — refresh token rotation)
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  /** SHA-256 hash of the random refresh token (never store plaintext) */
  refreshTokenHash: varchar('refresh_token_hash', { length: 128 }).notNull().unique(),
  deviceLabel: varchar('device_label', { length: 255 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
  tenantIdIdx: index('sessions_tenant_id_idx').on(table.tenantId),
  expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
}));

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  estimates: many(estimates),
}));

export const estimatesRelations = relations(estimates, ({ one, many }) => ({
  tenant: one(tenants, { fields: [estimates.tenantId], references: [tenants.id] }),
  customer: one(customers, { fields: [estimates.customerId], references: [customers.id] }),
  layers: many(layers),
  processes: many(processes),
  slabs: many(slabs),
  sourceEstimate: one(estimates, { fields: [estimates.sourceEstimationId], references: [estimates.id] }),
}));

export const layersRelations = relations(layers, ({ one }) => ({
  estimate: one(estimates, { fields: [layers.estimateId], references: [estimates.id] }),
  material: one(materials, { fields: [layers.materialId], references: [materials.id] }),
}));

export const processesRelations = relations(processes, ({ one }) => ({
  estimate: one(estimates, { fields: [processes.estimateId], references: [estimates.id] }),
}));

export const slabsRelations = relations(slabs, ({ one }) => ({
  estimate: one(estimates, { fields: [slabs.estimateId], references: [estimates.id] }),
}));
