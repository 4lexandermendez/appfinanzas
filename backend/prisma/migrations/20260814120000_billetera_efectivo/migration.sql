-- AlterTable
ALTER TABLE `cuentas_bancarias` ADD COLUMN `es_efectivo` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `ingresos` ADD COLUMN `cuenta_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `movimientos_cuenta` ADD COLUMN `gasto_fijo_mensual_id` INTEGER NULL,
    ADD COLUMN `ingreso_id` INTEGER NULL,
    ADD COLUMN `tracker_diario_id` INTEGER NULL,
    ADD COLUMN `transaccion_id` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `movimientos_cuenta_transaccion_id_key` ON `movimientos_cuenta`(`transaccion_id`);

-- CreateIndex
CREATE UNIQUE INDEX `movimientos_cuenta_gasto_fijo_mensual_id_key` ON `movimientos_cuenta`(`gasto_fijo_mensual_id`);

-- CreateIndex
CREATE UNIQUE INDEX `movimientos_cuenta_ingreso_id_key` ON `movimientos_cuenta`(`ingreso_id`);

-- CreateIndex
CREATE UNIQUE INDEX `movimientos_cuenta_tracker_diario_id_key` ON `movimientos_cuenta`(`tracker_diario_id`);

-- AddForeignKey
ALTER TABLE `ingresos` ADD CONSTRAINT `ingresos_cuenta_id_fkey` FOREIGN KEY (`cuenta_id`) REFERENCES `cuentas_bancarias`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_cuenta` ADD CONSTRAINT `movimientos_cuenta_transaccion_id_fkey` FOREIGN KEY (`transaccion_id`) REFERENCES `transacciones`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_cuenta` ADD CONSTRAINT `movimientos_cuenta_gasto_fijo_mensual_id_fkey` FOREIGN KEY (`gasto_fijo_mensual_id`) REFERENCES `gastos_fijos_mensual`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_cuenta` ADD CONSTRAINT `movimientos_cuenta_ingreso_id_fkey` FOREIGN KEY (`ingreso_id`) REFERENCES `ingresos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_cuenta` ADD CONSTRAINT `movimientos_cuenta_tracker_diario_id_fkey` FOREIGN KEY (`tracker_diario_id`) REFERENCES `tracker_diario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
