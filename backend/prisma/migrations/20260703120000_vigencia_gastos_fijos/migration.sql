-- AlterTable
ALTER TABLE `gastos_fijos_config` ADD COLUMN `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `desactivado_en` DATETIME(3) NULL;


-- Los gastos fijos que ya existian antes de esta migracion se marcan como
-- vigentes desde siempre (2000-01-01), para no excluirlos de meses pasados
-- solo porque ahora se agrego el concepto de vigencia temporal.
UPDATE `gastos_fijos_config` SET `creado_en` = '2000-01-01 00:00:00';
