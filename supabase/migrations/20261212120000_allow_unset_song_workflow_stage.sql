-- The production editor supports an intentionally unset workflow stage.
alter table public.songs
  alter column workflow_stage drop not null;
