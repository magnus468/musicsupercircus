
-- Update 2-publisher Embark works (MSCP): 10%/23.33% Norden, 15%/35% ROW
UPDATE works SET creators = REGEXP_REPLACE(
  REGEXP_REPLACE(
    creators,
    'Music Super Circus Publishing \(E, 16\.67%, repr\)',
    'Music Super Circus Publishing (E, 10%, row:15%, repr)'
  ),
  'Embark Studios \(E, 16\.67%\)',
  'Embark Studios (E, 23.33%, row:35%)'
)
WHERE creators LIKE '%Music Super Circus Publishing%' AND creators LIKE '%Embark Studios%' AND creators NOT LIKE '%row:%' AND creators NOT LIKE '%Ultra%';

-- Update 2-publisher Embark works (MSCP) where Embark has repr
UPDATE works SET creators = REGEXP_REPLACE(
  REGEXP_REPLACE(
    creators,
    'Music Super Circus Publishing \(E, 16\.67%, repr\)',
    'Music Super Circus Publishing (E, 10%, row:15%, repr)'
  ),
  'Embark Studios \(E, 16\.67%, repr\)',
  'Embark Studios (E, 23.33%, row:35%, repr)'
)
WHERE creators LIKE '%Music Super Circus Publishing%' AND creators LIKE '%Embark Studios%' AND creators NOT LIKE '%row:%' AND creators NOT LIKE '%Ultra%';

-- Update Dragon Rising specifically (has repr on Embark but pattern differs)
UPDATE works SET creators = REGEXP_REPLACE(
  REGEXP_REPLACE(
    creators,
    'Music Super Circus Publishing \(E, 16\.67%, repr\)',
    'Music Super Circus Publishing (E, 10%, row:15%, repr)'
  ),
  'Embark Studios \(E, 16\.67%\)',
  'Embark Studios (E, 23.33%, row:35%)'
)
WHERE creators LIKE '%Embark Studios (E, 16.67%)%' AND creators NOT LIKE '%row:%' AND creators NOT LIKE '%Ultra%';

-- Starlight Revel
UPDATE works SET creators = REGEXP_REPLACE(
  REGEXP_REPLACE(
    creators,
    'Music Super Circus Publishing \(E, 16\.67%, repr\)',
    'Music Super Circus Publishing (E, 10%, row:15%, repr)'
  ),
  'Embark Studios \(E, 16\.67%\)',
  'Embark Studios (E, 23.33%, row:35%)'
)
WHERE id = '31168d9b-881d-44ee-94f5-e7c692abd8e9' AND creators NOT LIKE '%row:%';
