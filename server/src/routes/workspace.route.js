import { Router } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { asyncHandler } from '../middlewares/asyncMiddleware.js';
import { ApiError } from '../utils/apiError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { sendIngredientImage } from '../services/ingredientImages.service.js';

const router=Router();
const id=z.coerce.number().int().positive();
const text=(max)=>z.string().trim().min(1).max(max);
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>!Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s);
const mealType=z.enum(['BREAKFAST','LUNCH','DINNER','SNACK']);
const parse=(schema,value)=>{const result=schema.safeParse(value);if(!result.success)throw ApiError.badRequest('Dữ liệu không hợp lệ',result.error.issues);return result.data;};
const handle=(fn)=>asyncHandler(async(req,res)=>sendSuccess(res,{data:await fn(req)}));

export async function loadCatalog() {
  const [diets,categories,ingredients,details,swaps,recipes,posts,restaurants,placeDetails,reviews,prices]=await Promise.all([
    prisma.dietType.findMany({orderBy:{diet_type_id:'asc'}}),prisma.category.findMany({orderBy:{category_id:'asc'}}),prisma.ingredient.findMany({orderBy:{ingredient_id:'asc'}}),
    prisma.$queryRaw`SELECT * FROM ingredient_details`,prisma.$queryRaw`SELECT * FROM ingredient_alternatives ORDER BY id`,
    prisma.recipe.findMany({where:{OR:[{post_id:null},{post:{status:'PUBLISHED'}}]},include:{recipe_ingredients:{include:{ingredient:true}}}}),
    prisma.post.findMany({where:{status:'PUBLISHED',post_type:{in:['BLOG','VIDEO']}},orderBy:{created_at:'desc'},include:{author:{select:{user_id:true,full_name:true}},blog:true,video:true,post_categories:true,comments:{where:{status:'ACTIVE'},include:{user:{select:{full_name:true}}}},post_votes:true}}),
    prisma.restaurant.findMany({include:{restaurant_recipes:{include:{recipe:true}}}}),prisma.$queryRaw`SELECT * FROM restaurant_details`,
    prisma.$queryRaw`SELECT r.review_id,r.restaurant_id,r.stars,r.content,r.created_at,u.full_name FROM restaurant_reviews r JOIN users u USING(user_id) ORDER BY r.created_at DESC`,
    prisma.$queryRaw`SELECT * FROM restaurant_menu_prices`
  ]);
  // Vegan recipes may contain alliums, so do not infer Buddhist compatibility.
  // Keto and Eat Clean labels require explicit classification in the database.
  const compat={1:[1,2,3,4],2:[2,4],3:[3,4],4:[4],5:[5]};
  return {
    diets,categories,swaps,
    ingredients:ingredients.map(i=>{const d=details.find(d=>d.ingredient_id===i.ingredient_id);return {...i,...d,id:String(i.ingredient_id),category:d?.category||'other',origin:d?.origin||'Chưa cập nhật',plant:d?.plant??null,description:d?.description||'',cooking:d?.cooking||'',aliases:d?.aliases||'',image:d?.image_url};}),
    recipes:recipes.map(r=>({...r,image:r.image_url,ingredients:r.recipe_ingredients.map(p=>`${p.quantity} ${p.unit} ${p.ingredient.name}`),compatible_diet_type_ids:compat[r.diet_type_id]||(r.diet_type_id?[r.diet_type_id]:[]),nutrition:r.recipe_ingredients.reduce((sum,p)=>{for(const field of ['protein','carbs','fat'])sum[field]+=(p.ingredient[field]||0)*p.quantity/100;return sum;},{protein:0,carbs:0,fat:0,fiber:0})})),
    posts:posts.filter(p=>p.blog||p.video).map(p=>({...p,...p.blog,...p.video,author_full_name:p.author.full_name,initials:p.author.full_name.split(' ').slice(-2).map(s=>s[0]).join(''),category_id:p.post_categories[0]?.category_id||null,content:p.blog?.content||p.video?.transcript||'',image:p.video?.thumbnail_url||null,vote_count:p.post_votes.reduce((sum,v)=>sum+(v.vote_type==='UPVOTE'?1:-1),0),comments:p.comments.map(c=>({...c,user_full_name:c.user.full_name}))})),
    restaurants:restaurants.map(p=>{const d=placeDetails.find(d=>d.restaurant_id===p.restaurant_id);return {...p,id:p.restaurant_id,latitude:p.latitude===null?null:Number(p.latitude),longitude:p.longitude===null?null:Number(p.longitude),type:p.diet_type_id===5?'buddhist':p.diet_type_id===1?'vegan':'separate',city:d?.city||'Chưa cập nhật',hours:d?.hours||'Chưa cập nhật',price_range:d?.price_range||'Chưa cập nhật',price:d?.price_range||'',separate:d?.separate_kitchen??null,image:p.image_url,dishes:p.restaurant_recipes.map(link=>link.recipe.recipe_name).join(', '),menu:p.restaurant_recipes.map(link=>({name:link.recipe.recipe_name,recipe_id:link.recipe_id,price:prices.find(price=>price.restaurant_id===p.restaurant_id&&price.recipe_id===link.recipe_id)?.price??null})),reviews:reviews.filter(r=>r.restaurant_id===p.restaurant_id).map(r=>({id:r.review_id,name:r.full_name,stars:r.stars,text:r.content,date:r.created_at})),rating:p.rating};})
  };
}
router.get('/catalog',handle(loadCatalog));
router.get('/ingredients/:id/image', asyncHandler(sendIngredientImage));

router.use(authenticate);
router.get('/mine',handle(req=>prisma.blog.findMany({where:{post:{author_id:req.user.user_id,status:{not:'DELETED'}}},include:{post:{include:{post_categories:true}},attached_video:true}})));
router.get('/journal',handle(async req=>{
  const user_id=req.user.user_id;
  const [profile,prefs,days,nutrients,plans]=await Promise.all([prisma.healthProfile.findUnique({where:{user_id}}),prisma.$queryRaw`SELECT * FROM profile_preferences WHERE user_id=${user_id}`,prisma.foodDiary.findMany({where:{user_id},include:{recipe:true},orderBy:{consumed_date:'desc'}}),prisma.$queryRaw`SELECT n.* FROM diary_nutrients n JOIN food_diaries d USING(diary_id) WHERE d.user_id=${user_id}`,prisma.mealPlan.findMany({where:{user_id},include:{details:true}})]);
  const journal={profile:profile?{height:profile.height,weight:profile.weight,calorieGoal:prefs[0]?.calorie_goal||0,goal:prefs[0]?.goal||profile.health_goal||'Theo dõi',macroGoals:{protein:prefs[0]?.protein_goal||0,carbs:prefs[0]?.carbs_goal||0,fat:prefs[0]?.fat_goal||0,fiber:prefs[0]?.fiber_goal||0}}:null,days:{},plans:{}};
  const groups={BREAKFAST:'breakfast',LUNCH:'lunch',DINNER:'dinner',SNACK:'snack'};
  for(const d of days){const key=d.consumed_date?.toISOString().slice(0,10);if(!key)continue;const n=nutrients.find(n=>n.diary_id===d.diary_id);(journal.days[key]??=[]).push({id:d.diary_id,name:d.recipe?.recipe_name||d.custom_food_name||'Món ăn',group:groups[d.meal_type],calories:d.calories||0,serving:n?.serving||'',protein:n?.protein||0,carbs:n?.carbs||0,fat:n?.fat||0,fiber:n?.fiber||0});}
  for(const plan of plans)for(const detail of plan.details){const day=new Date(plan.start_date);day.setUTCDate(day.getUTCDate()+detail.day_of_week-1);const key=day.toISOString().slice(0,10);(journal.plans[key]??={})[groups[detail.meal_type]]=detail.recipe_id?String(detail.recipe_id):'';}
  return journal;
}));
router.patch('/profile',handle(async req=>{
  const data=parse(z.object({height:z.number().min(50).max(250),weight:z.number().min(10).max(400),calorieGoal:z.number().positive().max(10000),goal:text(255)}).strict(),req.body);
  const user_id=req.user.user_id;
  await prisma.$transaction(async tx=>{await tx.healthProfile.upsert({where:{user_id},create:{user_id,height:data.height,weight:data.weight,health_goal:data.goal},update:{height:data.height,weight:data.weight,health_goal:data.goal}});await tx.$executeRaw`INSERT INTO profile_preferences(user_id,calorie_goal,goal) VALUES(${user_id},${data.calorieGoal},${data.goal}) ON CONFLICT(user_id) DO UPDATE SET calorie_goal=EXCLUDED.calorie_goal,goal=EXCLUDED.goal`;});
  return {saved:true};
}));
router.post('/diary',handle(async req=>{
  const data=parse(z.object({date,group:mealType,name:text(255),serving:text(100),recipe_id:id.optional(),calories:z.number().min(0).max(10000),protein:z.number().min(0).max(1000),carbs:z.number().min(0).max(1000),fat:z.number().min(0).max(1000),fiber:z.number().min(0).max(1000)}).strict(),req.body);
  return prisma.$transaction(async tx=>{if(data.recipe_id && !await tx.recipe.findUnique({where:{recipe_id:data.recipe_id}}))throw ApiError.notFound('Không tìm thấy công thức');const entry=await tx.foodDiary.create({data:{user_id:req.user.user_id,consumed_date:new Date(data.date),meal_type:data.group,custom_food_name:data.name,recipe_id:data.recipe_id||null,calories:data.calories}});await tx.$executeRaw`INSERT INTO diary_nutrients(diary_id,serving,protein,carbs,fat,fiber) VALUES(${entry.diary_id},${data.serving},${data.protein},${data.carbs},${data.fat},${data.fiber})`;return entry;});
}));
router.delete('/diary/:id',handle(async req=>{const diary_id=parse(id,req.params.id);const result=await prisma.foodDiary.deleteMany({where:{diary_id,user_id:req.user.user_id}});if(!result.count)throw ApiError.notFound('Không tìm thấy nhật ký của bạn');return {deleted:true};}));
router.put('/plan',handle(async req=>{
  const data=parse(z.object({date,group:mealType,recipe_id:id.nullable()}).strict(),req.body);
  return prisma.$transaction(async tx=>{if(data.recipe_id&&!await tx.recipe.findUnique({where:{recipe_id:data.recipe_id}}))throw ApiError.notFound('Không tìm thấy công thức');const day=new Date(data.date);const monday=new Date(day);monday.setUTCDate(day.getUTCDate()-(day.getUTCDay()+6)%7);const end=new Date(monday);end.setUTCDate(end.getUTCDate()+6);let plan=await tx.mealPlan.findFirst({where:{user_id:req.user.user_id,start_date:monday}});if(!plan)plan=await tx.mealPlan.create({data:{user_id:req.user.user_id,start_date:monday,end_date:end,title:`Thực đơn tuần ${monday.toISOString().slice(0,10)}`}});const day_of_week=(day.getUTCDay()+6)%7+1;const where={plan_id:plan.plan_id,day_of_week,meal_type:data.group};await tx.mealPlanDetail.deleteMany({where});if(data.recipe_id)await tx.mealPlanDetail.create({data:{...where,recipe_id:data.recipe_id}});return {saved:true};});
}));
router.post('/plan/record',handle(async req=>{
  const data=parse(z.object({date}).strict(),req.body);
  return prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${req.user.user_id}::integer, hashtext(${data.date}))`;
    const day=new Date(data.date);
    if(await tx.foodDiary.count({where:{user_id:req.user.user_id,consumed_date:day}}))throw ApiError.conflict('Ngày này đã có nhật ký.');
    const plans=await tx.mealPlan.findMany({where:{user_id:req.user.user_id,start_date:{lte:day},end_date:{gte:day}},orderBy:{plan_id:'desc'},include:{details:{include:{recipe:{include:{recipe_ingredients:{include:{ingredient:true}}}}}}}});
    const meals=new Map();
    for(const plan of plans){const offset=Math.round((day-plan.start_date)/86400000)+1;for(const detail of plan.details.filter(d=>d.day_of_week===offset&&d.recipe)){if(!meals.has(detail.meal_type))meals.set(detail.meal_type,detail.recipe);}}
    if(!meals.size)throw ApiError.badRequest('Ngày này chưa có món trong kế hoạch.');
    for(const [meal_type,recipe] of meals){const entry=await tx.foodDiary.create({data:{user_id:req.user.user_id,consumed_date:day,meal_type,recipe_id:recipe.recipe_id,calories:recipe.total_calories}});const n={protein:0,carbs:0,fat:0};for(const part of recipe.recipe_ingredients)for(const field of Object.keys(n))n[field]+=(part.ingredient[field]||0)*part.quantity/100;await tx.$executeRaw`INSERT INTO diary_nutrients(diary_id,serving,protein,carbs,fat) VALUES(${entry.diary_id},${'1 phần'},${n.protein},${n.carbs},${n.fat})`;}
    return {saved:true};
  });
}));
router.post('/restaurants',handle(req=>{const data=parse(z.object({name:text(255),address:text(255),city:text(100),diet_type_id:id,latitude:z.number().min(-90).max(90).nullable(),longitude:z.number().min(-180).max(180).nullable()}).strict(),req.body);return prisma.$transaction(async tx=>{if(!await tx.dietType.findUnique({where:{diet_type_id:data.diet_type_id}}))throw ApiError.badRequest('Chế độ ăn không hợp lệ');const place=await tx.restaurant.create({data:{name:data.name,address:data.address,diet_type_id:data.diet_type_id,latitude:data.latitude,longitude:data.longitude,rating:null}});await tx.$executeRaw`INSERT INTO restaurant_details(restaurant_id,city) VALUES(${place.restaurant_id},${data.city})`;return place;});}));
router.post('/restaurants/:id/reviews',handle(async req=>{const restaurant_id=parse(id,req.params.id);const data=parse(z.object({stars:z.number().int().min(1).max(5),text:text(1000)}).strict(),req.body);return prisma.$transaction(async tx=>{if(!await tx.restaurant.findUnique({where:{restaurant_id}}))throw ApiError.notFound('Quán không tồn tại');await tx.$executeRaw`INSERT INTO restaurant_reviews(restaurant_id,user_id,stars,content) VALUES(${restaurant_id},${req.user.user_id},${data.stars},${data.text})`;const avg=await tx.$queryRaw`SELECT AVG(stars)::real AS rating FROM restaurant_reviews WHERE restaurant_id=${restaurant_id}`;await tx.restaurant.update({where:{restaurant_id},data:{rating:avg[0].rating}});return {saved:true};});}));
export default router;
