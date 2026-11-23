-- Add the Bloomberg contact from the supplied personal contact list.
-- Existing records with the same phone or email are left untouched.
insert into public.marketing_contacts (first_name, last_name, phone, email, note, industry_category)
select 'Bita', 'Mansouri', '7165639620', null, 'Bloomberg', 'Other'
where not exists (
  select 1
  from public.marketing_contacts
  where regexp_replace(coalesce(phone, ''), '\D', '', 'g') = '7165639620'
     or (lower(trim(coalesce(first_name, ''))) = 'bita'
         and lower(trim(coalesce(last_name, ''))) = 'mansouri'
         and coalesce(note, '') = 'Bloomberg')
);
