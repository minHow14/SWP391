import { useEffect, useRef, useState } from 'react';
import { useDatabase } from '../lib/databaseContext.js';
import { normalizeSearch } from '../lib/recipeFilters.js';
import ContentImage from '../components/ContentImage.jsx';
import ContentDialog from '../components/ContentDialog.jsx';
import '../Discovery.css';

export default function IngredientDictionary() {
  const {data}=useDatabase();
  const ingredients=data.ingredients;
  const ingredientCategories=[{id:'all',name:'Tất Cả',emoji:'🌱'},...Array.from(new Set(ingredients.map(i=>i.category))).map(id=>({id,name:{protein:'Đậu & Đạm Chay',mushroom:'Các Loại Nấm',vegetable:'Rau Củ & Hạt',additive:'Phụ Gia Dễ Nhầm',other:'Nguyên Liệu Khác'}[id]||id,emoji:'🌿'}))];
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [demo, setDemo] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const upload = useRef(null);
  const sample = ingredients.find((item) => item.category==='mushroom') || ingredients[0];
  const search = normalizeSearch(query.trim());
  const filtered = ingredients.filter((item) => (category === 'all' || item.category === category) && normalizeSearch(`${item.name} ${item.origin} ${item.aliases}`).includes(search));
  useEffect(() => {
    if (photo) return () => URL.revokeObjectURL(photo.url);
  }, [photo]);

  function loadPhoto(file) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError('Chọn ảnh JPG, PNG hoặc WebP dưới 10 MB.');
      return;
    }
    setPhoto({ url: URL.createObjectURL(file), name: file.name });
    setDemo(false);
    setError('');
  }

  return (
    <main className="cx-discovery-page flex-grow-1">
      <section className="cx-dictionary-card" aria-labelledby="dictionary-title">
        <h1 id="dictionary-title"><i className="bi bi-book-fill" aria-hidden="true" /> Từ Điển Nguyên Liệu Chay</h1>
        <p className="cx-discovery-intro">Tra cứu nguyên liệu cơ bản, phụ gia E-number và tìm hiểu nguồn gốc, cách sử dụng trong món chay.</p>
        <section className="cx-ingredient-camera" aria-label="Tra cứu nguyên liệu">
          <div className="cx-camera-toolbar">
            <div className="cx-camera-heading"><span className="cx-camera-icon"><i className="bi bi-camera-fill" aria-hidden="true" /></span><div><h2>Khám phá nguyên liệu <span>Thông tin nguyên liệu</span></h2><p>Tìm hiểu nguồn gốc, dinh dưỡng và cách sử dụng nguyên liệu.</p></div></div>
            <div className="cx-camera-actions"><button className="cx-camera-demo" type="button" disabled={!sample} onClick={() => { setDemo(!demo); setPhoto(null); setError(''); }}><i className="bi bi-magic" aria-hidden="true" /> {demo ? 'Thu gọn' : 'Xem nguyên liệu gợi ý'}</button><button className="cx-camera-upload" type="button" onClick={() => upload.current?.click()}><i className="bi bi-upload" aria-hidden="true" /> Tải Ảnh Nguyên Liệu</button></div>
          </div>
          <input ref={upload} type="file" className="visually-hidden" aria-label="Chọn ảnh nguyên liệu" accept="image/jpeg,image/png,image/webp" onChange={(event) => { loadPhoto(event.target.files[0]); event.target.value = ''; }} />
          <p className="cx-camera-note">Tìm kiếm theo tên để xem thông tin nguyên liệu. Ảnh tải lên chỉ dùng để xem trước.</p>
          {error && <p className="cx-camera-error" role="alert">{error}</p>}
          {photo && <div className="cx-ingredient-upload-preview"><img src={photo.url} alt="Ảnh nguyên liệu đã chọn" /><div><strong>{photo.name}</strong><p>Đã tải ảnh xem trước. Nhập tên nguyên liệu bên dưới để tra cứu thông tin.</p><button type="button" onClick={() => setPhoto(null)}>Xóa ảnh</button></div></div>}
          {demo && sample && <div className="cx-ingredient-demo-result" role="status">
            <div className="cx-ingredient-demo-main"><div className="cx-ingredient-demo-photo"><ContentImage src={sample.image} alt={`Ảnh nguyên liệu ${sample.name}`} /><span>Chi tiết nguyên liệu</span></div><div className="cx-ingredient-demo-text"><div className="cx-ingredient-demo-title"><h3>{sample.name}</h3><span>{sample.origin}</span></div><p>{sample.description}</p><div className="cx-ingredient-facts">{[['Nguồn gốc', sample.origin], ['Đạm / 100g', sample.protein+'g'], ['Năng lượng / 100g', sample.calories_per_100g+' kcal'], ['Chất béo / 100g', sample.fat+'g']].map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div></div></div></div>}
        </section>
        <div className="cx-discovery-search"><i className="bi bi-search" aria-hidden="true" /><label className="visually-hidden" htmlFor="ingredient-search">Tìm kiếm nguyên liệu</label><input id="ingredient-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm kiếm nguyên liệu: Đậu hũ, Nấm, Hạt điều, Rau bina, Gelatin, E120..." /></div>
        <div className="cx-ingredient-filters" aria-label="Nhóm nguyên liệu">{ingredientCategories.map((item) => <button type="button" key={item.id} aria-pressed={category === item.id} className={category === item.id ? 'is-active' : ''} onClick={() => setCategory(item.id)}>{item.emoji} {item.name}</button>)}</div>
        <p className="visually-hidden" role="status">Tìm thấy {filtered.length} nguyên liệu.</p>
        <div className="cx-ingredient-grid">{filtered.map((item) => <button type="button" className="cx-ingredient-card" key={item.id} onClick={() => setDetail(item)} aria-label={`Xem chi tiết ${item.name}`}>
          <div className="cx-ingredient-photo"><ContentImage src={item.image} alt={`Ảnh nguyên liệu ${item.name}`} /><span className={`cx-ingredient-badge ${item.plant ? '' : 'is-animal'}`}>{item.plant === true ? '● Nguồn gốc thực vật' : item.plant === false ? '● Nguồn gốc động vật' : '● Chưa xác định nguồn gốc'}</span></div>
          <small className="cx-ingredient-origin">📍 Nguồn gốc: {item.origin}</small><h2>{item.name}</h2><p>{item.description}</p>
        </button>)}</div>
        {!filtered.length && <div className="cx-discovery-empty"><i className="bi bi-search" aria-hidden="true" /><h2>Chưa tìm thấy nguyên liệu</h2><p>Thử từ khóa khác hoặc xem tất cả nhóm nguyên liệu.</p><button type="button" onClick={() => { setQuery(''); setCategory('all'); }}>Xem tất cả</button></div>}
      </section>
      {detail && <ContentDialog title={detail.name} onClose={() => setDetail(null)}><div className="cx-ingredient-detail"><div className="cx-ingredient-detail-photo"><ContentImage src={detail.image} alt={`Ảnh nguyên liệu ${detail.name}`} /></div><span className={`cx-detail-origin ${detail.plant ? '' : 'is-animal'}`}>{detail.plant === true ? 'Nguồn gốc thực vật — kiểm tra theo chế độ ăn đã chọn' : detail.plant === false ? 'Nguồn gốc động vật — kiểm tra theo chế độ ăn đã chọn' : 'Chưa xác định nguồn gốc'}</span><p><strong>Nguồn gốc:</strong> {detail.origin}</p><p>{detail.description}</p><h3>Gợi ý sử dụng</h3><p>{detail.cooking}</p></div></ContentDialog>}
    </main>
  );
}


