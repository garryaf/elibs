-- Store the billed coverage snapshot on each invoice line. Existing historical
-- invoice rows retain a zero value until they are reconciled deliberately.
ALTER TABLE "batch_invoice_items"
ADD COLUMN "amount" DECIMAL(14,2) NOT NULL DEFAULT 0;
