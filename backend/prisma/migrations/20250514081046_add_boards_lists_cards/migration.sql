/*
  Warnings:

  - You are about to drop the column `assignedId` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_assignedId_fkey";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "assignedId";

-- DropTable
DROP TABLE "User";
