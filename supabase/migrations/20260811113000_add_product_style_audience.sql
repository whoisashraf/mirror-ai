alter table public.products
  add column if not exists style_audience text not null default 'unisex'
  check (style_audience in ('menswear', 'womenswear', 'unisex'));

update public.products
set style_audience = case
  when name in (
    'Stone Belted Blazer', 'Black Cropped Blazer', 'Cream Satin Blouse',
    'Oatmeal Column Skirt', 'Burgundy Midi Dress', 'Midnight Slip Dress',
    'Cream Slingback Flats', 'Tan Minimal Sandals'
  ) then 'womenswear'
  else 'unisex'
end
where merchant_id = '11111111-1111-4111-8111-111111111111';

comment on column public.products.style_audience is
  'Explicit merchandising audience used for shopper-selected style filtering; never inferred from a shopper image.';
