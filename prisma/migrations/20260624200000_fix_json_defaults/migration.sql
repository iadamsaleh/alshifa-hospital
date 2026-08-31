-- Fix rows where SQLite stored empty string '' instead of '[]' for JSON columns
-- that were added as new columns in previous migrations.
-- SQLite does not evaluate DEFAULT [] as a JSON array literal; rows that were
-- copied via INSERT INTO ... SELECT without including the new column received
-- empty string rather than '[]'. This breaks Prisma's JSON parser.
UPDATE "Prescription" SET "advisedInvestigations" = '[]' WHERE "advisedInvestigations" = '';
UPDATE "Prescription" SET "diagnoses" = '[]' WHERE "diagnoses" = '';
