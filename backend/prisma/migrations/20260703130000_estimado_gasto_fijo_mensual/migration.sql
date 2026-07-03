-- AlterTable
ALTER TABLE `gastos_fijos_mensual` ADD COLUMN `monto_estimado` DECIMAL(10, 2) NULL;

-- Filas ya existentes (creadas cuando se registro un Real) quedan marcadas
-- como "seleccionadas" para su mes, usando el estimado de la config como
-- valor inicial para no perder lo que ya se venia mostrando.
UPDATE `gastos_fijos_mensual` gfm
JOIN `gastos_fijos_config` gfc ON gfm.gasto_fijo_config_id = gfc.id
SET gfm.monto_estimado = gfc.monto_estimado
WHERE gfm.monto_estimado IS NULL;

