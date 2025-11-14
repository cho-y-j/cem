-- FK 이름 수정: Supabase PostgREST가 인식할 수 있는 이름으로 변경

-- 기존 FK 삭제
ALTER TABLE "deployments" DROP CONSTRAINT IF EXISTS "deployments_guide_worker_id_workers_id_fk";
ALTER TABLE "deployments" DROP CONSTRAINT IF EXISTS "deployments_inspector_id_workers_id_fk";
ALTER TABLE "deployments" DROP CONSTRAINT IF EXISTS "deployments_equipment_id_equipment_id_fk";
ALTER TABLE "deployments" DROP CONSTRAINT IF EXISTS "deployments_worker_id_workers_id_fk";

-- ⭐ PostgREST가 기대하는 이름으로 FK 생성
-- 규칙: {table}_{column}_fkey

-- guide_worker_id → workers.id
ALTER TABLE "deployments"
  ADD CONSTRAINT "deployments_guide_worker_id_fkey"
  FOREIGN KEY ("guide_worker_id") REFERENCES "public"."workers"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

-- inspector_id → workers.id
ALTER TABLE "deployments"
  ADD CONSTRAINT "deployments_inspector_id_fkey"
  FOREIGN KEY ("inspector_id") REFERENCES "public"."workers"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

-- equipment_id → equipment.id
ALTER TABLE "deployments"
  ADD CONSTRAINT "deployments_equipment_id_fkey"
  FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

-- worker_id → workers.id
ALTER TABLE "deployments"
  ADD CONSTRAINT "deployments_worker_id_fkey"
  FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

-- 확인
SELECT
  con.conname AS constraint_name,
  att.attname AS column_name
FROM pg_constraint con
JOIN pg_class cl ON con.conrelid = cl.oid
JOIN pg_namespace ns ON cl.relnamespace = ns.oid
JOIN pg_attribute att ON att.attrelid = cl.oid AND att.attnum = ANY(con.conkey)
WHERE ns.nspname = 'public'
  AND cl.relname = 'deployments'
  AND con.contype = 'f'
ORDER BY con.conname;
