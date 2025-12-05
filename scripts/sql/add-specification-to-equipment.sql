-- Add specification column to equipment table
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS specification VARCHAR(200);

-- Update existing equipment with sample specifications
UPDATE equipment
SET specification = '10톤급, 작업높이 20m, 버킷용량 0.5m³'
WHERE id = 'n4zLSdi7o2smDYRuqfRD1';

-- Add specifications to other equipment if they exist
UPDATE equipment
SET specification = CASE
  WHEN specification IS NULL THEN '표준 규격'
  ELSE specification
END;
