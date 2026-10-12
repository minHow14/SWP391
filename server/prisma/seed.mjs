import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing in server/.env');
const configuredDatabase = decodeURIComponent(new URL(process.env.DATABASE_URL).pathname.slice(1));
if (configuredDatabase !== 'vegetarian_db') throw new Error('This demo seed only supports vegetarian_db');
const db = new PrismaClient({ log: [] });
const MODELS = ['user', 'dietType', 'healthProfile', 'healthHistory', 'ingredient', 'userAllergy', 'category', 'post', 'video', 'blog', 'postCategory', 'comment', 'postVote', 'recipe', 'recipeIngredient', 'mealPlan', 'mealPlanDetail', 'foodDiary', 'restaurant', 'restaurantRecipe', 'report', 'notification', 'ai_logs'];
const dateString = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bangkok' }).format(new Date());
const today = new Date(`${dateString}T00:00:00Z`);
const offsetDate = (days) => new Date(today.getTime() + days * 86400000);
const asset = (path) => `http://localhost:5173/${path}`;

const dietData = [
  [1, 'Thuần chay (Vegan)', 'Thực vật; không thịt, cá, trứng, sữa, mật ong.'],
  [2, 'Chay có sữa (Lacto)', 'Thực vật và sản phẩm từ sữa.'],
  [3, 'Chay có trứng (Ovo)', 'Thực vật và trứng.'],
  [4, 'Chay trứng & sữa', 'Thực vật, trứng và sữa.'],
  [5, 'Chay Phật giáo', 'Ăn chay, tránh ngũ vị tân.'],
  [6, 'Tham khảo thêm', 'Chế độ khám phá nội dung tổng hợp.'],
];
const categoryNames = ['Món Kho', 'Salad & Gỏi', 'Súp & Lẩu', 'Món Xào/Chiên', 'Món Điểm Tâm', 'Kinh Nghiệm Ăn Chay', 'Hỏi Đáp Dinh Dưỡng', 'Mẹo Nhà Bếp', 'Review Quán Chay'];
const userData = [
  ['admin@chayxanh.local', 'Quản trị ChayXanh', 1, 'Admin@123456', 'ACTIVE'],
  ['user@chayxanh.local', 'Người dùng ChayXanh', 2, 'User@123456', 'ACTIVE'],
  ['minhanh@chayxanh.local', 'Nguyễn Minh Anh', 2, 'User@123456', 'ACTIVE'],
  ['hoangnam@chayxanh.local', 'Trần Hoàng Nam', 2, 'User@123456', 'ACTIVE'],
  ['ngoclinh@chayxanh.local', 'Lê Ngọc Linh', 2, 'User@123456', 'ACTIVE'],
  ['locked@chayxanh.local', 'Tài khoản demo bị khóa', 2, 'User@123456', 'LOCKED'],
];
// Nutrition values, addresses, ratings and content are illustrative demo data.
const ingredientData = [
  ['Đậu hũ', 76, 8, 4.8, 1.9], ['Nấm đùi gà', 33, 3.3, .4, 6.1],
  ['Nấm đông cô', 34, 2.2, .5, 6.8], ['Gạo lứt chín', 123, 2.7, 1, 25.6],
  ['Bún tươi', 110, 1.7, .2, 25], ['Cà chua', 18, .9, .2, 3.9],
  ['Cà rốt', 41, .9, .2, 9.6], ['Bông cải xanh', 34, 2.8, .4, 6.6],
  ['Rau bina', 23, 2.9, .4, 3.6], ['Hạt điều', 553, 18.2, 43.9, 30.2],
  ['Hạt óc chó', 654, 15.2, 65.2, 13.7], ['Quả bơ', 160, 2, 14.7, 8.5],
  ['Sữa đậu nành không đường', 33, 3.3, 1.8, 1.2], ['Trứng gà', 143, 12.6, 9.5, .7],
  ['Sữa tươi', 61, 3.2, 3.3, 4.8], ['Tàu hũ ky', 220, 25, 12, 5],
  ['Nước tương', 53, 8.1, .6, 4.9], ['Dầu ô liu', 884, 0, 100, 0],
  ['Táo', 52, .3, .2, 13.8], ['Yến mạch', 389, 16.9, 6.9, 66.3],
  ['Khoai lang', 86, 1.6, .1, 20.1], ['Hạt sen', 89, 4.1, .5, 17.3],
  ['Gelatin (E441)', 335, 85.6, .1, 0], ['Carmine (E120)', 0, 0, 0, 0],
];
const recipeData = [
  ['Đậu hũ kho nấm đông cô', 0, 1, 25, 320, [['Đậu hũ', 180], ['Nấm đông cô', 80], ['Nước tương', 10], ['Dầu ô liu', 5]], 'Cắt đậu hũ và nấm. Áp chảo đậu hũ, thêm nấm và nước tương. Kho nhỏ lửa 10 phút.'],
  ['Salad bơ và hạt óc chó', 1, 1, 15, 280, [['Quả bơ', 80], ['Rau bina', 80], ['Hạt óc chó', 15], ['Cà chua', 60]], 'Rửa rau, cắt bơ và cà chua. Trộn đều cùng hạt óc chó, thêm sốt theo khẩu vị.'],
  ['Bún riêu chay đậu hũ và nấm', 2, 1, 35, 420, [['Bún tươi', 200], ['Đậu hũ', 100], ['Cà chua', 100], ['Nấm đông cô', 50]], 'Nấu nước dùng nấm và cà chua. Thêm đậu hũ, nêm gia vị. Chan nước dùng lên bún.'],
  ['Cơm gạo lứt nấm đùi gà kho tộ', 0, 1, 35, 550, [['Gạo lứt chín', 250], ['Nấm đùi gà', 150], ['Đậu hũ', 100], ['Nước tương', 15]], 'Kho nấm với đậu hũ và nước tương. Dùng cùng cơm gạo lứt.'],
  ['Súp nấm rau củ', 2, 1, 25, 220, [['Nấm đông cô', 100], ['Cà rốt', 80], ['Bông cải xanh', 80], ['Đậu hũ', 100]], 'Cắt nhỏ nguyên liệu. Nấu rau củ, thêm nấm và đậu hũ. Nêm vừa ăn.'],
  ['Đậu hũ áp chảo rau củ', 3, 1, 20, 350, [['Đậu hũ', 200], ['Bông cải xanh', 100], ['Cà rốt', 70], ['Dầu ô liu', 8]], 'Áp chảo đậu hũ vàng hai mặt. Xào rau củ và trộn cùng đậu hũ.'],
  ['Yến mạch sữa đậu nành và táo', 4, 1, 10, 300, [['Yến mạch', 50], ['Sữa đậu nành không đường', 200], ['Táo', 100]], 'Nấu yến mạch với sữa đậu nành. Thêm táo cắt nhỏ khi dùng.'],
  ['Tàu hũ ky cuộn nấm', 3, 1, 30, 330, [['Tàu hũ ky', 100], ['Nấm đùi gà', 100], ['Cà rốt', 50]], 'Ngâm tàu hũ ky cho mềm. Cuộn nấm và cà rốt, hấp chín rồi áp chảo.'],
  ['Khoai lang hấp và sữa hạt', 4, 1, 20, 240, [['Khoai lang', 200], ['Sữa đậu nành không đường', 200]], 'Hấp khoai lang cho mềm. Dùng cùng sữa đậu nành.'],
  ['Cơm hạt sen rau củ', 0, 5, 30, 450, [['Gạo lứt chín', 200], ['Hạt sen', 100], ['Cà rốt', 80], ['Đậu hũ', 100]], 'Nấu hạt sen cho mềm. Xào cơm với rau củ, đậu hũ và hạt sen; không dùng ngũ vị tân.'],
  ['Trứng cuộn rau bina', 3, 3, 15, 260, [['Trứng gà', 100], ['Rau bina', 100], ['Dầu ô liu', 5]], 'Chần rau bina. Đánh trứng, thêm rau và cuộn trên chảo.'],
  ['Súp rau củ có sữa', 2, 2, 25, 290, [['Sữa tươi', 200], ['Cà rốt', 100], ['Bông cải xanh', 100], ['Khoai lang', 100]], 'Nấu rau củ cho mềm, xay mịn. Thêm sữa tươi và đun nhỏ lửa.'],
  ['Bánh yến mạch trứng và sữa', 4, 4, 30, 380, [['Yến mạch', 60], ['Trứng gà', 60], ['Sữa tươi', 100]], 'Trộn yến mạch, trứng và sữa. Nướng hoặc áp chảo đến khi chín.'],
];

async function ensure(tx, model, where, data) {
  return await tx[model].findFirst({ where }) || await tx[model].create({ data });
}
async function seed() {
  const hashes = new Map();
  for (const password of new Set(userData.map((user) => user[3]))) hashes.set(password, await bcrypt.hash(password, 10));
  await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(3912026)');
    const diets = new Map();
    for (const [id, name, description] of dietData) {
      const byId = await tx.dietType.findUnique({ where: { diet_type_id: id } });
      const byName = await tx.dietType.findUnique({ where: { name } });
      if ((byId && byId.name !== name) || (byName && byName.diet_type_id !== id)) throw new Error(`Diet ID ${id} differs from frontend constants; no data has been committed.`);
      diets.set(id, byId || await tx.dietType.create({ data: { diet_type_id: id, name, description } }));
    }
    const categories = [];
    for (const name of categoryNames) categories.push(await ensure(tx, 'category', { name }, { name }));
    const users = [];
    for (const [email, full_name, role, password, status] of userData) {
      const existing = await tx.user.findUnique({ where: { email } });
      if (existing && (existing.role !== role || existing.status !== status || !await bcrypt.compare(password, existing.password_hash))) throw new Error(`Existing demo account ${email} has different credentials or permissions; it was not modified.`);
      users.push(existing || await tx.user.create({ data: { email, full_name, role, status, password_hash: hashes.get(password) } }));
    }
    const ingredients = new Map();
    for (const [name, calories_per_100g, protein, fat, carbs] of ingredientData) ingredients.set(name, await ensure(tx, 'ingredient', { name }, { name, calories_per_100g, protein, fat, carbs }));
    for (let index = 0; index < 5; index++) {
      const user_id = users[index].user_id;
      const height = [172, 168, 160, 175, 165][index];
      const weight = [68, 60, 52, 72, 57][index];
      await ensure(tx, 'healthProfile', { user_id }, { user_id, diet_type_id: index + 1, height, weight, dob: new Date(`${[1995, 2003, 2001, 1999, 2002][index]}-05-15T00:00:00Z`), gender: index === 2 || index === 4 ? 'FEMALE' : 'MALE', health_goal: '[Demo] Theo dõi bữa ăn và cân nặng' });
      for (let day = 0; day < 7; day++) {
        const recorded_date = offsetDate(-day);
        const recordedWeight = Math.round((weight + day * .1) * 10) / 10;
        await ensure(tx, 'healthHistory', { user_id, recorded_date }, { user_id, recorded_date, weight: recordedWeight, bmi: Math.round(recordedWeight / (height / 100) ** 2 * 10) / 10 });
      }
    }
    for (const [userIndex, name] of [[2, 'Hạt điều'], [2, 'Hạt óc chó'], [3, 'Sữa tươi']]) {
      const user_id = users[userIndex].user_id;
      const ingredient_id = ingredients.get(name).ingredient_id;
      await ensure(tx, 'userAllergy', { user_id, ingredient_id }, { user_id, ingredient_id });
    }
    const recipes = [];
    for (let index = 0; index < recipeData.length; index++) {
      const [title, categoryIndex, dietId, prep_time, total_calories, parts, instructions] = recipeData[index];
      const recipe_name = `[Demo] ${title}`;
      let recipe = await tx.recipe.findFirst({ where: { recipe_name } });
      if (!recipe) {
        const post = await tx.post.create({ data: { author_id: users[1 + index % 4].user_id, post_type: 'RECIPE', status: 'PUBLISHED' } });
        recipe = await tx.recipe.create({ data: { recipe_name, post_id: post.post_id, category_id: categories[categoryIndex].category_id, diet_type_id: diets.get(dietId).diet_type_id, prep_time, total_calories, description: 'Công thức mẫu ChayXanh; năng lượng và khẩu phần dùng để thử giao diện.', instructions, image_url: asset(index % 2 ? 'demo-assets/chayxanh-bowl.webp' : 'demo-assets/mushroom-soup.webp') } });
      }
      recipes.push(recipe);
      for (const [name, quantity] of parts) {
        const ingredient_id = ingredients.get(name).ingredient_id;
        await ensure(tx, 'recipeIngredient', { recipe_id: recipe.recipe_id, ingredient_id }, { recipe_id: recipe.recipe_id, ingredient_id, quantity, unit: 'g' });
      }
      if (recipe.post_id) await ensure(tx, 'postCategory', { post_id: recipe.post_id, category_id: categories[categoryIndex].category_id }, { post_id: recipe.post_id, category_id: categories[categoryIndex].category_id });
    }
    const videos = [];
    for (const [index, title] of ['Hướng dẫn đậu hũ kho nấm', 'Chuẩn bị salad ngũ sắc', 'Nấu nước dùng nấm chay'].entries()) {
      let video = await tx.video.findFirst({ where: { title: `[Demo] ${title}` } });
      if (!video) {
        const post = await tx.post.create({ data: { author_id: users[index + 1].user_id, post_type: 'VIDEO', status: 'PUBLISHED', created_at: offsetDate(-index) } });
        video = await tx.video.create({ data: { post_id: post.post_id, title: `[Demo] ${title}`, video_url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', thumbnail_url: asset('demo-assets/chayxanh-bowl.webp'), duration: 5, transcript: 'Video hoa dùng để thử trình phát, không phải video hướng dẫn nấu ăn. Nội dung công thức mẫu: sơ chế, nấu chín, nêm gia vị và trình bày.' } });
      }
      videos.push(video);
      await ensure(tx, 'postCategory', { post_id: video.post_id, category_id: categories[7].category_id }, { post_id: video.post_id, category_id: categories[7].category_id });
    }
    const blogData = [
      ['Chuẩn bị bữa chay cho tuần mới', 5, 'Chủ nhật mình sơ chế rau, chuẩn bị đậu hũ và chia phần cơm. Đây là nội dung mẫu để thử bài viết, bình luận và tìm kiếm.', 'PUBLISHED'],
      ['Gợi ý nguồn đạm từ thực vật', 6, 'Mình thường kết hợp đậu, đậu hũ và các loại hạt trong bữa ăn. Bài viết minh họa chức năng cộng đồng.', 'PUBLISHED'],
      ['Mẹo áp chảo nấm đùi gà', 7, 'Cắt lát nấm, làm nóng chảo và đảo vừa đủ để giữ kết cấu. Công thức thử nghiệm trong demo.', 'PUBLISHED'],
      ['Trải nghiệm quán chay mẫu', 8, 'Tên quán, địa chỉ và nhận xét trong bài là dữ liệu giả lập, dùng để kiểm tra giao diện review.', 'PUBLISHED'],
      ['Bài viết đang soạn', 5, 'Bản nháp demo chưa xuất bản.', 'DRAFT'],
      ['Bài viết chờ duyệt', 5, 'Nội dung demo để thử chức năng duyệt bài của admin.', 'PENDING'],
    ];
    const blogs = [];
    for (let index = 0; index < blogData.length; index++) {
      const [title, categoryIndex, content, status] = blogData[index];
      let blog = await tx.blog.findFirst({ where: { title: `[Demo] ${title}` } });
      if (!blog) {
        const post = await tx.post.create({ data: { author_id: users[1 + index % 4].user_id, post_type: 'BLOG', status, created_at: offsetDate(-index) } });
        blog = await tx.blog.create({ data: { post_id: post.post_id, title: `[Demo] ${title}`, content, attached_video_id: index < 3 ? videos[index].post_id : null } });
      }
      blogs.push(blog);
      await ensure(tx, 'postCategory', { post_id: blog.post_id, category_id: categories[categoryIndex].category_id }, { post_id: blog.post_id, category_id: categories[categoryIndex].category_id });
    }
    const comments = [];
    for (let index = 0; index < 4; index++) {
      for (let userIndex = 2; userIndex <= 4; userIndex++) {
        const post_id = blogs[index].post_id;
        const user_id = users[userIndex].user_id;
        const content = `[Demo] ${users[userIndex].full_name}: Mình đã lưu bài viết, cảm ơn bạn đã chia sẻ!`;
        comments.push(await ensure(tx, 'comment', { post_id, user_id, content }, { post_id, user_id, content, status: 'ACTIVE', is_flagged_by_ai: false }));
        await ensure(tx, 'postVote', { post_id, user_id }, { post_id, user_id, vote_type: userIndex === 4 && index === 3 ? 'DOWNVOTE' : 'UPVOTE' });
      }
    }
    const restaurantData = [
      ['An Nhiên Garden', 'Khu vực Võ Văn Tần, Quận 3, TP.HCM', 10.777, 106.687, 1, 4.9],
      ['Bếp Chay Thanh Tịnh', 'Khu vực Nguyễn Huệ, Quận 1, TP.HCM', 10.773, 106.704, 5, 4.8],
      ['Lá Xanh Bistro', 'Khu vực Nguyễn Thị Diệu, Quận 3, TP.HCM', 10.78, 106.689, 1, 4.7],
      ['Mộc Vegetarian', 'Khu vực Trần Hưng Đạo, Hoàn Kiếm, Hà Nội', 21.019, 105.845, 2, 4.6],
      ['Góc Thực Vật', 'Khu vực Xã Đàn, Đống Đa, Hà Nội', 21.009, 105.831, 1, 4.7],
    ];
    for (let index = 0; index < restaurantData.length; index++) {
      const [title, address, latitude, longitude, diet_type_id, rating] = restaurantData[index];
      const restaurant = await ensure(tx, 'restaurant', { name: `[Demo] ${title}` }, { name: `[Demo] ${title}`, address: `[Minh họa] ${address}`, latitude, longitude, diet_type_id, rating, phone: null, image_url: asset('demo-assets/chayxanh-bowl.webp') });
      const menu = recipes.filter((recipe) => recipe.diet_type_id === 1 || recipe.diet_type_id === diet_type_id || recipe.diet_type_id === 5).slice(0, 4);
      for (const recipe of menu) await ensure(tx, 'restaurantRecipe', { restaurant_id: restaurant.restaurant_id, recipe_id: recipe.recipe_id }, { restaurant_id: restaurant.restaurant_id, recipe_id: recipe.recipe_id });
    }
    const meals = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
    const snackNames = ['[Demo] Táo và sữa đậu nành', '[Demo] Khoai lang hấp', '[Demo] Hạt điều rang'];
    for (let userIndex = 1; userIndex <= 4; userIndex++) {
      const user_id = users[userIndex].user_id;
      const allowedDiets = { 1: [1, 2, 5], 2: [1, 3, 5], 3: [1, 2, 3, 4, 5], 4: [1, 5] }[userIndex];
      const allergies = userIndex === 2 ? ['Hạt điều', 'Hạt óc chó'] : userIndex === 3 ? ['Sữa tươi'] : [];
      const allowedRecipes = recipes.filter((recipe, index) => allowedDiets.includes(recipe.diet_type_id) && recipeData[index][5].every(([name]) => !allergies.includes(name)));
      const allowedSnacks = userIndex === 2 ? snackNames.slice(0, 2) : snackNames;
      for (let day = 0; day < 7; day++) {
        for (let mealIndex = 0; mealIndex < meals.length; mealIndex++) {
          const recipe = allowedRecipes[(day + mealIndex + userIndex) % allowedRecipes.length];
          const custom_food_name = mealIndex === 3 ? allowedSnacks[day % allowedSnacks.length] : null;
          const consumed_date = offsetDate(-day);
          const meal_type = meals[mealIndex];
          await ensure(tx, 'foodDiary', { user_id, consumed_date, meal_type, recipe_id: mealIndex === 3 ? null : recipe.recipe_id, custom_food_name }, { user_id, consumed_date, meal_type, recipe_id: mealIndex === 3 ? null : recipe.recipe_id, custom_food_name, calories: mealIndex === 3 ? 180 : recipe.total_calories });
        }
      }
      const start_date = offsetDate(1);
      const end_date = offsetDate(7);
      const title = `[Demo] Thực đơn tuần ${dateString}`;
      const plan = await ensure(tx, 'mealPlan', { user_id, title }, { user_id, title, start_date, end_date, target_calories: 1850 });
      for (let day = 1; day <= 7; day++) {
        for (let mealIndex = 0; mealIndex < meals.length; mealIndex++) {
          const meal_type = meals[mealIndex];
          await ensure(tx, 'mealPlanDetail', { plan_id: plan.plan_id, day_of_week: day, meal_type }, { plan_id: plan.plan_id, day_of_week: day, meal_type, recipe_id: allowedRecipes[(day + mealIndex + userIndex) % allowedRecipes.length].recipe_id });
        }
      }
      for (const [index, content] of ['Chào mừng bạn đến với ChayXanh.', 'Kế hoạch tuần mẫu đã sẵn sàng.', 'Bạn có phản hồi mới trong cộng đồng.'].entries()) await ensure(tx, 'notification', { user_id, content: `[Demo] ${content}` }, { user_id, content: `[Demo] ${content}`, is_read: index === 0 });
    }
    await ensure(tx, 'report', { reporter_id: users[2].user_id, post_id: blogs[3].post_id, reason: '[Demo] Cần xác minh thông tin địa điểm.' }, { reporter_id: users[2].user_id, post_id: blogs[3].post_id, reason: '[Demo] Cần xác minh thông tin địa điểm.', status: 'PENDING' });
    await ensure(tx, 'report', { reporter_id: users[3].user_id, comment_id: comments[0].comment_id, reason: '[Demo] Báo cáo kiểm thử đã xử lý.' }, { reporter_id: users[3].user_id, comment_id: comments[0].comment_id, reason: '[Demo] Báo cáo kiểm thử đã xử lý.', status: 'RESOLVED' });
    await ensure(tx, 'report', { reporter_id: users[4].user_id, post_id: blogs[0].post_id, reason: '[Demo] Báo cáo kiểm thử bị từ chối.' }, { reporter_id: users[4].user_id, post_id: blogs[0].post_id, reason: '[Demo] Báo cáo kiểm thử bị từ chối.', status: 'REJECTED' });
    for (const [action, status, error_feedback] of [['CHAT_DEMO', 'SUCCESS', null], ['MEAL_PLAN_DEMO', 'SUCCESS', null], ['MODEL_FALLBACK_DEMO', 'ERROR', 'Lỗi giả lập để thử giao diện log.'], ['ADMIN_CACHE_DEMO', 'SUCCESS', null]]) await ensure(tx, 'ai_logs', { model_name: 'demo-model', action }, { model_name: 'demo-model', action, status, error_feedback });
    // Explicit diet IDs must advance their serial sequence before future inserts.
    await tx.$executeRawUnsafe("SELECT setval(pg_get_serial_sequence('public.diet_types', 'diet_type_id'), (SELECT MAX(diet_type_id) FROM public.diet_types), true)");
  }, { maxWait: 10000, timeout: 120000 });
}

async function verify() {
  const counts = {};
  for (const model of MODELS) counts[model] = await db[model].count();
  const credentials = [];
  for (const [email, , role, password, status] of userData) {
    const user = await db.user.findUnique({ where: { email } });
    credentials.push({ email, role, status, passwordMatches: Boolean(user && user.role === role && user.status === status && await bcrypt.compare(password, user.password_hash)) });
  }
  const recipes = await db.recipe.findMany({ where: { recipe_name: { startsWith: '[Demo]' } }, include: { recipe_ingredients: true, post: true, diet_type: true } });
  const plans = await db.mealPlan.findMany({ where: { title: { startsWith: '[Demo]' } }, include: { details: true } });
  const checks = {
    allTablesPopulated: MODELS.every((model) => counts[model] > 0),
    allDemoPasswordsMatch: credentials.every((user) => user.passwordMatches),
    recipesLinked: recipes.length >= recipeData.length && recipes.every((recipe) => recipe.recipe_ingredients.length > 0 && recipe.post?.post_type === 'RECIPE' && recipe.diet_type),
    weeklyPlansComplete: plans.length >= 4 && plans.every((plan) => plan.details.length === 28 && new Set(plan.details.map((detail) => `${detail.day_of_week}-${detail.meal_type}`)).size === 28),
  };
  console.log(JSON.stringify({ database: configuredDatabase, date: dateString, counts, credentials, checks }, null, 2));
  if (Object.values(checks).some((passed) => !passed)) throw new Error('Verification failed');
}
try {
  if (!process.argv.includes('--verify')) await seed();
  await verify();
} catch (error) {
  console.error('Database seed/verify failed:', error.code || error.name, error.message.replaceAll(process.env.DATABASE_URL, '[connection hidden]'));
  process.exitCode = 1;
} finally { await db.$disconnect(); }
