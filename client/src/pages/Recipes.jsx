import { useState } from 'react';
import { useOutletContext } from 'react-router';
import { useDatabase } from '../lib/databaseContext.js';
import { filterRecipes } from '../lib/recipeFilters.js';
import ContentDialog from '../components/ContentDialog.jsx';
import ContentImage from '../components/ContentImage.jsx';

export default function Recipes() {
  const {data}=useDatabase();
  const recipes=data.recipes;
  const recipeCategories=[{category_id:null,name:'Tất Cả Món',icon:'grid'},...data.categories.filter(c=>data.recipes.some(r=>r.category_id===c.category_id)).map(c=>({...c,icon:'leaf'}))];
  const recipeDietLabels=data.diets.map(d=>({...d,icon:'leaf',tone:'green'}));
  const { diet } = useOutletContext();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(null);
  const [matchDiet, setMatchDiet] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const filtered = filterRecipes(recipes, {
    query,
    category_id: category,
    matchDiet,
    diet_type_id: diet.diet_type_id,
  });

  return (
    <main
      className="cx-explore-page flex-grow-1"
      aria-label="Kho công thức chay"
    >
      <div className="container-fluid cx-explore-shell">
        <section className="cx-page-toolbar" aria-labelledby="recipes-title">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
            <div>
              <h1 id="recipes-title">
                <span className="cx-heading-icon">
                  <i className="bi bi-book-half" aria-hidden="true" />
                </span>
                Kho Công Thức Chay Phân Loại Theo Chế Độ
              </h1>
              <p>
                Mỗi món ăn chỉ gắn các nhãn phù hợp với nguyên liệu trong công
                thức.
              </p>
            </div>
            <div className="cx-auto-filter">
              <span>
                <i className="bi bi-funnel-fill" aria-hidden="true" /> Khớp chế
                độ của tôi:
              </span>
              <button
                type="button"
                className="btn btn-sm"
                aria-pressed={matchDiet}
                onClick={() => setMatchDiet(!matchDiet)}
              >
                {matchDiet ? 'Tắt lọc tự động' : 'Bật lọc tự động'}
              </button>
            </div>
          </div>
          <div className="cx-recipe-controls">
            <div className="cx-search-field">
              <i className="bi bi-search" aria-hidden="true" />
              <label htmlFor="recipe-search" className="visually-hidden">
                Tìm công thức theo tên món hoặc nguyên liệu
              </label>
              <input
                id="recipe-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo tên món, nguyên liệu (đậu hũ, nấm...)"
              />
            </div>
            <div className="cx-category-filters" aria-label="Lọc loại món ăn">
              {recipeCategories.map((item) => (
                <button
                  type="button"
                  key={item.category_id ?? 'all'}
                  className={category === item.category_id ? 'is-active' : ''}
                  aria-pressed={category === item.category_id}
                  onClick={() => setCategory(item.category_id)}
                >
                  <i className={`bi bi-${item.icon}`} aria-hidden="true" />
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        </section>
        <p className="cx-sample-note">
          Tìm thấy{' '}
          {filtered.length} món.
        </p>
        <div className="row g-4">
          {filtered.map((recipe) => (
            <div className="col-12 col-md-6 col-xl-4" key={recipe.recipe_id}>
              <article className="cx-recipe-card h-100">
                <div className="position-relative">
                  <ContentImage
                    src={recipe.image}
                    alt={recipe.recipe_name}
                    className="cx-recipe-image"
                  />
                  <span className="cx-recipe-meta">
                    <i className="bi bi-stopwatch" aria-hidden="true" />{' '}
                    {recipe.prep_time} phút <span>·</span>{' '}
                    <i className="bi bi-fire" aria-hidden="true" />{' '}
                    {recipe.total_calories} kcal
                  </span>
                </div>
                <div className="cx-recipe-body">
                  <h2>{recipe.recipe_name}</h2>
                  <p>{recipe.description}</p>
                  <div className="cx-diet-tags">
                    <span className="cx-diet-tags-label">
                      CÁC CHẾ ĐỘ PHÙ HỢP:
                    </span>
                    <div className="d-flex flex-wrap gap-1">
                      {recipeDietLabels
                        .filter((label) =>
                          recipe.compatible_diet_type_ids.includes(
                            label.diet_type_id
                          )
                        )
                        .map((label) => (
                          <span
                            key={label.diet_type_id}
                            className={`cx-diet-tag ${label.tone} ${diet.diet_type_id === label.diet_type_id ? 'is-matched' : ''}`}
                          >
                            <i
                              className={`bi bi-${label.icon}`}
                              aria-hidden="true"
                            />{' '}
                            {label.name}
                            {diet.diet_type_id === label.diet_type_id && (
                              <i
                                className="bi bi-star-fill ms-1"
                                aria-label="Phù hợp với chế độ của bạn"
                              />
                            )}
                          </span>
                        ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn cx-recipe-detail"
                    onClick={() => setSelectedRecipe(recipe)}
                  >
                    Xem Cách Chế Biến Chi Tiết{' '}
                    <i className="bi bi-chevron-right" aria-hidden="true" />
                  </button>
                </div>
              </article>
            </div>
          ))}
        </div>
        {!filtered.length && (
          <div className="cx-empty-state">
            <i className="bi bi-search" aria-hidden="true" />
            <h2>Chưa tìm thấy món phù hợp</h2>
            <p>Thử đổi từ khóa, loại món hoặc bộ lọc chế độ ăn.</p>
            <button
              type="button"
              className="btn btn-success"
              onClick={() => {
                setQuery('');
                setCategory(null);
                setMatchDiet(false);
              }}
            >
              Xóa bộ lọc
            </button>
          </div>
        )}
      </div>
      {selectedRecipe && (
        <ContentDialog
          title={selectedRecipe.recipe_name}
          onClose={() => setSelectedRecipe(null)}
        >
          <p className="text-secondary small">
            {selectedRecipe.prep_time} phút · công thức tham khảo
          </p>
          <h3 className="h6 fw-bold">Nguyên liệu</h3>
          <ul>
            {selectedRecipe.ingredients.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h3 className="h6 fw-bold mt-4">Cách chế biến</h3>
          <ol className="cx-recipe-steps">
            {(selectedRecipe.instructions || 'Chưa cập nhật hướng dẫn.').split('\n').map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </ContentDialog>
      )}
    </main>
  );
}
