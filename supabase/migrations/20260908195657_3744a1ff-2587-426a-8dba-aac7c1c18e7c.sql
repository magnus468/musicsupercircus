CREATE TABLE IF NOT EXISTS public.settlement_statement_map (
  publisher text NOT NULL,
  distribution_key text NOT NULL,
  label text NOT NULL,
  PRIMARY KEY (publisher, distribution_key)
);
GRANT ALL ON public.settlement_statement_map TO service_role;
ALTER TABLE public.settlement_statement_map ENABLE ROW LEVEL SECURITY;

INSERT INTO public.settlement_statement_map (publisher, distribution_key, label)
WITH ordered AS (
  SELECT id, publisher, created_at, distribution, distribution_key, amount,
    CASE WHEN lag(created_at) OVER (PARTITION BY publisher ORDER BY created_at) IS NULL
          OR created_at - lag(created_at) OVER (PARTITION BY publisher ORDER BY created_at) > interval '30 seconds'
      THEN 1 ELSE 0 END AS nb
  FROM public.settlements WHERE distribution_key NOT LIKE 'WC-%'
), batched AS (
  SELECT *, sum(nb) OVER (PARTITION BY publisher ORDER BY created_at ROWS UNBOUNDED PRECEDING) AS b FROM ordered
), ml AS (
  SELECT publisher, b, initcap(substring(lower(distribution) FROM '((?:januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)[ ]+[0-9]{4})')) AS m, count(*) c
  FROM batched GROUP BY 1,2,3
), best AS (
  SELECT DISTINCT ON (publisher,b) publisher,b,m FROM ml WHERE m IS NOT NULL ORDER BY publisher,b,c DESC,m
), fb AS (
  SELECT DISTINCT ON (publisher,b) publisher,b,distribution FROM batched ORDER BY publisher,b,amount DESC NULLS LAST
)
SELECT DISTINCT ON (b.publisher, b.distribution_key) b.publisher, b.distribution_key,
  coalesce(best.m, fb.distribution, b.distribution, b.distribution_key)
FROM batched b
LEFT JOIN best ON best.publisher=b.publisher AND best.b=b.b
LEFT JOIN fb ON fb.publisher=b.publisher AND fb.b=b.b
ORDER BY b.publisher, b.distribution_key
ON CONFLICT DO NOTHING;