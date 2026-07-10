-- CreateEnum
CREATE TYPE "BatchInvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateTable
CREATE TABLE "batch_invoices" (
    "id" UUID NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "insuranceId" UUID NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "totalAmount" DECIMAL(14,2) NOT NULL,
    "orderCount" INTEGER NOT NULL,
    "status" "BatchInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "dueDate" DATE,
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paidAmount" DECIMAL(14,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batch_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_invoice_items" (
    "id" UUID NOT NULL,
    "batchInvoiceId" UUID NOT NULL,
    "orderId" UUID NOT NULL,

    CONSTRAINT "batch_invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_invoice_sequences" (
    "id" TEXT NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "batch_invoice_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "batch_invoices_invoiceNumber_key" ON "batch_invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "batch_invoices_insuranceId_status_idx" ON "batch_invoices"("insuranceId", "status");

-- CreateIndex
CREATE INDEX "batch_invoices_status_idx" ON "batch_invoices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "batch_invoice_items_batchInvoiceId_orderId_key" ON "batch_invoice_items"("batchInvoiceId", "orderId");

-- AddForeignKey
ALTER TABLE "batch_invoices" ADD CONSTRAINT "batch_invoices_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES "insurances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_invoice_items" ADD CONSTRAINT "batch_invoice_items_batchInvoiceId_fkey" FOREIGN KEY ("batchInvoiceId") REFERENCES "batch_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_invoice_items" ADD CONSTRAINT "batch_invoice_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
