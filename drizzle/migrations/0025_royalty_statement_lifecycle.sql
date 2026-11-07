ALTER TABLE public.royalty_statements ADD COLUMN finalized_at timestamptz, ADD COLUMN sent_at timestamptz, ADD COLUMN paid_at date, ADD COLUMN payment_reference text, ADD COLUMN payee_snapshot jsonb, ADD COLUMN detail_snapshot jsonb;
CREATE OR REPLACE FUNCTION public.guard_royalty_statement() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN
   IF OLD.finalized_at IS NOT NULL THEN RAISE EXCEPTION 'Låsta avräkningar kan inte tas bort'; END IF;
   RETURN OLD;
 END IF;
 IF TG_OP = 'UPDATE' THEN
   IF (to_jsonb(NEW) - ARRAY['finalized_at','sent_at','paid_at','payment_reference']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['finalized_at','sent_at','paid_at','payment_reference']) THEN
     RAISE EXCEPTION 'Avräkningens sparade belopp och underlag kan inte ändras';
   END IF;
   IF OLD.finalized_at IS NOT NULL AND NEW.finalized_at IS DISTINCT FROM OLD.finalized_at THEN RAISE EXCEPTION 'Avräkningen kan inte låsas upp'; END IF;
   IF OLD.sent_at IS NOT NULL AND NEW.sent_at IS DISTINCT FROM OLD.sent_at THEN RAISE EXCEPTION 'Skickad status kan inte återställas'; END IF;
 END IF;
 IF NEW.sent_at IS NOT NULL AND NEW.finalized_at IS NULL THEN RAISE EXCEPTION 'Lås avräkningen innan den markeras skickad'; END IF;
 IF NEW.paid_at IS NOT NULL AND (NEW.finalized_at IS NULL OR NEW.payable_incl_vat <= 0) THEN RAISE EXCEPTION 'Endast låsta avräkningar med positivt belopp kan markeras betalda'; END IF;
 IF NEW.finalized_at IS NOT NULL AND (NEW.payee_snapshot IS NULL OR NEW.detail_snapshot IS NULL) THEN RAISE EXCEPTION 'Mottagare och underlag måste sparas innan avräkningen låses'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER royalty_statement_guard BEFORE INSERT OR UPDATE OR DELETE ON public.royalty_statements FOR EACH ROW EXECUTE FUNCTION public.guard_royalty_statement();
CREATE OR REPLACE FUNCTION public.get_royalty_period_details(p_start date, p_end date) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public SET statement_timeout = '120s' AS $$
BEGIN
 IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501'; END IF;
 RETURN (
 WITH st AS (SELECT * FROM recording_statements WHERE coalesce(period_end,period_start) >= date_trunc('month',p_start) AND period_start <= p_end),
 l AS (SELECT x.*, CASE WHEN x.store ILIKE 'bandcamp' OR x.sale_type ILIKE '%download%' OR x.sale_type ILIKE '%album (f%' OR x.store ILIKE '%itunes%' THEN 'downloads' ELSE 'streams' END AS cat FROM recording_statement_lines x JOIN st ON st.id=x.statement_id WHERE x.sale_month IS NULL OR (x.sale_month >= to_char(p_start,'YYYY-MM') AND x.sale_month <= to_char(p_end,'YYYY-MM'))),
 direct AS (SELECT l.statement_id,l.cat,s.recipient,l.recording_id,l.amount*s.frac AS amt FROM l JOIN recording_effective_splits s ON s.recording_id=l.recording_id),
 c AS (SELECT statement_id,cat,catalog_number,sum(amount) AS amt FROM l WHERE recording_id IS NULL AND isrc IS NULL AND catalog_number IS NOT NULL GROUP BY 1,2,3),
 cr AS (SELECT r.catalog_number,r.id,count(*) OVER (PARTITION BY r.catalog_number) AS n FROM recordings r WHERE r.catalog_number IN (SELECT catalog_number FROM c)),
 catpay AS (SELECT c.statement_id,c.cat,s.recipient,cr.id AS recording_id,c.amt/cr.n*s.frac AS amt FROM c JOIN cr USING(catalog_number) JOIN recording_effective_splits s ON s.recording_id=cr.id),
 a AS (SELECT * FROM direct UNION ALL SELECT * FROM catpay),
 inc AS (SELECT a.statement_id,a.recipient,recording_album_key(r.album,r.spotify_album,r.project) AS album_key,coalesce(nullif(r.album,''),nullif(r.spotify_album,''),nullif(r.project,''),'Okänt album') AS album,sum(a.amt) AS original_amount,sum(a.amt*st.usd_sek_rate) AS income_sek FROM a JOIN recordings r ON r.id=a.recording_id JOIN st ON st.id=a.statement_id GROUP BY 1,2,3,4),
 rec AS (SELECT g.statement_id,g.recipient,g.album_key,sum(g.deduction*g.rate) AS recoup_sek FROM public._recording_ledger() g JOIN st ON st.id=g.statement_id WHERE g.rate IS NOT NULL GROUP BY 1,2,3)
 SELECT coalesce(jsonb_agg(jsonb_build_object('statement_id',inc.statement_id,'recipient',inc.recipient,'album_key',inc.album_key,'album',inc.album,'source',st.source,'period_label',st.period_label,'currency',st.currency,'rate',st.usd_sek_rate,'original_amount',inc.original_amount,'income_sek',coalesce(inc.income_sek,0),'recoup_sek',coalesce(rec.recoup_sek,0)) ORDER BY inc.recipient,inc.album,st.period_start),'[]'::jsonb) FROM inc JOIN st ON st.id=inc.statement_id LEFT JOIN rec USING(statement_id,recipient,album_key)
 );
END $$;
REVOKE ALL ON FUNCTION public.get_royalty_period_details(date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_royalty_period_details(date,date) TO authenticated,service_role;