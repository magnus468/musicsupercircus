DELETE FROM public.clients c
WHERE (c.first_name = '' OR c.first_name IS NULL)
  AND NOT EXISTS (SELECT 1 FROM public.agreements a WHERE a.client_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM public.royalty_payees rp WHERE rp.client_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM public.royalty_statements rs WHERE rs.client_id = c.id);