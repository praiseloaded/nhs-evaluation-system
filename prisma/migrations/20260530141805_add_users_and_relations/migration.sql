-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `tier` VARCHAR(191) NOT NULL DEFAULT 'free',
    `analysisUsed` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Analysis` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `jobTitle` VARCHAR(191) NOT NULL,
    `jobDescription` VARCHAR(191) NOT NULL,
    `personSpec` VARCHAR(191) NOT NULL,
    `essentialCriteria` VARCHAR(191) NOT NULL,
    `desirableCriteria` VARCHAR(191) NOT NULL,
    `skills` VARCHAR(191) NOT NULL,
    `values` VARCHAR(191) NOT NULL,
    `sourceUrl` VARCHAR(191) NULL,
    `cv` VARCHAR(191) NULL,
    `statement` VARCHAR(191) NULL,
    `result` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Analysis` ADD CONSTRAINT `Analysis_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
