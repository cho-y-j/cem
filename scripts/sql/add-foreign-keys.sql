-- Deployments 테이블에 Foreign Key 추가
-- guide_worker_id와 inspector_id 컬럼은 이미 존재하므로 FK만 추가

-- 기존 FK가 있다면 삭제 (에러 방지)
ALTER TABLE "deployments" DROP CONSTRAINT IF EXISTS "deployments_equipment_id_equipment_id_fk";
ALTER TABLE "deployments" DROP CONSTRAINT IF EXISTS "deployments_worker_id_workers_id_fk";
ALTER TABLE "deployments" DROP CONSTRAINT IF EXISTS "deployments_guide_worker_id_workers_id_fk";
ALTER TABLE "deployments" DROP CONSTRAINT IF EXISTS "deployments_inspector_id_workers_id_fk";

-- Foreign Key 추가
ALTER TABLE "deployments"
  ADD CONSTRAINT "deployments_equipment_id_equipment_id_fk"
  FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "deployments"
  ADD CONSTRAINT "deployments_worker_id_workers_id_fk"
  FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "deployments"
  ADD CONSTRAINT "deployments_guide_worker_id_workers_id_fk"
  FOREIGN KEY ("guide_worker_id") REFERENCES "public"."workers"("id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "deployments"
  ADD CONSTRAINT "deployments_inspector_id_workers_id_fk"
  FOREIGN KEY ("inspector_id") REFERENCES "public"."workers"("id")
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
