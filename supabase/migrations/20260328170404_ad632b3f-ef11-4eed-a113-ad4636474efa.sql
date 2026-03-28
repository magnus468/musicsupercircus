
UPDATE works 
SET creators = regexp_replace(
  creators, 
  '^([^,]+)\((CA, )?repr\)', 
  '\1(CA, 66.67%, row:50%, repr)'
)
WHERE creators ~ '^[^,]+\((CA, )?repr\),'
AND creators NOT LIKE '%/%'
