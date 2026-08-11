-- CreateTable
CREATE TABLE `aportes_externos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transaccion_id` INTEGER NULL,
    `gasto_fijo_mensual_id` INTEGER NULL,
    `monto` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `aportes_externos` ADD CONSTRAINT `aportes_externos_transaccion_id_fkey` FOREIGN KEY (`transaccion_id`) REFERENCES `transacciones`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `aportes_externos` ADD CONSTRAINT `aportes_externos_gasto_fijo_mensual_id_fkey` FOREIGN KEY (`gasto_fijo_mensual_id`) REFERENCES `gastos_fijos_mensual`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
