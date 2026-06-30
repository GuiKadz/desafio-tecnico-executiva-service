/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,version]` on the table `contract_templates` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `action` on the `contract_history` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "HistoryAction" AS ENUM ('CREATED', 'STATUS_CHANGED', 'FIELD_UPDATED');

-- AlterTable
ALTER TABLE "contract_history" DROP COLUMN "action",
ADD COLUMN     "action" "HistoryAction" NOT NULL;

-- CreateIndex
CREATE INDEX "contract_field_values_contractId_fieldName_idx" ON "contract_field_values"("contractId", "fieldName");

-- CreateIndex
CREATE UNIQUE INDEX "contract_templates_tenantId_version_key" ON "contract_templates"("tenantId", "version");
