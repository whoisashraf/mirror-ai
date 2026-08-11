with product_images(id, file_name) as (
  values
    ('20000000-0000-4000-8000-000000000001'::uuid, 'navy-oversized-blazer.webp'),
    ('20000000-0000-4000-8000-000000000002'::uuid, 'stone-belted-blazer.webp'),
    ('20000000-0000-4000-8000-000000000003'::uuid, 'black-cropped-blazer.webp'),
    ('20000000-0000-4000-8000-000000000004'::uuid, 'cream-satin-blouse.webp'),
    ('20000000-0000-4000-8000-000000000005'::uuid, 'blue-pinstripe-shirt.webp'),
    ('20000000-0000-4000-8000-000000000006'::uuid, 'chocolate-ribbed-top.webp'),
    ('20000000-0000-4000-8000-000000000007'::uuid, 'black-tailored-trousers.webp'),
    ('20000000-0000-4000-8000-000000000008'::uuid, 'oatmeal-column-skirt.webp'),
    ('20000000-0000-4000-8000-000000000009'::uuid, 'olive-relaxed-trousers.webp'),
    ('20000000-0000-4000-8000-000000000010'::uuid, 'burgundy-midi-dress.webp'),
    ('20000000-0000-4000-8000-000000000011'::uuid, 'midnight-slip-dress.webp'),
    ('20000000-0000-4000-8000-000000000012'::uuid, 'black-leather-loafers.webp'),
    ('20000000-0000-4000-8000-000000000013'::uuid, 'cream-slingback-flats.webp'),
    ('20000000-0000-4000-8000-000000000014'::uuid, 'tan-minimal-sandals.webp'),
    ('20000000-0000-4000-8000-000000000015'::uuid, 'structured-cream-handbag.webp'),
    ('20000000-0000-4000-8000-000000000016'::uuid, 'fine-gold-tone-hoops.webp')
), hosted_images as (
  select id, 'https://uqflgjddwgabzfxqdlzf.supabase.co/storage/v1/object/public/product-images/catalog-v1/' || file_name as image_url
  from product_images
)
update public.products as product
set primary_image_url = hosted_images.image_url,
    reference_images = jsonb_build_array(jsonb_build_object('url', hosted_images.image_url, 'view', 'front'))
from hosted_images
where product.id = hosted_images.id;
