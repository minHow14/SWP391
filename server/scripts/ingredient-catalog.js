// d:\Projects\FPT\SWP391\server\scripts\ingredient-catalog.js
// Seed content and photo sources. The cache path is used only when importing photos into PostgreSQL.
const rows = [
  ['Đậu hũ non', 'protein', 'Thực vật', 'silken-tofu', 'Japanese SilkyTofu (Kinugoshi Tofu).JPG', 'Đậu hũ mềm làm từ đậu nành, có vị thanh và kết cấu mịn.', 'Dùng trong canh, hấp hoặc sốt; cho vào cuối quá trình nấu để hạn chế vỡ.', 'tofu silken tofu đậu phụ'],
  ['Đậu hũ chiên', 'protein', 'Thực vật', 'fried-tofu', 'Twice fried tofu.jpg', 'Đậu hũ được chiên tạo lớp vỏ vàng, bên trong vẫn mềm.', 'Dùng để kho, xào, nhồi rau củ hoặc nấu với sốt.', 'fried tofu đậu phụ chiên'],
  ['Nấm đông cô tươi', 'mushroom', 'Nấm', 'shiitake', 'Shiitakegrowing.jpg', 'Nấm có mũ nâu, hương thơm đặc trưng và kết cấu chắc.', 'Làm sạch, bỏ phần chân già; dùng trong món xào, canh hoặc kho.', 'shiitake nấm hương'],
  ['Nấm rơm', 'mushroom', 'Nấm', 'straw-mushroom', 'StrawMushroom.jpg', 'Nấm nhỏ có dạng búp tròn, thường dùng trong các món chay Việt Nam.', 'Làm sạch rồi nấu chín trong canh, cháo, món xào hoặc kho.', 'straw mushroom'],
  ['Nấm đùi gà', 'mushroom', 'Nấm', 'king-oyster', 'Seta de cardo (Pleurotus eryngii), 2012-10-03, DD 01.JPG', 'Thân nấm dày, kết cấu dai giòn, thích hợp áp chảo hoặc xé sợi.', 'Cắt lát dọc để áp chảo hoặc xé sợi rồi xào với rau củ.', 'king oyster mushroom pleurotus eryngii'],
  ['Nấm mỡ', 'mushroom', 'Nấm', 'button-mushroom', 'ChampignonMushroom.jpg', 'Nấm có mũ tròn màu trắng hoặc nâu, vị nhẹ và dễ kết hợp.', 'Dùng trong súp, món xào, mì hoặc nướng cùng rau củ.', 'button mushroom champignon'],
  ['Hạt sen tươi luộc', 'vegetable', 'Thực vật', 'lotus-seed', 'White lotus seeds.jpg', 'Hạt sen có vị bùi và kết cấu mềm sau khi nấu chín.', 'Dùng trong canh, cháo, cơm hoặc chè; ảnh minh họa hạt sen trước khi chế biến.', 'lotus seed'],
  ['Quả bơ sáp', 'vegetable', 'Thực vật', 'avocado', 'Persea americana fruit 2.JPG', 'Quả bơ có phần thịt mềm, béo và hương vị nhẹ.', 'Dùng trong salad, sinh tố hoặc nghiền để phết bánh mì.', 'avocado'],
  ['Rau xà lách tươi', 'vegetable', 'Thực vật', 'lettuce', 'Iceberg lettuce in SB.jpg', 'Rau lá giòn, vị thanh, thường dùng trong salad và món cuốn.', 'Rửa sạch từng lá, để ráo rồi dùng trong salad hoặc ăn kèm.', 'lettuce salad'],
  ['Cà chua tươi', 'vegetable', 'Thực vật', 'tomato', 'Tomato je.jpg', 'Quả cà chua có vị chua ngọt, dùng được trong nhiều món chay.', 'Dùng trong salad, canh, món xào hoặc nấu sốt.', 'tomato'],
  ['Hạt óc chó', 'vegetable', 'Thực vật', 'walnut', 'Walnuts - whole and open with halved kernel.jpg', 'Hạt có nhân nhiều nếp gấp, vị bùi và thơm.', 'Thêm vào salad, yến mạch, bánh hoặc xay làm sốt.', 'walnut'],
  ['Hạt hạnh nhân', 'vegetable', 'Thực vật', 'almond', 'Almonds - in shell, shell cracked open, shelled, blanched.jpg', 'Hạt có dạng thuôn, vỏ nâu và nhân giòn.', 'Dùng làm món ăn nhẹ, thêm vào bánh hoặc xay làm đồ uống.', 'almond'],
  ['Yến mạch nguyên cám', 'vegetable', 'Thực vật', 'oats', 'AvenaSativa3.jpg', 'Ngũ cốc dùng trong cháo, bánh và các món ăn sáng; ảnh minh họa cây yến mạch.', 'Nấu theo dạng hạt hoặc cán được ghi trên bao bì; kết hợp với trái cây và hạt.', 'oat oats oatmeal'],
  ['Sữa đậu nành không đường', 'protein', 'Thực vật', 'soy-milk', '004-soymilk.jpg', 'Đồ uống làm từ đậu nành, có thể dùng thay sữa động vật trong nhiều công thức.', 'Dùng trực tiếp, làm sinh tố hoặc nấu món ăn; kiểm tra thành phần trên nhãn.', 'soy milk soymilk'],
  ['Sữa tươi thanh trùng', 'other', 'Động vật', 'milk', 'Glass of Milk (33657535532).jpg', 'Sữa có nguồn gốc động vật, cần đối chiếu với chế độ ăn chay đang áp dụng.', 'Dùng trong đồ uống và món ăn phù hợp; có thể thay bằng sữa thực vật.', 'dairy milk'],
  ['Phô mai Mozzarella', 'other', 'Động vật', 'mozzarella', 'Mozzarella di bufala3.jpg', 'Phô mai làm từ sữa động vật. Kiểm tra loại men đông sữa trên nhãn sản phẩm.', 'Dùng cho pizza hoặc món nướng; chọn phiên bản thực vật nếu ăn thuần chay.', 'cheese mozzarella phô mai'],
  ['Trứng gà ta', 'other', 'Động vật', 'eggs', '6-Pack-Chicken-Eggs.jpg', 'Trứng có nguồn gốc động vật, phù hợp hay không tùy chế độ ăn được chọn.', 'Nấu chín; trong một số công thức có thể dùng đậu hũ hoặc nguyên liệu thay thế.', 'egg eggs trứng'],
  ['Hành boa-rô', 'vegetable', 'Thực vật', 'leek', 'Leek on white background - 0947.jpg', 'Rau thuộc họ hành, có thân trắng và lá xanh, thường dùng tạo hương vị.', 'Rửa sạch các lớp lá, thái mỏng để xào hoặc nấu canh; kiểm tra quy tắc về ngũ vị tân nếu áp dụng.', 'leek tỏi tây hành baro'],
  ['Dầu olive nguyên chất', 'vegetable', 'Thực vật', 'olive-oil', 'Oliven V1.jpg', 'Dầu thực vật được chiết xuất từ quả ô liu.', 'Dùng để trộn salad, làm sốt hoặc chế biến theo hướng dẫn trên bao bì.', 'olive oil dầu ô liu'],
  ['Bánh mì nguyên cám', 'vegetable', 'Thực vật', 'whole-wheat-bread', 'Vegan no-knead whole wheat bread loaf, September 2010.jpg', 'Bánh mì làm từ bột ngũ cốc nguyên cám. Sản phẩm chế biến sẵn có thể thêm sữa hoặc trứng.', 'Dùng cho sandwich hoặc ăn kèm súp; kiểm tra thành phần trên nhãn.', 'whole wheat bread wholemeal'],
  ['Rong biển khô', 'vegetable', 'Thực vật', 'seaweed', 'Nori.jpg', 'Rong biển đã làm khô, có hương vị đặc trưng của biển.', 'Dùng để cuốn cơm hoặc nấu canh theo hướng dẫn của từng loại.', 'seaweed nori'],
  ['Gạo lứt đỏ', 'vegetable', 'Thực vật', 'brown-rice', 'Reis - Sorte C voll.jpg', 'Gạo còn lớp cám, thường có kết cấu chắc hơn gạo trắng; ảnh minh họa gạo nguyên cám.', 'Vo và nấu theo hướng dẫn của loại gạo, dùng trong cơm hoặc cháo.', 'brown rice red rice'],
  ['Đậu gà (Chickpeas)', 'protein', 'Thực vật', 'chickpea', 'Chickpeas (1).jpg', 'Hạt đậu tròn có màu vàng nhạt, vị bùi khi nấu chín.', 'Ngâm và nấu chín đậu khô, dùng làm hummus, salad hoặc cà ri.', 'chickpea chickpeas garbanzo'],
  ['Đậu lăng đỏ', 'protein', 'Thực vật', 'lentil', '3 types of lentil.png', 'Đậu lăng đỏ có hạt nhỏ, thường mềm nhanh khi nấu; ảnh minh họa các loại đậu lăng.', 'Rửa sạch rồi nấu súp, cà ri hoặc món hầm.', 'red lentil lentils'],
  ['Hạt điều rang', 'vegetable', 'Thực vật', 'cashew', 'Raw Cashew nuts.jpg', 'Hạt điều có dạng cong, vị béo và bùi; ảnh minh họa nhân hạt điều.', 'Dùng làm món ăn nhẹ hoặc xay làm sốt; chọn loại gia vị phù hợp chế độ ăn.', 'cashew nuts'],
  ['Bơ đậu phộng', 'vegetable', 'Thực vật', 'peanut-butter', '2020-03-24 20 57 22 An open jar of Skippy Creamy Peanut Butter in the Dulles section of Sterling, Loudoun County, Virginia.jpg', 'Hỗn hợp làm từ đậu phộng xay, có thể thêm đường, muối hoặc dầu.', 'Phết bánh mì, làm sốt hoặc dùng trong bánh; kiểm tra thành phần trên nhãn.', 'peanut butter bơ lạc'],
  ['Bông cải xanh', 'vegetable', 'Thực vật', 'broccoli', 'Broccoli and cross section edit.jpg', 'Rau có các cụm hoa xanh và thân giòn.', 'Chia thành miếng vừa ăn, dùng để hấp, xào hoặc nấu súp.', 'broccoli súp lơ xanh'],
  ['Bắp ngọt', 'vegetable', 'Thực vật', 'sweet-corn', 'VegCorn.jpg', 'Bắp có hạt màu vàng, vị ngọt và kết cấu giòn.', 'Luộc, hấp hoặc tách hạt để thêm vào canh, salad và món xào.', 'sweet corn ngô ngọt'],
];

export const ingredientCatalog = rows.map(([name, category, origin, slug, photoFile, description, cooking, aliases]) => ({
  name, category, origin, plant: origin !== 'Động vật', slug, photoFile, description, cooking, aliases,
  image_url: `/ingredient-assets/${slug}.${slug === 'sweet-corn' ? 'svg' : photoFile.split('.').at(-1).toLowerCase()}`,
}));
