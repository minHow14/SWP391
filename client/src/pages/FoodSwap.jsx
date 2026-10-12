import { useRef, useState } from 'react';
import { useDatabase } from '../lib/databaseContext.js';
import { normalizeSearch } from '../lib/recipeFilters.js';
import '../FoodSwap.css';

export default function FoodSwap() {
  const {data}=useDatabase();
  const foodSwaps=data.swaps;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(null);
  const input = useRef(null);
  const words = normalizeSearch(query.trim()).split(/\s+/).filter(Boolean);
  const filtered = foodSwaps.filter((item) => {
    if (category) return item.id === category;
    const searchText = normalizeSearch(`${item.original} ${item.role} ${item.alternatives.join(' ')} ${item.keywords}`);
    return words.every((word) => searchText.includes(word));
  });

  function clear() {
    setQuery('');
    setCategory(null);
    input.current?.focus();
  }

  return (
    <main className="cx-swap-page flex-grow-1">
      <section className="cx-swap-card" aria-labelledby="swap-title">
        <div className="cx-swap-badge"><i className="bi bi-magic" aria-hidden="true" /> Chuyển Đổi Món Thông Thường</div>
        <h1 id="swap-title">Bộ Chuyển Đổi Món Thường Thành Món Chay</h1>
        <p className="cx-swap-intro">Thay thế thịt, cá, trứng, sữa, nước mắm, gelatin bằng nguyên liệu thực vật cùng giải thích tác dụng khi nấu ăn.</p>

        <div className="cx-swap-controls">
          <div className="cx-swap-search">
            <i className="bi bi-search" aria-hidden="true" />
            <label htmlFor="swap-search" className="visually-hidden">Tìm nguyên liệu cần thay thế</label>
            <input id="swap-search" ref={input} type="search" value={query} onChange={(event) => { setQuery(event.target.value); setCategory(null); }} placeholder="Nhập tên thành phần mặn (VD: thịt bò, nước mắm, trứng, gelatin, phô mai, cá, tôm...)" />
            <button type="button" onClick={clear} aria-label="Xóa tìm kiếm và hiển thị tất cả">Xóa</button>
          </div>
          <div className="cx-swap-suggestions" aria-label="Gợi ý nguyên liệu phổ biến">
            <span className="cx-swap-suggestions-label"><i className="bi bi-fire" aria-hidden="true" /> Gợi ý phổ biến:</span>
            {foodSwaps.map((item) => <button key={item.id} type="button" aria-pressed={category === item.id} className={category === item.id ? 'is-active' : ''} onClick={() => { const next = category === item.id ? null : item.id; setCategory(next); setQuery(next ? item.chip : ''); }}><span aria-hidden="true">{item.emoji}</span>{item.chip}</button>)}
          </div>
        </div>

        <p className="visually-hidden" role="status">{filtered.length ? `Hiển thị ${filtered.length} nhóm nguyên liệu thay thế.` : 'Không tìm thấy nguyên liệu phù hợp.'}</p>
        <div className="cx-swap-table-wrap">
          <table className="cx-swap-table">
            <caption className="visually-hidden">Nguyên liệu gốc, gợi ý thay thế chay và tác dụng kỹ thuật chuyển đổi</caption>
            <thead><tr><th scope="col">Thành Phần Mặn Gốc</th><th scope="col">Gợi Ý Thay Thế Chay</th><th scope="col">Tác Dụng Kỹ Thuật Chuyển Đổi</th></tr></thead>
            <tbody>
              {filtered.map((item) => <tr key={item.id}>
                <th scope="row"><strong>{item.original}</strong><span className="cx-swap-role">{item.role}</span></th>
                <td><ul>{item.alternatives.map((alternative) => <li key={alternative}>{alternative}</li>)}</ul></td>
                <td><p>{item.description}</p></td>
              </tr>)}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="cx-swap-empty"><i className="bi bi-search" aria-hidden="true" /><h2>Chưa tìm thấy nguyên liệu này</h2><p>Thử tìm “trứng”, “nước mắm”, “sữa” hoặc chọn một gợi ý phổ biến.</p><button type="button" onClick={clear}>Xem tất cả nguyên liệu</button></div>}
        </div>
      </section>
    </main>
  );
}
