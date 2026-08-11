-- CreateTable
CREATE TABLE `notas_presupuesto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `presupuesto_id` INTEGER NOT NULL,
    `orden` INTEGER NOT NULL,
    `contenido` TEXT NULL,

    UNIQUE INDEX `notas_presupuesto_presupuesto_id_orden_key`(`presupuesto_id`, `orden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `notas_presupuesto` ADD CONSTRAINT `notas_presupuesto_presupuesto_id_fkey` FOREIGN KEY (`presupuesto_id`) REFERENCES `presupuesto_mensual`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
