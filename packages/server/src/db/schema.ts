import {
  pgTable,
  pgEnum,
  varchar,
  text,
  integer,
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
export const layerTypeEnum = pgEnum('layer_type', ['substrate', 'ink', 'adhesive']);
export const productTypeEnum = pgEnum('product_type', ['roll', 'sleeve', 'pouch']);
export const tenantTypeEnum = pgEnum('tenant_type', ['individual', 'company']);
export const printingWebClassEnum = pgEnum('printing_web_class', ['wide_web', 'narrow_web']);

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
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdIdx: index('materials_tenant_id_idx').on(table.tenantId),
  typeIdx: index('materials_type_idx').on(table.type),
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
  solventCostPerKgUsd: decimal('solvent_cost_per_kg_usd', { precision: 12, scale: 4 }),
  solventRatio: decimal('solvent_ratio', { precision: 5, scale: 4 }),
  orderQuantityKg: decimal('order_quantity_kg', { precision: 12, scale: 2 }),
  
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
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdIdx: index('estimates_tenant_id_idx').on(table.tenantId),
  customerIdIdx: index('estimates_customer_id_idx').on(table.customerId),
  statusIdx: index('estimates_status_idx').on(table.status),
  refNumberIdx: index('estimates_ref_number_idx').on(table.refNumber),
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
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  estimateIdIdx: index('slabs_estimate_id_idx').on(table.estimateId),
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

// Structure Templates (seeded per tenant from ES_STANDARD_TEMPLATES_SEED.json)
export const structureTemplates = pgTable('structure_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(), // e.g. "Commercial Items Plain"
  pebiParentPg: varchar('pebi_parent_pg', { length: 255 }).notNull(), // PEBI parent product group name
  productType: productTypeEnum('product_type').notNull(), // roll, sleeve, pouch
  materialClass: varchar('material_class', { length: 50 }), // PE, Non PE
  structureType: varchar('structure_type', { length: 50 }), // Mono, Multilayer
  substrateOrigin: varchar('substrate_origin', { length: 50 }), // PE or null
  displayOrder: integer('display_order').notNull().default(0),
  defaultDimensions: jsonb('default_dimensions'), // Default dimension values
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
}));

export const structureTemplatesRelations = relations(structureTemplates, ({ one }) => ({
  tenant: one(tenants, { fields: [structureTemplates.tenantId], references: [tenants.id] }),
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
