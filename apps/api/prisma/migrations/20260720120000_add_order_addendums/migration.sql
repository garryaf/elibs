-- CreateTable: order_addendums
-- Post-approval amendments allowing DOKTER role users to add clinical notes
-- without triggering full status reversal (Requirement 12.2)
CREATE TABLE "order_addendums" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_addendums_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: orderId for fast lookup of addendums by order
CREATE INDEX "order_addendums_orderId_idx" ON "order_addendums"("orderId");

-- AddForeignKey: order_addendums.orderId -> orders.id
ALTER TABLE "order_addendums" ADD CONSTRAINT "order_addendums_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
