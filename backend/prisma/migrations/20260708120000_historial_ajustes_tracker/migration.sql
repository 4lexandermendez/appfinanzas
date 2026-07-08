-- DropForeignKey
ALTER TABLE `ajustes_tracker` DROP FOREIGN KEY `ajustes_tracker_usuario_id_fkey`;

-- DropIndex
DROP INDEX `ajustes_tracker_usuario_id_key` ON `ajustes_tracker`;

-- AlterTable
ALTER TABLE `ajustes_tracker` ADD COLUMN `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- Filas ya existentes quedan vigentes "desde siempre" (mismo criterio usado
-- para GastoFijoConfig/DeudaConfig): no hay forma de saber retroactivamente
-- desde cuando estaba vigente cada monto, asi que se respeta el
-- comportamiento anterior para meses pasados.
UPDATE `ajustes_tracker` SET `creado_en` = '2000-01-01 00:00:00' WHERE 1=1;

-- CreateIndex
CREATE INDEX `ajustes_tracker_usuario_id_creado_en_idx` ON `ajustes_tracker`(`usuario_id`, `creado_en`);

-- AddForeignKey
ALTER TABLE `ajustes_tracker` ADD CONSTRAINT `ajustes_tracker_usuario_id_fkey` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
