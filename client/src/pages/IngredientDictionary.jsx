// D:/SWP391/SWP391/client/src/pages/IngredientDictionary.jsx
import { useState } from 'react';
import { useOutletContext } from 'react-router';
import IngredientPreview from '../features/ingredients/components/IngredientPreview.jsx';
import { useDatabase } from '../hooks/useDatabase.js';
import { normalizeSearch } from '../utils/recipeFilters.js';
import ContentImage from '../components/common/ContentImage.jsx';
import ContentDialog from '../components/common/ContentDialog.jsx';

export default function IngredientDictionary() {
  const { data, reload } = useDatabase();
  const { diet } = useOutletContext() || {};
  const ingredients = data.ingredients;
  const ingredientCategories = [
    { id: 'all', name: 'Tất Cả', emoji: '🌱' },
    ...Array.from(new Set(ingredients.map((i) => i.category))).map((id) => ({
      id,
      name:
        {
          protein: 'Đậu & Đạm Chay',
          mushroom: 'Các Loại Nấm',
          vegetable: 'Rau Củ & Hạt',
          additive: 'Phụ Gia Dễ Nhầm',
          other: 'Nguyên Liệu Khác',
        }[id] || id,
      emoji: '🌿',
    })),
  ];
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [detail, setDetail] = useState(null);
  async function showSavedIngredient(ingredient, signal) {
    const catalog = await reload();
    if (signal.aborted) return;
    setCategory('all');
    setQuery('');
    setDetail(catalog.ingredients.find((item) => String(item.id) === String(ingredient.id)) || ingredient);
  }
  const search = normalizeSearch(query.trim());
  const filtered = ingredients.filter(
    (item) =>
      (category === 'all' || item.category === category) &&
      normalizeSearch(`${item.name} ${item.origin} ${item.aliases}`).includes(
        search
      )
  );
  return (
    <main className="cx-discovery-page flex-grow-1">
      <section
        className="cx-dictionary-card"
        aria-labelledby="dictionary-title"
      >
        <h1 id="dictionary-title">
          <i className="bi bi-book-fill" aria-hidden="true" /> Từ Điển Nguyên
          Liệu Chay
        </h1>
        <p className="cx-discovery-intro">
          Tra cứu nguyên liệu cơ bản, phụ gia E-number và tìm hiểu nguồn gốc,
          cách sử dụng trong món chay.
        </p>
        <IngredientPreview
          ingredients={ingredients}
          dietId={diet?.diet_type_id ?? 1}
          onSelect={setDetail}
          onSaved={showSavedIngredient}
        />
        <div className="cx-discovery-search">
          <i className="bi bi-search" aria-hidden="true" />
          <label className="visually-hidden" htmlFor="ingredient-search">
            Tìm kiếm nguyên liệu
          </label>
          <input
            id="ingredient-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm kiếm nguyên liệu: Đậu hũ, Nấm, Hạt điều, Rau bina, Gelatin, E120..."
          />
        </div>
        <div className="cx-ingredient-filters" aria-label="Nhóm nguyên liệu">
          {ingredientCategories.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={category === item.id}
              className={category === item.id ? 'is-active' : ''}
              onClick={() => setCategory(item.id)}
            >
              {item.emoji} {item.name}
            </button>
          ))}
        </div>
        <p className="visually-hidden" role="status">
          Tìm thấy {filtered.length} nguyên liệu.
        </p>
        <div className="cx-ingredient-grid">
          {filtered.map((item) => (
            <button
              type="button"
              className="cx-ingredient-card"
              key={item.id}
              onClick={() => setDetail(item)}
              aria-label={`Xem chi tiết ${item.name}`}
            >
              <div className="cx-ingredient-photo">
                <ContentImage
                  src={item.image}
                  alt={`Ảnh nguyên liệu ${item.name}`}
                />
                <span
                  className={`cx-ingredient-badge ${item.plant ? '' : 'is-animal'}`}
                >
                  {item.plant === true
                    ? '● Nguồn gốc thực vật'
                    : item.plant === false
                      ? '● Nguồn gốc động vật'
                      : '● Chưa xác định nguồn gốc'}
                </span>
              </div>
              <small className="cx-ingredient-origin">
                📍 Nguồn gốc: {item.origin}
              </small>
              <h2>{item.name}</h2>
              <p>{item.description}</p>
            </button>
          ))}
        </div>
        {!filtered.length && (
          <div className="cx-discovery-empty">
            <i className="bi bi-search" aria-hidden="true" />
            <h2>Chưa tìm thấy nguyên liệu</h2>
            <p>Thử từ khóa khác hoặc xem tất cả nhóm nguyên liệu.</p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setCategory('all');
              }}
            >
              Xem tất cả
            </button>
          </div>
        )}
      </section>
      {detail && (
        <ContentDialog title={detail.name} onClose={() => setDetail(null)}>
          <div className="cx-ingredient-detail">
            <div className="cx-ingredient-detail-photo">
              <ContentImage
                src={detail.image}
                alt={`Ảnh nguyên liệu ${detail.name}`}
              />
            </div>
            <span
              className={`cx-detail-origin ${detail.plant ? '' : 'is-animal'}`}
            >
              {detail.plant === true
                ? 'Nguồn gốc thực vật — kiểm tra theo chế độ ăn đã chọn'
                : detail.plant === false
                  ? 'Nguồn gốc động vật — kiểm tra theo chế độ ăn đã chọn'
                  : 'Chưa xác định nguồn gốc'}
            </span>
            <p>
              <strong>Nguồn gốc:</strong> {detail.origin}
            </p>
            <p>{detail.description}</p>
            <h3>Gợi ý sử dụng</h3>
            <p>{detail.cooking}</p>
          </div>
        </ContentDialog>
      )}
    </main>
  );
}
