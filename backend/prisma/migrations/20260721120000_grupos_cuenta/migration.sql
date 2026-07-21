
-- AlterTable
ALTER TABLE `tarjetas_credito` ADD COLUMN `grupo_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `grupos_cuenta` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cuentas_bancarias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `grupo_id` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `grupos_cuenta` ADD CONSTRAINT `grupos_cuenta_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cuentas_bancarias` ADD CONSTRAINT `cuentas_bancarias_grupo_id_fkey` FOREIGN KEY (`grupo_id`) REFERENCES `grupos_cuenta`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tarjetas_credito` ADD CONSTRAINT `tarjetas_credito_grupo_id_fkey` FOREIGN KEY (`grupo_id`) REFERENCES `grupos_cuenta`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

