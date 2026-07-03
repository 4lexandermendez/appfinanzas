-- AlterTable
ALTER TABLE `deudas_config` ADD COLUMN `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `desactivado_en` DATETIME(3) NULL;


-- Backfill: deudas que ya existian antes de esta migracion se marcan como
-- vigentes desde siempre, para no excluirlas de meses pasados.
UPDATE `deudas_config` SET `creado_en` = '2000-01-01 00:00:00';
