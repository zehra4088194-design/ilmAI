-- Rest & Audio library: let a playlist track be either a YouTube embed
-- (existing behaviour) or a real audio file stored in the new B2 audio
-- bucket. youtube_url/youtube_video_id become optional and a source_type +
-- storage_url pair is added for uploaded audio.

alter table public.playlist_songs
  alter column youtube_url drop not null,
  alter column youtube_video_id drop not null;

alter table public.playlist_songs
  add column if not exists source_type text not null default 'youtube',
  add column if not exists storage_url text,
  add column if not exists duration_seconds integer,
  add column if not exists file_size_bytes bigint,
  add column if not exists mime_type text;

alter table public.playlist_songs
  drop constraint if exists playlist_songs_source_type_check;
alter table public.playlist_songs
  add constraint playlist_songs_source_type_check
  check (source_type in ('youtube', 'audio'));

alter table public.playlist_songs
  drop constraint if exists playlist_songs_source_payload_check;
alter table public.playlist_songs
  add constraint playlist_songs_source_payload_check
  check (
    (source_type = 'youtube' and youtube_video_id is not null)
    or (source_type = 'audio' and storage_url is not null)
  );

comment on column public.playlist_songs.source_type is 'youtube = embedded YouTube video, audio = file stored in the B2 audio bucket (storage_url).';
comment on column public.playlist_songs.storage_url is 'r2://<bucket>/<key> pointer into the audio bucket, set when source_type = audio.';
comment on column public.playlist_songs.duration_seconds is 'Track length in seconds, read client-side from the uploaded file before saving.';
