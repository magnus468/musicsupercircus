
-- Step 1: Sole publisher MSCE/MSCP - add row:50% where missing
-- Pattern: (E, 33.33%, repr) → (E, 33.33%, row:50%, repr)
UPDATE works 
SET creators = regexp_replace(
  creators,
  '(Music Super Circus (?:Extravaganza|Publishing)) \(E, 33\.33%, repr\)$',
  '\1 (E, 33.33%, row:50%, repr)'
)
WHERE creators ~ 'Music Super Circus (Extravaganza|Publishing) \(E, 33\.33%, repr\)$'
AND creators NOT LIKE '%row:%'
AND co_publishers IS NULL;

-- Step 2: Co-publishers (not SF, not Embark) - set MSCE/MSCP to 16.67%/25% with repr, co-pub to 16.66%/25% with repr
-- First fix MSCE/MSCP in co-pub scenarios: ensure row:25%
UPDATE works
SET creators = regexp_replace(
  creators,
  '(Music Super Circus (?:Extravaganza|Publishing)) \(E, 16\.67%, repr\)',
  '\1 (E, 16.67%, row:25%, repr)'
)
WHERE creators ~ 'Music Super Circus (Extravaganza|Publishing) \(E, 16\.67%, repr\)'
AND creators NOT LIKE '%Embark%'
AND creators NOT LIKE '%, SF (%';

-- Step 3: Co-publishers - set their share to 16.66%, row:25%, repr
-- Match the trailing co-publisher pattern: "Name (E, 16.67%)" or "Name (E, 16.67%, row:25%)" without repr
UPDATE works
SET creators = regexp_replace(
  creators,
  ', ([^(]+)\(E, 16\.6[67]%(?:, row:\d+(?:\.\d+)?%)?\)$',
  ', \1(E, 16.66%, row:25%, repr)'
)
WHERE creators ~ ', [^(]+\(E, 16\.6[67]%(?:, row:\d+(?:\.\d+)?%)?\)$'
AND creators NOT LIKE '%Embark%'
AND creators NOT LIKE '%, SF (%';
