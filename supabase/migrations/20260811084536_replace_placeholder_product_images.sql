with product_images(id, image_url) as (
  values
    ('20000000-0000-4000-8000-000000000001'::uuid, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&h=1100&q=85'),
    ('20000000-0000-4000-8000-000000000002'::uuid, 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=900&h=1100&q=85'),
    ('20000000-0000-4000-8000-000000000003'::uuid, 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=900&h=1100&q=85'),
    ('20000000-0000-4000-8000-000000000004'::uuid, 'https://images.unsplash.com/photo-1605763240000-7e93b172d754?auto=format&fit=crop&w=900&h=1100&q=85'),
    ('20000000-0000-4000-8000-000000000005'::uuid, 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&h=1100&q=85'),
    ('20000000-0000-4000-8000-000000000006'::uuid, 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&h=1100&q=85'),
    ('20000000-0000-4000-8000-000000000007'::uuid, 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&h=1100&q=85'),
    ('20000000-0000-4000-8000-000000000008'::uuid, 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?auto=format&fit=crop&w=900&h=1100&q=85'),
    ('20000000-0000-4000-8000-000000000009'::uuid, 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=900&h=1100&q=85'),
    ('20000000-0000-4000-8000-000000000010'::uuid, 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=900&h=1100&q=85'),
    ('20000000-0000-4000-8000-000000000011'::uuid, 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&h=1100&q=85'),
    ('20000000-0000-4000-8000-000000000012'::uuid, 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=900&h=1100&q=85'),
    ('20000000-0000-4000-8000-000000000013'::uuid, 'https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=900&h=1100&q=85'),
    ('20000000-0000-4000-8000-000000000014'::uuid, 'https://images.unsplash.com/photo-1603487742131-4160ec999306?auto=format&fit=crop&w=900&h=1100&q=85'),
    ('20000000-0000-4000-8000-000000000015'::uuid, 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&h=1100&q=85'),
    ('20000000-0000-4000-8000-000000000016'::uuid, 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&h=1100&q=85')
)
update public.products as product
set primary_image_url = product_images.image_url,
    reference_images = jsonb_build_array(jsonb_build_object('url', product_images.image_url, 'view', 'front'))
from product_images
where product.id = product_images.id;
