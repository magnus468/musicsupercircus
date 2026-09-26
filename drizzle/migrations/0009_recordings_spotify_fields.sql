ALTER TABLE public.recordings
  ADD COLUMN IF NOT EXISTS spotify_track_id text,
  ADD COLUMN IF NOT EXISTS spotify_url text,
  ADD COLUMN IF NOT EXISTS spotify_album text,
  ADD COLUMN IF NOT EXISTS spotify_release_date text,
  ADD COLUMN IF NOT EXISTS spotify_cover_url text,
  ADD COLUMN IF NOT EXISTS spotify_popularity integer,
  ADD COLUMN IF NOT EXISTS spotify_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS recordings_spotify_track_id_idx ON public.recordings (spotify_track_id);