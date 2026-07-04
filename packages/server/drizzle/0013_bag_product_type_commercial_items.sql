-- Commercial Items are Bags (first-class product_type), not Pouches.
UPDATE platform_standard_templates
SET
  product_type = 'bag',
  default_processes = REPLACE(default_processes::text, '"pouch_making"', '"bag_making"')::jsonb,
  updated_at = NOW()
WHERE product_type = 'pouch'
  AND (
    name ILIKE 'Commercial Items%'
    OR pebi_parent_pg ILIKE 'Commercial Items%'
  );

UPDATE structure_templates
SET
  product_type = 'bag',
  default_processes = REPLACE(default_processes::text, '"pouch_making"', '"bag_making"')::jsonb,
  updated_at = NOW()
WHERE product_type = 'pouch'
  AND is_standard = true
  AND (
    name ILIKE 'Commercial Items%'
    OR pebi_parent_pg ILIKE 'Commercial Items%'
  );
