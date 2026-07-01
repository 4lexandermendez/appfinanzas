-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `usuarios_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `presupuesto_mensual` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `anio` INTEGER NOT NULL,
    `mes` INTEGER NOT NULL,
    `notas` TEXT NULL,

    UNIQUE INDEX `presupuesto_mensual_usuario_id_anio_mes_key`(`usuario_id`, `anio`, `mes`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gastos_fijos_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `monto_estimado` DECIMAL(10, 2) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gastos_fijos_mensual` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `presupuesto_id` INTEGER NOT NULL,
    `gasto_fijo_config_id` INTEGER NOT NULL,
    `monto_real` DECIMAL(10, 2) NULL,

    UNIQUE INDEX `gastos_fijos_mensual_presupuesto_id_gasto_fijo_config_id_key`(`presupuesto_id`, `gasto_fijo_config_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ingresos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `presupuesto_id` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `monto_estimado` DECIMAL(10, 2) NOT NULL,
    `monto_real` DECIMAL(10, 2) NULL,
    `fecha` DATE NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categorias_variables` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `es_default` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transacciones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `presupuesto_id` INTEGER NOT NULL,
    `categoria_id` INTEGER NOT NULL,
    `monto` DECIMAL(10, 2) NOT NULL,
    `fecha` DATE NOT NULL,
    `notas` TEXT NULL,
    `fuente` ENUM('EFECTIVO', 'TARJETA') NOT NULL DEFAULT 'EFECTIVO',
    `tarjeta_id` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tracker_diario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `presupuesto_id` INTEGER NOT NULL,
    `fecha` DATE NOT NULL,
    `concepto` ENUM('PASAJE_IDA', 'DESAYUNO', 'ALMUERZO', 'PASAJE_REGRESO') NOT NULL,
    `monto` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ahorros` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `presupuesto_id` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `monto_estimado` DECIMAL(10, 2) NOT NULL,
    `monto_real` DECIMAL(10, 2) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `metas_ahorro` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `monto_objetivo` DECIMAL(10, 2) NOT NULL,
    `monto_actual` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `fecha_limite` DATE NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tarjetas_credito` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `limite` DECIMAL(10, 2) NOT NULL,
    `dia_corte` INTEGER NOT NULL,
    `dia_pago` INTEGER NOT NULL,
    `saldo_actual` DECIMAL(10, 2) NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movimientos_tarjeta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tarjeta_id` INTEGER NOT NULL,
    `monto` DECIMAL(10, 2) NOT NULL,
    `fecha` DATE NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `transaccion_id` INTEGER NULL,

    UNIQUE INDEX `movimientos_tarjeta_transaccion_id_key`(`transaccion_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ajustes_tracker` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `monto_pasaje_ida` DECIMAL(10, 2) NOT NULL,
    `monto_desayuno` DECIMAL(10, 2) NOT NULL,
    `monto_almuerzo` DECIMAL(10, 2) NOT NULL,
    `monto_pasaje_regreso` DECIMAL(10, 2) NOT NULL,
    `monto_pasaje_sabado_ida` DECIMAL(10, 2) NOT NULL,
    `monto_desayuno_sabado` DECIMAL(10, 2) NOT NULL,
    `monto_pasaje_sabado_regreso` DECIMAL(10, 2) NOT NULL,
    `patron_sabado_inicio` DATE NOT NULL,
    `patron_sabado_primer_dia_va` BOOLEAN NOT NULL,

    UNIQUE INDEX `ajustes_tracker_usuario_id_key`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dias_libres` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `fecha` DATE NOT NULL,
    `motivo` ENUM('VACACION', 'ASUETO', 'DESCANSO', 'OTRO') NOT NULL,

    UNIQUE INDEX `dias_libres_usuario_id_fecha_key`(`usuario_id`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `botones_rapidos_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `concepto` VARCHAR(191) NOT NULL,
    `monto_1` DECIMAL(10, 2) NOT NULL,
    `monto_2` DECIMAL(10, 2) NULL,
    `monto_3` DECIMAL(10, 2) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alertas_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `porcentaje_alerta` INTEGER NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `presupuesto_mensual` ADD CONSTRAINT `presupuesto_mensual_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gastos_fijos_config` ADD CONSTRAINT `gastos_fijos_config_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gastos_fijos_mensual` ADD CONSTRAINT `gastos_fijos_mensual_presupuesto_id_fkey` FOREIGN KEY (`presupuesto_id`) REFERENCES `presupuesto_mensual`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gastos_fijos_mensual` ADD CONSTRAINT `gastos_fijos_mensual_gasto_fijo_config_id_fkey` FOREIGN KEY (`gasto_fijo_config_id`) REFERENCES `gastos_fijos_config`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ingresos` ADD CONSTRAINT `ingresos_presupuesto_id_fkey` FOREIGN KEY (`presupuesto_id`) REFERENCES `presupuesto_mensual`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categorias_variables` ADD CONSTRAINT `categorias_variables_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transacciones` ADD CONSTRAINT `transacciones_presupuesto_id_fkey` FOREIGN KEY (`presupuesto_id`) REFERENCES `presupuesto_mensual`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transacciones` ADD CONSTRAINT `transacciones_categoria_id_fkey` FOREIGN KEY (`categoria_id`) REFERENCES `categorias_variables`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transacciones` ADD CONSTRAINT `transacciones_tarjeta_id_fkey` FOREIGN KEY (`tarjeta_id`) REFERENCES `tarjetas_credito`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tracker_diario` ADD CONSTRAINT `tracker_diario_presupuesto_id_fkey` FOREIGN KEY (`presupuesto_id`) REFERENCES `presupuesto_mensual`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ahorros` ADD CONSTRAINT `ahorros_presupuesto_id_fkey` FOREIGN KEY (`presupuesto_id`) REFERENCES `presupuesto_mensual`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `metas_ahorro` ADD CONSTRAINT `metas_ahorro_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tarjetas_credito` ADD CONSTRAINT `tarjetas_credito_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_tarjeta` ADD CONSTRAINT `movimientos_tarjeta_tarjeta_id_fkey` FOREIGN KEY (`tarjeta_id`) REFERENCES `tarjetas_credito`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimientos_tarjeta` ADD CONSTRAINT `movimientos_tarjeta_transaccion_id_fkey` FOREIGN KEY (`transaccion_id`) REFERENCES `transacciones`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ajustes_tracker` ADD CONSTRAINT `ajustes_tracker_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dias_libres` ADD CONSTRAINT `dias_libres_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `botones_rapidos_config` ADD CONSTRAINT `botones_rapidos_config_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alertas_config` ADD CONSTRAINT `alertas_config_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
