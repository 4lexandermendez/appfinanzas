-- DropForeignKey
ALTER TABLE `transacciones` DROP FOREIGN KEY `transacciones_categoria_id_fkey`;

-- DropIndex
DROP INDEX `transacciones_categoria_id_fkey` ON `transacciones`;

-- AddForeignKey
ALTER TABLE `transacciones` ADD CONSTRAINT `transacciones_categoria_id_fkey` FOREIGN KEY (`categoria_id`) REFERENCES `categorias_variables`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

