-- AddForeignKey
ALTER TABLE "EventClass" ADD CONSTRAINT "EventClass_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
