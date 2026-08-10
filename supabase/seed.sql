insert into public.merchants (id,name,slug,description,website_url,currency,primary_brand_colour) values
('11111111-1111-4111-8111-111111111111','Mirror Atelier','mirror-atelier','Modern tailoring, soft structure and polished everyday pieces made to work together.','https://example.com','NGN','#7b2f35')
on conflict (id) do nothing;

insert into public.products (id,merchant_id,name,description,price,currency,category,primary_image_url,product_url,sizes,colours,tags,stock_status) values
('20000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','Navy Oversized Blazer','Relaxed single-breasted blazer with clean shoulders and an easy drape.',42000,'NGN','Blazers','https://placehold.co/900x1100/d8dde3/111111?text=Navy+Oversized+Blazer','https://example.com/navy-blazer','["S","M","L","XL"]','["Navy"]','["tailored","workwear","modest"]','in_stock'),
('20000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','Stone Belted Blazer','Soft stone blazer with a removable waist belt and fluid lapel.',45000,'NGN','Blazers','https://placehold.co/900x1100/ded8cc/111111?text=Stone+Belted+Blazer','https://example.com/stone-blazer','["S","M","L"]','["Stone"]','["neutral","smart","minimal"]','in_stock'),
('20000000-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','Black Cropped Blazer','Sharp cropped jacket for high-waisted separates and evening looks.',39000,'NGN','Blazers','https://placehold.co/900x1100/c9c7c5/111111?text=Black+Cropped+Blazer','https://example.com/black-blazer','["XS","S","M","L"]','["Black"]','["evening","tailored"]','low_stock'),
('20000000-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111111','Cream Satin Blouse','Soft cream satin blouse with a covered placket and softly gathered cuffs.',24000,'NGN','Tops','https://placehold.co/900x1100/eee9df/111111?text=Cream+Satin+Blouse','https://example.com/cream-satin-blouse','["S","M","L","XL"]','["Cream"]','["workwear","occasion","neutral"]','in_stock'),
('20000000-0000-4000-8000-000000000005','11111111-1111-4111-8111-111111111111','Blue Pinstripe Shirt','Longline cotton shirt with fine blue pinstripes and curved hem.',21000,'NGN','Tops','https://placehold.co/900x1100/dce5e8/111111?text=Pinstripe+Shirt','https://example.com/pinstripe-shirt','["S","M","L"]','["Blue / White"]','["casual","workwear","layering"]','in_stock'),
('20000000-0000-4000-8000-000000000006','11111111-1111-4111-8111-111111111111','Chocolate Ribbed Top','Close-fitting long sleeve rib knit with a clean crew neckline.',18000,'NGN','Tops','https://placehold.co/900x1100/cfb9a6/111111?text=Chocolate+Ribbed+Top','https://example.com/chocolate-top','["XS","S","M","L"]','["Chocolate"]','["casual","layering"]','in_stock'),
('20000000-0000-4000-8000-000000000007','11111111-1111-4111-8111-111111111111','Black Tailored Trousers','High-rise tailored trousers with front pleats and a clean full-length fall.',30000,'NGN','Bottoms','https://placehold.co/900x1100/d2d0ce/111111?text=Black+Tailored+Trousers','https://example.com/black-trousers','["8","10","12","14","16"]','["Black"]','["workwear","tailored","modest"]','in_stock'),
('20000000-0000-4000-8000-000000000008','11111111-1111-4111-8111-111111111111','Oatmeal Column Skirt','Ankle-length straight skirt with back slit and discreet waistband.',26000,'NGN','Bottoms','https://placehold.co/900x1100/ddd3c4/111111?text=Oatmeal+Column+Skirt','https://example.com/oatmeal-skirt','["8","10","12","14"]','["Oatmeal"]','["modest","neutral","workwear"]','in_stock'),
('20000000-0000-4000-8000-000000000009','11111111-1111-4111-8111-111111111111','Olive Relaxed Trousers','Easy straight-leg trousers in muted olive with elasticated back waist.',28000,'NGN','Bottoms','https://placehold.co/900x1100/c8cbb5/111111?text=Olive+Relaxed+Trousers','https://example.com/olive-trousers','["S","M","L","XL"]','["Olive"]','["casual","modest","neutral"]','in_stock'),
('20000000-0000-4000-8000-000000000010','11111111-1111-4111-8111-111111111111','Burgundy Midi Dress','Long-sleeve midi dress with gathered waist and softly structured skirt.',48000,'NGN','Dresses','https://placehold.co/900x1100/d8b7b8/111111?text=Burgundy+Midi+Dress','https://example.com/burgundy-dress','["S","M","L"]','["Burgundy"]','["occasion","wedding","modest"]','in_stock'),
('20000000-0000-4000-8000-000000000011','11111111-1111-4111-8111-111111111111','Midnight Slip Dress','Bias-cut midi slip dress with a clean square neckline.',41000,'NGN','Dresses','https://placehold.co/900x1100/c7ccd1/111111?text=Midnight+Slip+Dress','https://example.com/midnight-dress','["XS","S","M","L"]','["Midnight"]','["evening","occasion"]','low_stock'),
('20000000-0000-4000-8000-000000000012','11111111-1111-4111-8111-111111111111','Black Leather Loafers','Minimal square-toe loafers with a low stacked heel.',35000,'NGN','Shoes','https://placehold.co/900x1100/d0ceca/111111?text=Black+Leather+Loafers','https://example.com/black-loafers','["37","38","39","40","41"]','["Black"]','["workwear","classic"]','in_stock'),
('20000000-0000-4000-8000-000000000013','11111111-1111-4111-8111-111111111111','Cream Slingback Flats','Pointed slingback flats with slim strap and soft cream finish.',32000,'NGN','Shoes','https://placehold.co/900x1100/e5dfd4/111111?text=Cream+Slingback+Flats','https://example.com/cream-flats','["37","38","39","40"]','["Cream"]','["occasion","neutral","workwear"]','in_stock'),
('20000000-0000-4000-8000-000000000014','11111111-1111-4111-8111-111111111111','Tan Minimal Sandals','Slim leather-look sandals with low heel and clean straps.',27000,'NGN','Shoes','https://placehold.co/900x1100/d8c0aa/111111?text=Tan+Minimal+Sandals','https://example.com/tan-sandals','["37","38","39","40","41"]','["Tan"]','["casual","occasion"]','in_stock'),
('20000000-0000-4000-8000-000000000015','11111111-1111-4111-8111-111111111111','Structured Cream Handbag','Structured cream handbag with top handles, clean hardware and a polished medium-size silhouette.',38000,'NGN','Accessories','https://placehold.co/900x1100/ceb9aa/111111?text=Structured+Cream+Handbag','https://example.com/cream-handbag','["One size"]','["Cream"]','["workwear","classic"]','in_stock'),
('20000000-0000-4000-8000-000000000016','11111111-1111-4111-8111-111111111111','Fine Gold-Tone Hoops','Small polished hoops designed for everyday styling.',12000,'NGN','Accessories','https://placehold.co/900x1100/e5dcc2/111111?text=Fine+Gold-Tone+Hoops','https://example.com/gold-hoops','["One size"]','["Gold"]','["minimal","occasion","everyday"]','in_stock')
on conflict (id) do nothing;

update public.merchants
set storefront_config = '{"heroTitle":"Dress the part. See the look before you buy.","heroCopy":"Try pieces from Mirror Atelier on your own photo and build a complete outfit with our AI stylist.","accentColor":"#7b2f35","backgroundColor":"#f7f5f1","textColor":"#111111","tryOnLabel":"Try it on","assistantName":"Atelier Stylist","showPoweredByMirror":true}'::jsonb
where id='11111111-1111-4111-8111-111111111111';

update public.products set
  try_on_category = case
    when category='Shoes' then 'shoes'
    when category='Blazers' then 'outerwear'
    when category='Tops' then 'top'
    when category='Bottoms' then 'bottom'
    when category='Dresses' then 'dress'
    when name ilike '%Tote%' then 'bag'
    when name ilike '%Hoops%' then 'earrings'
    else 'other_accessory'
  end,
  reference_images = jsonb_build_array(jsonb_build_object('url', primary_image_url, 'view', 'front')),
  visual_description = name || '. ' || description,
  generation_constraints = '{"preserveColour":true,"preservePattern":true,"preserveLogo":true}'::jsonb
where merchant_id='11111111-1111-4111-8111-111111111111';
