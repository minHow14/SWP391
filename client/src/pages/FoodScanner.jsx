// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/pages/FoodScanner.jsx
import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router';
import { analyzeIngredients } from '../utils/foodScanner.js';
import { useDatabase } from '../hooks/useDatabase.js';

const layers = ['Thịt & hải sản', 'Chiết xuất động vật', 'Trứng, sữa & mật ong', 'Quy tắc chế độ ăn'];
const Icon = ({ name }) => <i className={`bi bi-${name}`} aria-hidden="true" />;

export default function FoodScanner() {
  const {data}=useDatabase();
  const dietOptions=data.diets;
  const recipe=data.recipes[0];
  const scanDemo=recipe?{name:recipe.recipe_name,ingredients:recipe.ingredients.join(', ')}:null;
  const demoImage=recipe?.image;
  const { diet } = useOutletContext();
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [dietOverride, setDietOverride] = useState(null);
  const dietId = dietOverride ?? diet.diet_type_id;
  const selectedDiet = dietOptions.find((item) => item.diet_type_id === dietId);
  const [photo, setPhoto] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const fileInput = useRef(null);
  useEffect(() => {
    if (!photo || photo.demo) return;
    return () => URL.revokeObjectURL(photo.url);
  }, [photo]);
  const visibleResult = result && result.name === name && result.ingredients === ingredients && result.dietId === dietId ? result : null;

  function loadPhoto(file) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Vui lòng chọn ảnh JPG, PNG hoặc WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Ảnh quá lớn. Vui lòng chọn ảnh dưới 10 MB.');
      return;
    }
    setPhoto({ url: URL.createObjectURL(file), name: file.name, demo: false });
    setResult(null);
    setError('');
  }

  function useDemo() {
    if(!scanDemo)return;
    setName(scanDemo.name);
    setIngredients(scanDemo.ingredients);
    setPhoto({ url: demoImage, name: 'Ảnh công thức gợi ý', demo: true });
    setResult({ ...analyzeIngredients(scanDemo.ingredients, dietId), ...scanDemo, dietId, demo: true });
    setError('');
  }

  function analyze(event) {
    event.preventDefault();
    if (!ingredients.trim()) {
      setError('Vui lòng nhập thành phần trên nhãn để kiểm tra. Chưa hỗ trợ tự đọc chữ từ ảnh.');
      setResult(null);
      return;
    }
    setResult({ ...analyzeIngredients(ingredients, dietId), name, ingredients, dietId, demo: photo?.demo ?? false });
    setError('');
  }

  return (
    <main className="cx-scanner-page flex-grow-1">
      <section className="cx-scanner-card" aria-labelledby="scanner-title">
        <h1 id="scanner-title"><Icon name="shield-shaded" /> Kiểm Tra Món & Nhãn Thành Phần</h1>
        <p className="cx-scanner-intro">Nhập tên món và danh sách thành phần để kiểm tra theo chế độ ăn chay của bạn. Bạn có thể tải ảnh nhãn sản phẩm để tham khảo khi nhập.</p>
        <form onSubmit={analyze}>
          <div className="cx-scanner-fields">
            <div>
              <label htmlFor="scan-name">Tên món ăn / Sản phẩm</label>
              <input id="scan-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Bún Thái Chay Thập Cẩm" maxLength={150} />
            </div>
            <div>
              <label htmlFor="scan-diet">Chế độ ăn chay áp dụng</label>
              <select id="scan-diet" value={dietId} onChange={(event) => setDietOverride(Number(event.target.value))}>
                {dietOptions.map((option) => <option key={option.diet_type_id} value={option.diet_type_id}>{option.emoji} {option.name}</option>)}
              </select>
            </div>
            <div className="cx-scanner-ingredients">
              <label htmlFor="scan-ingredients">Danh sách thành phần / Nhãn sản phẩm</label>
              <textarea id="scan-ingredients" value={ingredients} onChange={(event) => setIngredients(event.target.value)} placeholder="Dán danh sách thành phần, phân cách bằng dấu phẩy…" rows={3} maxLength={10000} aria-describedby="scan-demo-note" />
            </div>
          </div>

          <div className={`cx-scan-upload ${dragging ? 'is-dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); loadPhoto(event.dataTransfer.files[0]); }}>
            <div className="cx-scan-upload-toolbar">
              <div className="cx-scan-upload-heading">
                <span className="cx-scan-camera"><Icon name="camera-fill" /></span>
                <div><strong>Tải ảnh chụp sản phẩm hoặc nhãn thành phần</strong><p>Kéo thả ảnh vào đây • JPG, PNG, WebP • Tối đa 10 MB</p></div>
              </div>
              <div className="cx-scan-upload-actions">
                <button className="cx-scan-demo" type="button" onClick={useDemo}><Icon name="magic" /> Thử với công thức gợi ý</button>
                <button className="cx-scan-choose" type="button" onClick={() => fileInput.current?.click()}><Icon name="upload" /> Chọn ảnh từ máy</button>
              </div>
            </div>
            <input className="visually-hidden" type="file" ref={fileInput} accept="image/jpeg,image/png,image/webp" aria-label="Chọn ảnh món ăn hoặc nhãn thành phần" onChange={(event) => { loadPhoto(event.target.files[0]); event.target.value = ''; }} />
            {photo ? (
              <figure className="cx-scan-preview">
                <img src={photo.url} alt={photo.demo ? 'Ảnh món ăn gợi ý' : 'Ảnh sản phẩm đã tải lên'} onError={() => { setPhoto(null); setError('Không thể đọc ảnh này. Vui lòng chọn một ảnh khác.'); }} />
                <figcaption><span><Icon name="image" /> {photo.name}</span><button type="button" onClick={() => { setPhoto(null); setResult(null); }} aria-label="Xóa ảnh đã chọn">Xóa ảnh</button></figcaption>
              </figure>
            ) : <button className="cx-scan-empty" type="button" onClick={() => fileInput.current?.click()}><Icon name="cloud-arrow-up" /><span>Chọn hoặc kéo thả ảnh để xem trước</span></button>}
          </div>

          <p id="scan-demo-note" className="cx-scan-note"><Icon name="info-circle" /> Ảnh dùng để xem trước. Bộ lọc kiểm tra danh sách thành phần bạn nhập.</p>
          {error && <p className="cx-scan-error" role="alert">{error}</p>}
          <button className="cx-scan-submit" type="submit"><Icon name="clipboard2-pulse-fill" /> Kiểm tra thành phần</button>
        </form>

        <div className="cx-scan-layers" aria-label="Bốn lớp kiểm tra">{layers.map((layer, index) => <span key={layer}><b>{index + 1}</b>{layer}</span>)}</div>
        <div aria-live="polite" aria-atomic="true">
          {visibleResult && (
            <section className={`cx-scan-result is-${visibleResult.status}`} aria-label="Kết quả kiểm tra">
              <h2><Icon name={visibleResult.status === 'warning' ? 'x-circle-fill' : visibleResult.status === 'clear' ? 'check-circle-fill' : 'info-circle-fill'} /> {visibleResult.status === 'warning' ? 'KHÔNG PHÙ HỢP — PHÁT HIỆN THÀNH PHẦN CẦN KIỂM TRA' : visibleResult.status === 'clear' ? 'CHƯA PHÁT HIỆN THÀNH PHẦN KHÔNG PHÙ HỢP' : 'CHƯA HỖ TRỢ QUY TẮC CHO CHẾ ĐỘ NÀY'}</h2>
              <p>{visibleResult.demo ? 'Kết quả: ' : ''}{name.trim() ? <>Món <strong>“{name}”</strong></> : 'Danh sách thành phần'} đã được kiểm tra theo chế độ <strong>{selectedDiet?.name || 'Chưa chọn'}</strong>.</p>
              {visibleResult.findings.length > 0 && <ul>{visibleResult.findings.map((finding, index) => <li key={`${finding.ingredient}-${index}`}><strong>{finding.ingredient}:</strong> {finding.reason}</li>)}</ul>}
              <p className="cx-scan-result-note">{visibleResult.status === 'clear' ? 'Bộ lọc từ khóa có danh sách từ khóa giới hạn. Hãy xác nhận đầy đủ nguyên liệu với nhà sản xuất hoặc quán ăn.' : visibleResult.status === 'unknown' ? 'Chọn Vegan, Lacto, Ovo, chay trứng & sữa hoặc chay Phật giáo để chạy bộ lọc.' : 'Kết quả dựa trên từ khóa trong văn bản, chưa xác nhận thành phần từ ảnh.'}</p>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
