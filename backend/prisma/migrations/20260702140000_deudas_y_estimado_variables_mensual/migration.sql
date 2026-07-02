-- CreateTable
CREATE TABLE `categorias_variables_mensual` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `presupuesto_id` INTEGER NOT NULL,
    `categoria_id` INTEGER NOT NULL,
    `monto_estimado` DECIMAL(10, 2) NOT NULL,

    UNIQUE INDEX `categorias_variables_mensual_presupuesto_id_categoria_id_key`(`presupuesto_id`, `categoria_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deudas_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `saldo_actual` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deudas_mensual` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `presupuesto_id` INTEGER NOT NULL,
    `deuda_config_id` INTEGER NOT NULL,
    `monto_estimado` DECIMAL(10, 2) NULL,
    `monto_real` DECIMAL(10, 2) NULL,

    UNIQUE INDEX `deudas_mensual_presupuesto_id_deuda_config_id_key`(`presupuesto_id`, `deuda_config_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `categorias_variables_mensual` ADD CONSTRAINT `categorias_variables_mensual_presupuesto_id_fkey` FOREIGN KEY (`presupuesto_id`) REFERENCES `presupuesto_mensual`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categorias_variables_mensual` ADD CONSTRAINT `categorias_variables_mensual_categoria_id_fkey` FOREIGN KEY (`categoria_id`) REFERENCES `categorias_variables`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deudas_config` ADD CONSTRAINT `deudas_config_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deudas_mensual` ADD CONSTRAINT `deudas_mensual_presupuesto_id_fkey` FOREIGN KEY (`presupuesto_id`) REFERENCES `presupuesto_mensual`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deudas_mensual` ADD CONSTRAINT `deudas_mensual_deuda_config_id_fkey` FOREIGN KEY (`deuda_config_id`) REFERENCES `deudas_config`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

