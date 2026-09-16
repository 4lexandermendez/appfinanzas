-- CreateTable
CREATE TABLE `montos_rapidos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `concepto` VARCHAR(191) NOT NULL,
    `monto` DECIMAL(10, 2) NOT NULL,

    UNIQUE INDEX `montos_rapidos_usuario_id_concepto_monto_key`(`usuario_id`, `concepto`, `monto`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `montos_rapidos` ADD CONSTRAINT `montos_rapidos_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing 3-slot data into individual rows
INSERT INTO `montos_rapidos` (`usuario_id`, `concepto`, `monto`)
SELECT `usuario_id`, `concepto`, `monto_1` FROM `botones_rapidos_config` WHERE `monto_1` IS NOT NULL;
INSERT INTO `montos_rapidos` (`usuario_id`, `concepto`, `monto`)
SELECT `usuario_id`, `concepto`, `monto_2` FROM `botones_rapidos_config` WHERE `monto_2` IS NOT NULL;
INSERT INTO `montos_rapidos` (`usuario_id`, `concepto`, `monto`)
SELECT `usuario_id`, `concepto`, `monto_3` FROM `botones_rapidos_config` WHERE `monto_3` IS NOT NULL;

-- DropTable
DROP TABLE `botones_rapidos_config`;
