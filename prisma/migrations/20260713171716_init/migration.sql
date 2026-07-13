-- CreateEnum
CREATE TYPE "Role" AS ENUM ('LIDERANCA', 'COORDENACAO', 'PROFESSOR', 'AUXILIAR', 'RECEPCAO');

-- CreateEnum
CREATE TYPE "VolunteerStatus" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "FunctionType" AS ENUM ('PROFESSOR', 'AUXILIAR', 'APOIO_GERAL', 'LOUVOR', 'RECEPCAO', 'TEATRO');

-- CreateEnum
CREATE TYPE "ChildStatus" AS ENUM ('PENDENTE', 'APROVADO');

-- CreateEnum
CREATE TYPE "Frequencia" AS ENUM ('EBD', 'CULTO', 'AMBOS');

-- CreateEnum
CREATE TYPE "SeriesType" AS ENUM ('CULTO_INFANTIL', 'MATERNAL', 'PLUGUINHO', 'JUNIORES', 'DETETIVE');

-- CreateEnum
CREATE TYPE "SundayTipo" AS ENUM ('EBD', 'CULTO');

-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('APOSTILA', 'AULA_EXTRA', 'CULTO_INFANTIL', 'SEM_AULA', 'TEMA_LIVRE');

-- CreateEnum
CREATE TYPE "SlotType" AS ENUM ('SALA_PLUS', 'APOIO_EBD', 'APOIO_CULTO', 'LANCHE', 'EBD', 'CULTO');

-- CreateEnum
CREATE TYPE "SlotRole" AS ENUM ('PROFESSOR', 'AUXILIAR');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO', 'COMPRADO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "cpf" TEXT,
    "birthdate" TIMESTAMP(3),
    "motherName" TEXT,
    "phone" TEXT,
    "documentUrl" TEXT,
    "volunteerStatus" "VolunteerStatus" NOT NULL DEFAULT 'APROVADO',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VolunteerFunction" (
    "userId" TEXT NOT NULL,
    "function" "FunctionType" NOT NULL,

    CONSTRAINT "VolunteerFunction_pkey" PRIMARY KEY ("userId","function")
);

-- CreateTable
CREATE TABLE "UserPreferredClass" (
    "userId" TEXT NOT NULL,
    "classGroupId" TEXT NOT NULL,

    CONSTRAINT "UserPreferredClass_pkey" PRIMARY KEY ("userId","classGroupId")
);

-- CreateTable
CREATE TABLE "Child" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthdate" TIMESTAMP(3) NOT NULL,
    "classGroupId" TEXT,
    "frequencia" "Frequencia" NOT NULL,
    "fatherName" TEXT,
    "motherName" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "allergies" TEXT,
    "restrictions" TEXT,
    "revistaCertificateUrl" TEXT,
    "parentExpectations" TEXT,
    "parentConsent" BOOLEAN NOT NULL DEFAULT false,
    "registrationStatus" "ChildStatus" NOT NULL DEFAULT 'PENDENTE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Child_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ageRange" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ClassGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Curriculum" (
    "id" TEXT NOT NULL,
    "classGroupId" TEXT NOT NULL,
    "semester" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "seriesType" "SeriesType" NOT NULL,
    "seriesNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "totalWeeks" INTEGER NOT NULL,
    "uso" "Frequencia" NOT NULL,
    "copiasProfessor" INTEGER NOT NULL DEFAULT 0,
    "copiasAluno" INTEGER NOT NULL DEFAULT 0,
    "comprarProfessor" INTEGER NOT NULL DEFAULT 0,
    "recursosVisuais" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Curriculum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SundayPlan" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "classGroupId" TEXT NOT NULL,
    "tipo" "SundayTipo" NOT NULL,
    "curriculumId" TEXT,
    "licaoNumber" INTEGER,
    "lessonType" "LessonType" NOT NULL DEFAULT 'APOSTILA',
    "specialTitle" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SundayPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleSlot" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "slotType" "SlotType" NOT NULL,
    "classGroupId" TEXT,
    "role" "SlotRole" NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ScheduleSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "tipo" "SundayTipo" NOT NULL,
    "present" BOOLEAN NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minQuantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "materialId" TEXT,
    "freeTextItem" TEXT,
    "quantity" INTEGER NOT NULL,
    "justification" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventClass" (
    "eventId" TEXT NOT NULL,
    "classGroupId" TEXT NOT NULL,

    CONSTRAINT "EventClass_pkey" PRIMARY KEY ("eventId","classGroupId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ClassGroup_name_key" ON "ClassGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SundayPlan_date_classGroupId_tipo_key" ON "SundayPlan"("date", "classGroupId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleSlot_date_slotType_classGroupId_role_userId_key" ON "ScheduleSlot"("date", "slotType", "classGroupId", "role", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_childId_date_tipo_key" ON "Attendance"("childId", "date", "tipo");

-- AddForeignKey
ALTER TABLE "VolunteerFunction" ADD CONSTRAINT "VolunteerFunction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferredClass" ADD CONSTRAINT "UserPreferredClass_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferredClass" ADD CONSTRAINT "UserPreferredClass_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Child" ADD CONSTRAINT "Child_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Curriculum" ADD CONSTRAINT "Curriculum_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SundayPlan" ADD CONSTRAINT "SundayPlan_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SundayPlan" ADD CONSTRAINT "SundayPlan_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "Curriculum"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleSlot" ADD CONSTRAINT "ScheduleSlot_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "ClassGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleSlot" ADD CONSTRAINT "ScheduleSlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventClass" ADD CONSTRAINT "EventClass_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
