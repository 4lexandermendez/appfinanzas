-- AlterTable
ALTER TABLE `grupos_cuenta` ADD COLUMN `orden` INTEGER NOT NULL DEFAULT 0;

-- Backfill: conserva el orden actual (por id) para los grupos existentes
UPDATE `grupos_cuenta` SET `orden` = `id`;
