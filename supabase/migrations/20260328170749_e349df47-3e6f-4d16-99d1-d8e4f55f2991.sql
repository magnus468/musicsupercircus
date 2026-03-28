
-- Fix remaining sole publishers: add row:50% 
UPDATE works 
SET creators = regexp_replace(
  creators,
  '(Music Super Circus (?:Extravaganza|Publishing)) \(E, 33\.33%, repr\)$',
  '\1 (E, 33.33%, row:50%, repr)'
)
WHERE creators ~ 'Music Super Circus (Extravaganza|Publishing) \(E, 33\.33%, repr\)$';
