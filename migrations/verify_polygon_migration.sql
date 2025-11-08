-- 마이그레이션 확인 쿼리
-- work_zones 테이블의 새로운 컬럼들이 제대로 추가되었는지 확인

SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'work_zones'
  AND column_name IN ('zone_type', 'polygon_coordinates', 'center_lat', 'center_lng', 'radius_meters')
ORDER BY column_name;

-- 기존 데이터 확인 (모두 circle 타입이어야 함)
SELECT 
  id,
  name,
  zone_type,
  center_lat,
  center_lng,
  radius_meters,
  polygon_coordinates
FROM work_zones
LIMIT 5;

