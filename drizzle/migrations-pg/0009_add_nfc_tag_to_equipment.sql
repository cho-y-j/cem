ALTER TABLE equipment
ADD COLUMN IF NOT EXISTS nfc_tag_id varchar(128);

CREATE UNIQUE INDEX IF NOT EXISTS equipment_nfc_tag_id_idx
ON equipment (nfc_tag_id)
WHERE nfc_tag_id IS NOT NULL;

