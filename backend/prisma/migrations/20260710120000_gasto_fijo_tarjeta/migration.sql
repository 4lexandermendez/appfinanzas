-- AlterTable
ALTER TABLE `gastos_fijos_mensual` ADD COLUMN `fuente` ENUM('EFECTIVO', 'TARJETA') NOT NULL DEFAULT 'EFECTIVO',
    ADD COLUMN `tarjeta_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `movimientos_tarjeta` ADD COLUMN `gasto_fijo_mensual_id` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `movimientos_tarjeta_gasto_fijo_mensual_id_key` ON `movimientos_tarjeta`(`gasto_fijo_mensual_id`);

-- AddForeignKey
ALTER TABLE `gastos_fijos_mensual` ADD CONSTRAINT `gastos_fijos_mensual_tarjeta_id_fkey` FOREIGN KEY (`tarjeta_id`) REFERENCES `tarjetas_credito`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_tarjeta` ADD CONSTRAINT `movimientos_tarjeta_gasto_fijo_mensual_id_fkey` FOREIGN KEY (`gasto_fijo_mensual_id`) REFERENCES `gastos_fijos_mensual`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

