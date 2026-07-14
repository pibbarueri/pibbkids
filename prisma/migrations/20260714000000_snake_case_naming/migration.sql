-- Rename enum types to snake_case
ALTER TYPE "Role" RENAME TO "role";
ALTER TYPE "VolunteerStatus" RENAME TO "volunteer_status";
ALTER TYPE "FunctionType" RENAME TO "function_type";
ALTER TYPE "ChildStatus" RENAME TO "child_status";
ALTER TYPE "Frequencia" RENAME TO "frequencia";
ALTER TYPE "SeriesType" RENAME TO "series_type";
ALTER TYPE "SundayTipo" RENAME TO "sunday_tipo";
ALTER TYPE "LessonType" RENAME TO "lesson_type";
ALTER TYPE "SlotType" RENAME TO "slot_type";
ALTER TYPE "SlotRole" RENAME TO "slot_role";
ALTER TYPE "RequestStatus" RENAME TO "request_status";

-- Rename tables to snake_case
ALTER TABLE "User" RENAME TO "users";
ALTER TABLE "VolunteerFunction" RENAME TO "volunteer_functions";
ALTER TABLE "UserPreferredClass" RENAME TO "user_preferred_classes";
ALTER TABLE "Child" RENAME TO "children";
ALTER TABLE "ClassGroup" RENAME TO "class_groups";
ALTER TABLE "Curriculum" RENAME TO "curriculums";
ALTER TABLE "SundayPlan" RENAME TO "sunday_plans";
ALTER TABLE "ScheduleSlot" RENAME TO "schedule_slots";
ALTER TABLE "Attendance" RENAME TO "attendance";
ALTER TABLE "Material" RENAME TO "materials";
ALTER TABLE "StockMovement" RENAME TO "stock_movements";
ALTER TABLE "PurchaseRequest" RENAME TO "purchase_requests";
ALTER TABLE "Event" RENAME TO "events";
ALTER TABLE "EventClass" RENAME TO "event_classes";

-- users columns
ALTER TABLE "users" RENAME COLUMN "motherName" TO "mother_name";
ALTER TABLE "users" RENAME COLUMN "documentUrl" TO "document_url";
ALTER TABLE "users" RENAME COLUMN "volunteerStatus" TO "volunteer_status";
ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at";

-- volunteer_functions columns
ALTER TABLE "volunteer_functions" RENAME COLUMN "userId" TO "user_id";

-- user_preferred_classes columns
ALTER TABLE "user_preferred_classes" RENAME COLUMN "userId" TO "user_id";
ALTER TABLE "user_preferred_classes" RENAME COLUMN "classGroupId" TO "class_group_id";

-- children columns
ALTER TABLE "children" RENAME COLUMN "classGroupId" TO "class_group_id";
ALTER TABLE "children" RENAME COLUMN "fatherName" TO "father_name";
ALTER TABLE "children" RENAME COLUMN "motherName" TO "mother_name";
ALTER TABLE "children" RENAME COLUMN "revistaCertificateUrl" TO "revista_certificate_url";
ALTER TABLE "children" RENAME COLUMN "parentExpectations" TO "parent_expectations";
ALTER TABLE "children" RENAME COLUMN "parentConsent" TO "parent_consent";
ALTER TABLE "children" RENAME COLUMN "registrationStatus" TO "registration_status";
ALTER TABLE "children" RENAME COLUMN "createdAt" TO "created_at";

-- class_groups columns
ALTER TABLE "class_groups" RENAME COLUMN "ageRange" TO "age_range";

-- curriculums columns
ALTER TABLE "curriculums" RENAME COLUMN "classGroupId" TO "class_group_id";
ALTER TABLE "curriculums" RENAME COLUMN "seriesType" TO "series_type";
ALTER TABLE "curriculums" RENAME COLUMN "seriesNumber" TO "series_number";
ALTER TABLE "curriculums" RENAME COLUMN "totalWeeks" TO "total_weeks";
ALTER TABLE "curriculums" RENAME COLUMN "copiasProfessor" TO "copias_professor";
ALTER TABLE "curriculums" RENAME COLUMN "copiasAluno" TO "copias_aluno";
ALTER TABLE "curriculums" RENAME COLUMN "comprarProfessor" TO "comprar_professor";
ALTER TABLE "curriculums" RENAME COLUMN "recursosVisuais" TO "recursos_visuais";

-- sunday_plans columns
ALTER TABLE "sunday_plans" RENAME COLUMN "classGroupId" TO "class_group_id";
ALTER TABLE "sunday_plans" RENAME COLUMN "curriculumId" TO "curriculum_id";
ALTER TABLE "sunday_plans" RENAME COLUMN "licaoNumber" TO "licao_number";
ALTER TABLE "sunday_plans" RENAME COLUMN "lessonType" TO "lesson_type";
ALTER TABLE "sunday_plans" RENAME COLUMN "specialTitle" TO "special_title";

-- schedule_slots columns
ALTER TABLE "schedule_slots" RENAME COLUMN "slotType" TO "slot_type";
ALTER TABLE "schedule_slots" RENAME COLUMN "classGroupId" TO "class_group_id";
ALTER TABLE "schedule_slots" RENAME COLUMN "userId" TO "user_id";

-- attendance columns
ALTER TABLE "attendance" RENAME COLUMN "childId" TO "child_id";
ALTER TABLE "attendance" RENAME COLUMN "userId" TO "user_id";

-- materials columns
ALTER TABLE "materials" RENAME COLUMN "minQuantity" TO "min_quantity";

-- stock_movements columns
ALTER TABLE "stock_movements" RENAME COLUMN "materialId" TO "material_id";

-- purchase_requests columns
ALTER TABLE "purchase_requests" RENAME COLUMN "requesterId" TO "requester_id";
ALTER TABLE "purchase_requests" RENAME COLUMN "materialId" TO "material_id";
ALTER TABLE "purchase_requests" RENAME COLUMN "freeTextItem" TO "free_text_item";
ALTER TABLE "purchase_requests" RENAME COLUMN "createdAt" TO "created_at";

-- event_classes columns
ALTER TABLE "event_classes" RENAME COLUMN "eventId" TO "event_id";
ALTER TABLE "event_classes" RENAME COLUMN "classGroupId" TO "class_group_id";

-- Rename primary key constraints
ALTER TABLE "users" RENAME CONSTRAINT "User_pkey" TO "users_pkey";
ALTER TABLE "volunteer_functions" RENAME CONSTRAINT "VolunteerFunction_pkey" TO "volunteer_functions_pkey";
ALTER TABLE "user_preferred_classes" RENAME CONSTRAINT "UserPreferredClass_pkey" TO "user_preferred_classes_pkey";
ALTER TABLE "children" RENAME CONSTRAINT "Child_pkey" TO "children_pkey";
ALTER TABLE "class_groups" RENAME CONSTRAINT "ClassGroup_pkey" TO "class_groups_pkey";
ALTER TABLE "curriculums" RENAME CONSTRAINT "Curriculum_pkey" TO "curriculums_pkey";
ALTER TABLE "sunday_plans" RENAME CONSTRAINT "SundayPlan_pkey" TO "sunday_plans_pkey";
ALTER TABLE "schedule_slots" RENAME CONSTRAINT "ScheduleSlot_pkey" TO "schedule_slots_pkey";
ALTER TABLE "attendance" RENAME CONSTRAINT "Attendance_pkey" TO "attendance_pkey";
ALTER TABLE "materials" RENAME CONSTRAINT "Material_pkey" TO "materials_pkey";
ALTER TABLE "stock_movements" RENAME CONSTRAINT "StockMovement_pkey" TO "stock_movements_pkey";
ALTER TABLE "purchase_requests" RENAME CONSTRAINT "PurchaseRequest_pkey" TO "purchase_requests_pkey";
ALTER TABLE "events" RENAME CONSTRAINT "Event_pkey" TO "events_pkey";
ALTER TABLE "event_classes" RENAME CONSTRAINT "EventClass_pkey" TO "event_classes_pkey";

-- Rename unique indexes
ALTER INDEX "User_email_key" RENAME TO "users_email_key";
ALTER INDEX "ClassGroup_name_key" RENAME TO "class_groups_name_key";
ALTER INDEX "SundayPlan_date_classGroupId_tipo_key" RENAME TO "sunday_plans_date_class_group_id_tipo_key";
ALTER INDEX "ScheduleSlot_date_slotType_classGroupId_role_userId_key" RENAME TO "schedule_slots_date_slot_type_class_group_id_role_user_id_key";
ALTER INDEX "Attendance_childId_date_tipo_key" RENAME TO "attendance_child_id_date_tipo_key";

-- Rename foreign key constraints
ALTER TABLE "volunteer_functions" RENAME CONSTRAINT "VolunteerFunction_userId_fkey" TO "volunteer_functions_user_id_fkey";
ALTER TABLE "user_preferred_classes" RENAME CONSTRAINT "UserPreferredClass_userId_fkey" TO "user_preferred_classes_user_id_fkey";
ALTER TABLE "user_preferred_classes" RENAME CONSTRAINT "UserPreferredClass_classGroupId_fkey" TO "user_preferred_classes_class_group_id_fkey";
ALTER TABLE "children" RENAME CONSTRAINT "Child_classGroupId_fkey" TO "children_class_group_id_fkey";
ALTER TABLE "curriculums" RENAME CONSTRAINT "Curriculum_classGroupId_fkey" TO "curriculums_class_group_id_fkey";
ALTER TABLE "sunday_plans" RENAME CONSTRAINT "SundayPlan_classGroupId_fkey" TO "sunday_plans_class_group_id_fkey";
ALTER TABLE "sunday_plans" RENAME CONSTRAINT "SundayPlan_curriculumId_fkey" TO "sunday_plans_curriculum_id_fkey";
ALTER TABLE "schedule_slots" RENAME CONSTRAINT "ScheduleSlot_classGroupId_fkey" TO "schedule_slots_class_group_id_fkey";
ALTER TABLE "schedule_slots" RENAME CONSTRAINT "ScheduleSlot_userId_fkey" TO "schedule_slots_user_id_fkey";
ALTER TABLE "attendance" RENAME CONSTRAINT "Attendance_childId_fkey" TO "attendance_child_id_fkey";
ALTER TABLE "attendance" RENAME CONSTRAINT "Attendance_userId_fkey" TO "attendance_user_id_fkey";
ALTER TABLE "stock_movements" RENAME CONSTRAINT "StockMovement_materialId_fkey" TO "stock_movements_material_id_fkey";
ALTER TABLE "purchase_requests" RENAME CONSTRAINT "PurchaseRequest_requesterId_fkey" TO "purchase_requests_requester_id_fkey";
ALTER TABLE "purchase_requests" RENAME CONSTRAINT "PurchaseRequest_materialId_fkey" TO "purchase_requests_material_id_fkey";
ALTER TABLE "event_classes" RENAME CONSTRAINT "EventClass_eventId_fkey" TO "event_classes_event_id_fkey";
ALTER TABLE "event_classes" RENAME CONSTRAINT "EventClass_classGroupId_fkey" TO "event_classes_class_group_id_fkey";
