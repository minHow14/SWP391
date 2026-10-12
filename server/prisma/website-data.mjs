import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { foodSwaps } from './fixtures/foodSwaps.mjs';
import { ingredients as knowledge } from './fixtures/ingredients.mjs';
dotenv.config({path: fileURLToPath(new URL('../.env', import.meta.url)),quiet:true});
if(new URL(process.env.DATABASE_URL).pathname !== '/vegetarian_db') throw new Error('Expected vegetarian_db');
const db = new PrismaClient({log:[]});
try {
  const ddl=await readFile(new URL('./website-data.sql',import.meta.url),'utf8');
  await db.$transaction(async tx=>{
    for(const statement of ddl.split(';').map(s=>s.trim()).filter(s=>s && !['BEGIN','COMMIT'].includes(s))) await tx.$executeRawUnsafe(statement);
    for(const item of foodSwaps) await tx.$executeRaw`INSERT INTO ingredient_alternatives(id,chip,emoji,original,role,alternatives,description,keywords) VALUES(${item.id},${item.chip},${item.emoji},${item.original},${item.role},${JSON.stringify(item.alternatives)}::jsonb,${item.description},${item.keywords}) ON CONFLICT DO NOTHING`;
    const all=await tx.ingredient.findMany();
    const matches={'Đậu hũ':'tofu','Tàu hũ ky':'yuba','Nấm đùi gà':'king-oyster','Nấm đông cô':'shiitake','Gelatin (E441)':'gelatin','Carmine (E120)':'carmine','Hạt điều':'cashew','Rau bina':'spinach'};
    for(const ingredient of all) {
      const item=knowledge.find(k=>k.id===matches[ingredient.name])||{category:'other',origin:/Trứng|^Sữa tươi/.test(ingredient.name)?'Động vật':'Thực vật',plant:!/Trứng|^Sữa tươi/.test(ingredient.name),description:`${ingredient.name}. Thông tin dinh dưỡng trên 100g được lưu trong database; kiểm tra thêm thành phần của sản phẩm chế biến sẵn.`,cooking:'Chế biến theo công thức và hướng dẫn của sản phẩm.',aliases:ingredient.name,image:null};
      await tx.$executeRaw`INSERT INTO ingredient_details(ingredient_id,category,origin,plant,description,cooking,aliases,image_url) VALUES(${ingredient.ingredient_id},${item.category},${item.origin},${item.plant},${item.description},${item.cooking},${item.aliases},${item.image||null}) ON CONFLICT DO NOTHING`;
    }
    const places=await tx.restaurant.findMany();
    const users=await tx.user.findMany({where:{email:{in:['minhanh@chayxanh.local','hoangnam@chayxanh.local']}}});
    for(const place of places) {
      const links=await tx.restaurantRecipe.findMany({where:{restaurant_id:place.restaurant_id},orderBy:{recipe_id:'asc'}});
      for(const [index,link] of links.entries()) await tx.$executeRaw`INSERT INTO restaurant_menu_prices(restaurant_id,recipe_id,price) VALUES(${place.restaurant_id},${link.recipe_id},${[145000,120000,95000,80000][index%4]}) ON CONFLICT DO NOTHING`;
      await tx.$executeRaw`INSERT INTO restaurant_details(restaurant_id,city,hours,price_range,separate_kitchen) VALUES(${place.restaurant_id},${place.address.includes('Hà Nội')?'Hà Nội':'TP.HCM'},${'09:00 – 21:00'},${'80.000đ – 150.000đ'},${true}) ON CONFLICT DO NOTHING`;
      if(place.name.startsWith('[Demo]')) for(const user of users) {
        const content='[Demo] Không gian ấm cúng, thực đơn đa dạng. Nhận xét mẫu được lưu trong database.';
        await tx.$executeRaw`INSERT INTO restaurant_reviews(restaurant_id,user_id,stars,content) SELECT ${place.restaurant_id},${user.user_id},5,${content} WHERE NOT EXISTS(SELECT 1 FROM restaurant_reviews WHERE restaurant_id=${place.restaurant_id} AND user_id=${user.user_id} AND content=${content})`;
      }
    }
    for(const profile of await tx.healthProfile.findMany()) await tx.$executeRaw`INSERT INTO profile_preferences(user_id,calorie_goal,goal) VALUES(${profile.user_id},1850,${'Duy trì'}) ON CONFLICT DO NOTHING`;
    const diaries=await tx.foodDiary.findMany({include:{recipe:{include:{recipe_ingredients:{include:{ingredient:true}}}}}});
    for(const diary of diaries) {
      const nutrients={protein:0,carbs:0,fat:0};
      for(const part of diary.recipe?.recipe_ingredients||[]) for(const field of Object.keys(nutrients)) nutrients[field]+=Number(part.ingredient[field]||0)*part.quantity/100;
      await tx.$executeRaw`INSERT INTO diary_nutrients(diary_id,serving,protein,carbs,fat) VALUES(${diary.diary_id},${'1 phần'},${nutrients.protein},${nutrients.carbs},${nutrients.fat}) ON CONFLICT DO NOTHING`;
    }
  },{timeout:120000});
  console.log('Website metadata and persisted reviews/nutrition are ready. Existing records preserved.');
} finally {await db.$disconnect();}
