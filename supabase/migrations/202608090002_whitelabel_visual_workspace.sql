-- White-label storefronts + chained visual try-on state + product fidelity metadata.
alter table public.merchants
  add column if not exists custom_domain text,
  add column if not exists storefront_config jsonb not null default '{}'::jsonb;

create unique index if not exists merchants_custom_domain_unique
  on public.merchants (lower(custom_domain)) where custom_domain is not null;

alter table public.products
  add column if not exists try_on_category text,
  add column if not exists reference_images jsonb not null default '[]'::jsonb,
  add column if not exists visual_description text,
  add column if not exists generation_constraints jsonb not null default '{}'::jsonb;

alter table public.try_on_generations
  add column if not exists parent_generation_id uuid references public.try_on_generations(id) on delete set null,
  add column if not exists provider_interaction_id text,
  add column if not exists fidelity_report jsonb,
  add column if not exists correction_attempted boolean not null default false;

create index if not exists generations_parent_idx on public.try_on_generations(parent_generation_id);

update public.merchants
set storefront_config = jsonb_build_object(
  'heroTitle', 'Dress the part. See the look before you buy.',
  'heroCopy', 'Try pieces from this store on your own photo and build a complete outfit with the store stylist.',
  'accentColor', coalesce(primary_brand_colour, '#111111'),
  'backgroundColor', '#f7f5f1',
  'textColor', '#111111',
  'tryOnLabel', 'Try it on',
  'assistantName', 'Store Stylist',
  'showPoweredByMirror', true
)
where storefront_config = '{}'::jsonb;

update public.products set try_on_category = case
  when lower(category) like '%shoe%' then 'shoes'
  when lower(category) like '%blazer%' or lower(category) like '%jacket%' then 'outerwear'
  when lower(category) like '%top%' or lower(category) like '%shirt%' then 'top'
  when lower(category) like '%bottom%' or lower(category) like '%trouser%' or lower(category) like '%skirt%' then 'bottom'
  when lower(category) like '%dress%' then 'dress'
  when lower(name) like '%bag%' or lower(name) like '%tote%' then 'bag'
  when lower(name) like '%earring%' or lower(name) like '%hoop%' then 'earrings'
  when lower(name) like '%necklace%' then 'necklace'
  else 'other_accessory'
end
where try_on_category is null;

update public.products
set reference_images = jsonb_build_array(jsonb_build_object('url', primary_image_url, 'view', 'front')),
    visual_description = coalesce(visual_description, name || '. ' || description),
    generation_constraints = jsonb_build_object('preserveColour', true, 'preservePattern', true, 'preserveLogo', true)
where reference_images = '[]'::jsonb;
