-- Add the Bloomberg contact from the supplied personal contact list.
-- Existing records with the same phone or email are left untouched.
with contacts(first_name, last_name, phone, email, note) as (values
  ('Bita', 'Mansouri', '7165639620', null, 'Bloomberg'),
  ('Mason', 'Bernstien', '4436107434', null, null)
)
insert into public.marketing_contacts (first_name, last_name, phone, email, note, industry_category)
select c.first_name, c.last_name, c.phone, c.email, c.note, 'Other'
from contacts c
where not exists (
  select 1 from public.marketing_contacts m
  where regexp_replace(coalesce(m.phone, ''), '\D', '', 'g') = regexp_replace(coalesce(c.phone, ''), '\D', '', 'g')
     or (c.email is not null and lower(trim(coalesce(m.email, ''))) = lower(trim(c.email)))
     or (c.phone is null and c.email is null and lower(trim(coalesce(m.first_name, '') || ' ' || coalesce(m.last_name, ''))) = lower(trim(c.first_name || ' ' || c.last_name)))
);
