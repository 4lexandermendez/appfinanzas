-- AlterTable
ALTER TABLE `movimientos_cuenta` ADD COLUMN `revisado` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `movimientos_tarjeta` ADD COLUMN `revisado` BOOLEAN NOT NULL DEFAULT false;
