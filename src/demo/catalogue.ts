import type { Merchant, Product } from '@/types'

export const demoMerchant: Merchant = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Mirror Atelier',
  slug: 'mirror-atelier',
  description: 'Modern tailoring, soft structure and polished everyday pieces made to work together.',
  website_url: 'https://example.com',
  currency: 'NGN',
  primary_brand_colour: '#7b2f35',
  custom_domain: null,
  storefront_config: {
    heroTitle: 'Dress the part. See the look before you buy.',
    heroCopy: 'Try pieces from Mirror Atelier on your own photo and build a complete outfit with our AI stylist.',
    accentColor: '#7b2f35',
    backgroundColor: '#f7f5f1',
    textColor: '#111111',
    tryOnLabel: 'Try it on',
    assistantName: 'Atelier Stylist',
    showPoweredByMirror: true,
  },
}

const MID = demoMerchant.id
const image = (label: string, tone: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1100"><rect width="100%" height="100%" fill="${tone}"/><rect x="70" y="70" width="760" height="960" rx="28" fill="none" stroke="#111" stroke-opacity=".12" stroke-width="2"/><text x="50%" y="48%" text-anchor="middle" font-family="Arial" font-size="42" fill="#111">${label}</text><text x="50%" y="54%" text-anchor="middle" font-family="Arial" font-size="18" fill="#555">MIRROR ATELIER</text></svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export const demoProducts: Product[] = [
  { id:'20000000-0000-4000-8000-000000000001', merchant_id:MID, name:'Navy Oversized Blazer', description:'Relaxed single-breasted blazer with clean shoulders and an easy drape.', price:42000, currency:'NGN', category:'Blazers', primary_image_url:image('Navy Oversized Blazer','#d8dde3'), product_url:'https://example.com/navy-blazer', sizes:['S','M','L','XL'], colours:['Navy'], tags:['tailored','workwear','modest'], stock_status:'in_stock', is_active:true },
  { id:'20000000-0000-4000-8000-000000000002', merchant_id:MID, name:'Stone Belted Blazer', description:'Soft stone blazer with a removable waist belt and fluid lapel.', price:45000, currency:'NGN', category:'Blazers', primary_image_url:image('Stone Belted Blazer','#ded8cc'), product_url:'https://example.com/stone-blazer', sizes:['S','M','L'], colours:['Stone'], tags:['neutral','smart','minimal'], stock_status:'in_stock', is_active:true },
  { id:'20000000-0000-4000-8000-000000000003', merchant_id:MID, name:'Black Cropped Blazer', description:'Sharp cropped jacket for high-waisted separates and evening looks.', price:39000, currency:'NGN', category:'Blazers', primary_image_url:image('Black Cropped Blazer','#c9c7c5'), product_url:'https://example.com/black-blazer', sizes:['XS','S','M','L'], colours:['Black'], tags:['evening','tailored'], stock_status:'low_stock', is_active:true },
  { id:'20000000-0000-4000-8000-000000000004', merchant_id:MID, name:'Cream Satin Blouse', description:'Soft cream satin blouse with a covered placket and softly gathered cuffs.', price:24000, currency:'NGN', category:'Tops', primary_image_url:image('Cream Satin Blouse','#eee9df'), product_url:'https://example.com/cream-satin-blouse', sizes:['S','M','L','XL'], colours:['Cream'], tags:['workwear','occasion','neutral'], stock_status:'in_stock', is_active:true },
  { id:'20000000-0000-4000-8000-000000000005', merchant_id:MID, name:'Blue Pinstripe Shirt', description:'Longline cotton shirt with fine blue pinstripes and curved hem.', price:21000, currency:'NGN', category:'Tops', primary_image_url:image('Blue Pinstripe Shirt','#dce5e8'), product_url:'https://example.com/pinstripe-shirt', sizes:['S','M','L'], colours:['Blue / White'], tags:['casual','workwear','layering'], stock_status:'in_stock', is_active:true },
  { id:'20000000-0000-4000-8000-000000000006', merchant_id:MID, name:'Chocolate Ribbed Top', description:'Close-fitting long sleeve rib knit with a clean crew neckline.', price:18000, currency:'NGN', category:'Tops', primary_image_url:image('Chocolate Ribbed Top','#cfb9a6'), product_url:'https://example.com/chocolate-top', sizes:['XS','S','M','L'], colours:['Chocolate'], tags:['casual','layering'], stock_status:'in_stock', is_active:true },
  { id:'20000000-0000-4000-8000-000000000007', merchant_id:MID, name:'Black Tailored Trousers', description:'High-rise tailored trousers with front pleats and a clean full-length fall.', price:30000, currency:'NGN', category:'Bottoms', primary_image_url:image('Black Tailored Trousers','#d2d0ce'), product_url:'https://example.com/black-trousers', sizes:['8','10','12','14','16'], colours:['Black'], tags:['workwear','tailored','modest'], stock_status:'in_stock', is_active:true },
  { id:'20000000-0000-4000-8000-000000000008', merchant_id:MID, name:'Oatmeal Column Skirt', description:'Ankle-length straight skirt with back slit and discreet waistband.', price:26000, currency:'NGN', category:'Bottoms', primary_image_url:image('Oatmeal Column Skirt','#ddd3c4'), product_url:'https://example.com/oatmeal-skirt', sizes:['8','10','12','14'], colours:['Oatmeal'], tags:['modest','neutral','workwear'], stock_status:'in_stock', is_active:true },
  { id:'20000000-0000-4000-8000-000000000009', merchant_id:MID, name:'Olive Relaxed Trousers', description:'Easy straight-leg trousers in muted olive with elasticated back waist.', price:28000, currency:'NGN', category:'Bottoms', primary_image_url:image('Olive Relaxed Trousers','#c8cbb5'), product_url:'https://example.com/olive-trousers', sizes:['S','M','L','XL'], colours:['Olive'], tags:['casual','modest','neutral'], stock_status:'in_stock', is_active:true },
  { id:'20000000-0000-4000-8000-000000000010', merchant_id:MID, name:'Burgundy Midi Dress', description:'Long-sleeve midi dress with gathered waist and softly structured skirt.', price:48000, currency:'NGN', category:'Dresses', primary_image_url:image('Burgundy Midi Dress','#d8b7b8'), product_url:'https://example.com/burgundy-dress', sizes:['S','M','L'], colours:['Burgundy'], tags:['occasion','wedding','modest'], stock_status:'in_stock', is_active:true },
  { id:'20000000-0000-4000-8000-000000000011', merchant_id:MID, name:'Midnight Slip Dress', description:'Bias-cut midi slip dress with a clean square neckline.', price:41000, currency:'NGN', category:'Dresses', primary_image_url:image('Midnight Slip Dress','#c7ccd1'), product_url:'https://example.com/midnight-dress', sizes:['XS','S','M','L'], colours:['Midnight'], tags:['evening','occasion'], stock_status:'low_stock', is_active:true },
  { id:'20000000-0000-4000-8000-000000000012', merchant_id:MID, name:'Black Leather Loafers', description:'Minimal square-toe loafers with a low stacked heel.', price:35000, currency:'NGN', category:'Shoes', primary_image_url:image('Black Leather Loafers','#d0ceca'), product_url:'https://example.com/black-loafers', sizes:['37','38','39','40','41'], colours:['Black'], tags:['workwear','classic'], stock_status:'in_stock', is_active:true },
  { id:'20000000-0000-4000-8000-000000000013', merchant_id:MID, name:'Cream Slingback Flats', description:'Pointed slingback flats with slim strap and soft cream finish.', price:32000, currency:'NGN', category:'Shoes', primary_image_url:image('Cream Slingback Flats','#e5dfd4'), product_url:'https://example.com/cream-flats', sizes:['37','38','39','40'], colours:['Cream'], tags:['occasion','neutral','workwear'], stock_status:'in_stock', is_active:true },
  { id:'20000000-0000-4000-8000-000000000014', merchant_id:MID, name:'Tan Minimal Sandals', description:'Slim leather-look sandals with low heel and clean straps.', price:27000, currency:'NGN', category:'Shoes', primary_image_url:image('Tan Minimal Sandals','#d8c0aa'), product_url:'https://example.com/tan-sandals', sizes:['37','38','39','40','41'], colours:['Tan'], tags:['casual','occasion'], stock_status:'in_stock', is_active:true },
  { id:'20000000-0000-4000-8000-000000000015', merchant_id:MID, name:'Structured Cream Handbag', description:'Structured cream handbag with top handles, clean hardware and a polished medium-size silhouette.', price:38000, currency:'NGN', category:'Accessories', primary_image_url:image('Structured Cream Handbag','#ceb9aa'), product_url:'https://example.com/cream-handbag', sizes:['One size'], colours:['Cream'], tags:['workwear','classic'], stock_status:'in_stock', is_active:true },
  { id:'20000000-0000-4000-8000-000000000016', merchant_id:MID, name:'Fine Gold-Tone Hoops', description:'Small polished hoops designed for everyday styling.', price:12000, currency:'NGN', category:'Accessories', primary_image_url:image('Fine Gold-Tone Hoops','#e5dcc2'), product_url:'https://example.com/gold-hoops', sizes:['One size'], colours:['Gold'], tags:['minimal','occasion','everyday'], stock_status:'in_stock', is_active:true },
]


for (const product of demoProducts) {
  if (!product.try_on_category) {
    if (product.category === 'Blazers') product.try_on_category = 'outerwear'
    else if (product.category === 'Tops') product.try_on_category = 'top'
    else if (product.category === 'Bottoms') product.try_on_category = 'bottom'
    else if (product.category === 'Dresses') product.try_on_category = 'dress'
    else if (product.category === 'Shoes') product.try_on_category = 'shoes'
    else if (product.name.toLowerCase().includes('tote')) product.try_on_category = 'bag'
    else if (product.name.toLowerCase().includes('hoop')) product.try_on_category = 'earrings'
    else product.try_on_category = 'other_accessory'
  }
  product.reference_images = [{ url: product.primary_image_url, view: 'front' }]
  product.visual_description = `${product.name}. ${product.description}`
  product.generation_constraints = { preserveColour: true, preservePattern: true, preserveLogo: true }
}
