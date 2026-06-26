ALTER TABLE "estimates" ADD COLUMN IF NOT EXISTS "ink_printing_process" varchar(16);
--> statement-breakpoint
COMMENT ON COLUMN "estimates"."ink_printing_process" IS 'flexo | rotogravure — on-press ink makeup solvent ratio; null = infer from stack (PE→flexo)';
