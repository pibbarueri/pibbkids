ALTER TYPE "request_status" ADD VALUE IF NOT EXISTS 'EM_ESTOQUE';
ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "unit" TEXT;
ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;
