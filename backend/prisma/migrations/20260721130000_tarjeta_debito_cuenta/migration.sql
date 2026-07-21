
-- AlterTable
ALTER TABLE `cuentas_bancarias` ADD COLUMN `saldo_actual` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `tarjetas_debito` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cuenta_id` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `tarjetas_debito_cuenta_id_key`(`cuenta_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movimientos_cuenta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cuenta_id` INTEGER NOT NULL,
    `monto` DECIMAL(10, 2) NOT NULL,
    `fecha` DATE NOT NULL,
    `descripcion` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tarjetas_debito` ADD CONSTRAINT `tarjetas_debito_cuenta_id_fkey` FOREIGN KEY (`cuenta_id`) REFERENCES `cuentas_bancarias`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_cuenta` ADD CONSTRAINT `movimientos_cuenta_cuenta_id_fkey` FOREIGN KEY (`cuenta_id`) REFERENCES `cuentas_bancarias`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

