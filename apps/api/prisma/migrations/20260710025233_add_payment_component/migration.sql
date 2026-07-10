-- CreateTable
CREATE TABLE "payment_components" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "insuranceId" UUID,
    "reference" VARCHAR(100),
    "notes" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_components_orderId_idx" ON "payment_components"("orderId");

-- AddForeignKey
ALTER TABLE "payment_components" ADD CONSTRAINT "payment_components_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_components" ADD CONSTRAINT "payment_components_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES "insurances"("id") ON DELETE SET NULL ON UPDATE CASCADE;
