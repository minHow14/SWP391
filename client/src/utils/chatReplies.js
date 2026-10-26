// D:/SWP391/SWP391/client/src/utils/chatReplies.js
import {api} from '../services/api.js';
import {normalizeSearch} from './recipeFilters.js';
export async function getDatabaseReply(question){
  const catalog=await api('/workspace/catalog');
  const words=normalizeSearch(question).split(/\s+/).filter(w=>w.length>2);
  const matches=catalog.recipes.filter(r=>words.some(w=>normalizeSearch(`${r.recipe_name} ${r.ingredients.join(' ')}`).includes(w))).slice(0,4);
  return {title:'Tra cứu công thức ChayXanh',text:matches.length?'Các công thức phù hợp với tìm kiếm của bạn:':'Chưa tìm thấy công thức phù hợp. Bạn thử nhập tên món hoặc nguyên liệu cụ thể.',items:matches.map(r=>`${r.recipe_name}: ${r.ingredients.join(', ')} — ${r.instructions}`),footer:'Xem thêm các món trong mục Công thức.'};
}
