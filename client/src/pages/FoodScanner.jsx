// client/src/pages/FoodScanner.jsx
import { useEffect, useRef, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router';
import { analyzeIngredients } from '../utils/foodScanner.js';
import { useDatabase } from '../hooks/useDatabase.js';
import { analyzeFoodImage, fileToBase64 } from '../services/foodScannerService.js';

const layers = [
  'Thịt & hải sản',
  'Chiết xuất phụ phẩm',
  'Trứng, sữa & mật ong',
  'Ngũ vị tân',
  'Dị ứng cá nhân',
];

const Icon = ({ name }) => <i className={`bi bi-${name}`} aria-hidden="true" />;

export default function FoodScanner() {
  const navigate = useNavigate();
  const { data } = useDatabase();
  const dietOptions = data.diets || [];
  const recipe = data.recipes?.[0];
  const scanDemo = recipe ? { name: recipe.recipe_name, ingredients: recipe.ingredients.join(', ') } : null;
  const demoImage = recipe?.image;
  const { diet } = useOutletContext() || { diet: { diet_type_id: 1 } };

  const [activeTab, setActiveTab] = useState('image'); // 'image' | 'text'
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [scanType, setScanType] = useState('AUTO'); // 'AUTO' | 'LABEL' | 'DISH'
  const [dietOverride, setDietOverride] = useState(null);
  const dietId = dietOverride ?? diet.diet_type_id ?? 1;
  const selectedDiet = dietOptions.find((item) => item.diet_type_id === dietId);

  const [photo, setPhoto] = useState(null); // { url, name, base64, mimeType, demo }
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Kết quả kiểm tra
  const [textResult, setTextResult] = useState(null);
  const [aiResult, setAiResult] = useState(null);

  const fileInput = useRef(null);

  useEffect(() => {
    if (!photo || photo.demo) return;
    return () => {
      if (photo.url && photo.url.startsWith('blob:')) {
        URL.revokeObjectURL(photo.url);
      }
    };
  }, [photo]);

  async function handleFileSelected(file) {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Vui lòng chọn ảnh JPG, PNG hoặc WebP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Ảnh quá lớn. Vui lòng chọn ảnh dưới 10 MB.');
      return;
    }

    try {
      const { base64, mimeType, dataUrl } = await fileToBase64(file);
      setPhoto({
        url: dataUrl,
        name: file.name,
        base64,
        mimeType,
        demo: false,
      });
      setAiResult(null);
      setError('');
    } catch {
      setError('Không thể đọc file ảnh. Vui lòng thử lại.');
    }
  }

  function useDemoRecipe() {
    if (!scanDemo) return;
    setName(scanDemo.name);
    setIngredients(scanDemo.ingredients);
    setPhoto({
      url: demoImage,
      name: 'Ảnh công thức gợi ý',
      demo: true,
      base64: null,
      mimeType: 'image/jpeg',
    });
    setTextResult({ ...analyzeIngredients(scanDemo.ingredients, dietId), ...scanDemo, dietId, demo: true });
    setAiResult(null);
    setError('');
  }

  // Quét AI bằng hình ảnh
  async function handleAiAnalyze(event) {
    if (event) event.preventDefault();

    if (!photo || (!photo.base64 && !photo.demo)) {
      setError('Vui lòng tải ảnh món ăn hoặc bao bì lên trước khi phân tích AI.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Đối với ảnh demo không có base64 thật, tạo placeholder nhỏ 1x1 base64 để test luồng
      const base64Payload = photo.base64 || 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const response = await analyzeFoodImage({
        imageBase64: base64Payload,
        mimeType: photo.mimeType || 'image/jpeg',
        dietTypeId: dietId,
        scanType,
        dishName: name.trim(),
        allergies: [],
      });

      if (response && response.success && response.data) {
        setAiResult(response.data);
      } else {
        throw new Error(response?.message || 'Không thể nhận diện món ăn.');
      }
    } catch (err) {
      setError(err?.message || 'Đã xảy ra lỗi khi gọi AI. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }

  // Quét nhanh bằng text
  function handleTextAnalyze(event) {
    event.preventDefault();
    if (!ingredients.trim()) {
      setError('Vui lòng nhập thành phần trên nhãn để kiểm tra.');
      setTextResult(null);
      return;
    }
    setTextResult({
      ...analyzeIngredients(ingredients, dietId),
      name,
      ingredients,
      dietId,
      demo: photo?.demo ?? false,
    });
    setAiResult(null);
    setError('');
  }

  return (
    <main className="cx-scanner-page flex-grow-1 container py-4">
      <section className="cx-scanner-card card shadow-sm border-0 p-4" aria-labelledby="scanner-title">
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 pb-2 border-bottom">
          <h1 id="scanner-title" className="h3 mb-0 text-success fw-bold">
            <Icon name="shield-shaded" /> Giám Định Món & Quét Nhãn Chay
          </h1>
          <div className="btn-group mt-2 mt-sm-0" role="group" aria-label="Phương thức kiểm tra">
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'image' ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => { setActiveTab('image'); setError(''); }}
            >
              <Icon name="camera-fill" /> Quét bằng hình ảnh (AI Vision)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'text' ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => { setActiveTab('text'); setError(''); }}
            >
              <Icon name="card-text" /> Nhập danh sách chữ
            </button>
          </div>
        </div>

        <p className="cx-scanner-intro text-muted mb-4">
          Hệ thống AI đa phương thức tự động nhận diện đĩa món ăn, bóc tách phụ gia mã số quốc tế (E-numbers) trên bao bì và kiểm tra đối chiếu theo 5 lớp quy tắc ẩm thực chay.
        </p>

        {/* Cấu hình chung: Chế độ ăn & Tên món */}
        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <label htmlFor="scan-diet" className="form-label fw-semibold">
              <Icon name="person-check" /> Chế độ ăn chay áp dụng
            </label>
            <select
              id="scan-diet"
              className="form-select"
              value={dietId}
              onChange={(event) => setDietOverride(Number(event.target.value))}
            >
              {dietOptions.map((option) => (
                <option key={option.diet_type_id} value={option.diet_type_id}>
                  {option.emoji} {option.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label htmlFor="scan-name" className="form-label fw-semibold">
              <Icon name="tag" /> Tên món ăn / Sản phẩm (Tùy chọn)
            </label>
            <input
              id="scan-name"
              className="form-control"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ví dụ: Bún Thái Chay, Đậu Hũ Chiên Sả Ớt..."
              maxLength={150}
            />
          </div>
        </div>

        {/* Tab 1: Quét bằng hình ảnh AI */}
        {activeTab === 'image' && (
          <form onSubmit={handleAiAnalyze} className="mb-4">
            <div className="mb-3">
              <label className="form-label fw-semibold"><Icon name="sliders" /> Loại hình ảnh quét:</label>
              <div className="d-flex gap-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="scanType"
                    id="scanAuto"
                    checked={scanType === 'AUTO'}
                    onChange={() => setScanType('AUTO')}
                  />
                  <label className="form-check-label" htmlFor="scanAuto">Tự động nhận diện</label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="scanType"
                    id="scanLabel"
                    checked={scanType === 'LABEL'}
                    onChange={() => setScanType('LABEL')}
                  />
                  <label className="form-check-label" htmlFor="scanLabel">Bao bì / Nhãn thành phần</label>
                </div>
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="scanType"
                    id="scanDish"
                    checked={scanType === 'DISH'}
                    onChange={() => setScanType('DISH')}
                  />
                  <label className="form-check-label" htmlFor="scanDish">Đĩa món ăn thực tế</label>
                </div>
              </div>
            </div>

            <div
              className={`cx-scan-upload border rounded p-4 text-center mb-3 ${dragging ? 'bg-light border-success' : 'border-dashed'}`}
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                handleFileSelected(event.dataTransfer.files[0]);
              }}
            >
              <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
                <div className="text-start">
                  <span className="fs-3 text-success me-2"><Icon name="camera-fill" /></span>
                  <strong>Tải ảnh chụp sản phẩm hoặc món ăn</strong>
                  <p className="text-muted small mb-0">Hỗ trợ JPG, PNG, WebP • Tối đa 10 MB</p>
                </div>
                <div className="mt-2 mt-sm-0 d-flex gap-2">
                  <button className="btn btn-outline-secondary btn-sm" type="button" onClick={useDemoRecipe}>
                    <Icon name="magic" /> Thử ảnh mẫu
                  </button>
                  <button className="btn btn-success btn-sm" type="button" onClick={() => fileInput.current?.click()}>
                    <Icon name="upload" /> Chọn từ máy
                  </button>
                </div>
              </div>

              <input
                className="visually-hidden"
                type="file"
                ref={fileInput}
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  handleFileSelected(event.target.files[0]);
                  event.target.value = '';
                }}
              />

              {photo ? (
                <figure className="cx-scan-preview my-3 text-center">
                  <img
                    src={photo.url}
                    alt={photo.demo ? 'Ảnh món ăn mẫu' : 'Ảnh đã tải lên'}
                    className="img-fluid rounded shadow-sm"
                    style={{ maxHeight: '280px', objectFit: 'contain' }}
                    onError={() => {
                      setPhoto(null);
                      setError('Không thể đọc ảnh này. Vui lòng chọn một ảnh khác.');
                    }}
                  />
                  <figcaption className="mt-2 small text-muted d-flex justify-content-center align-items-center gap-3">
                    <span><Icon name="image" /> {photo.name}</span>
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-danger p-0"
                      onClick={() => { setPhoto(null); setAiResult(null); }}
                    >
                      Xóa ảnh
                    </button>
                  </figcaption>
                </figure>
              ) : (
                <div className="py-4 cursor-pointer" onClick={() => fileInput.current?.click()} style={{ cursor: 'pointer' }}>
                  <Icon name="cloud-arrow-up fs-1 text-muted" />
                  <p className="text-muted mt-2 mb-0">Nhấp vào đây hoặc kéo thả ảnh vào khung này để tải lên</p>
                </div>
              )}
            </div>

            {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}

            <button
              className="btn btn-success btn-lg w-100 fw-bold"
              type="submit"
              disabled={loading || !photo}
            >
              {loading ? (
                <span>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Đang phân tích hình ảnh & đối chiếu quy tắc...
                </span>
              ) : (
                <span><Icon name="robot" /> Phân tích bằng AI Vision</span>
              )}
            </button>
          </form>
        )}

        {/* Tab 2: Nhập danh sách thành phần văn bản */}
        {activeTab === 'text' && (
          <form onSubmit={handleTextAnalyze} className="mb-4">
            <div className="mb-3">
              <label htmlFor="scan-ingredients" className="form-label fw-semibold">
                <Icon name="list-check" /> Danh sách thành phần in trên bao bì
              </label>
              <textarea
                id="scan-ingredients"
                className="form-control"
                value={ingredients}
                onChange={(event) => setIngredients(event.target.value)}
                placeholder="Dán các thành phần in trên bao bì, phân tách bằng dấu phẩy. Ví dụ: Đậu nành, dầu cọ, muối, chất điều vị E621, hương liệu tự nhiên..."
                rows={4}
                maxLength={10000}
              />
            </div>
            {error && <div className="alert alert-danger py-2 small" role="alert">{error}</div>}
            <button className="btn btn-success btn-lg w-100 fw-bold" type="submit">
              <Icon name="clipboard2-pulse-fill" /> Kiểm tra danh sách thành phần
            </button>
          </form>
        )}

        {/* 5 Lớp kiểm tra tiêu chuẩn */}
        <div className="cx-scan-layers d-flex flex-wrap gap-2 my-3 p-3 bg-light rounded" aria-label="Năm lớp kiểm tra">
          <small className="text-muted fw-bold me-2 align-self-center">5 LỚP KIỂM ĐỊNH:</small>
          {layers.map((layer, index) => (
            <span key={layer} className="badge bg-white text-dark border px-2 py-1">
              <b className="text-success me-1">{index + 1}.</b> {layer}
            </span>
          ))}
        </div>

        {/* KẾT QUẢ PHÂN TÍCH AI VISION */}
        {aiResult && (
          <section
            className={`alert ${
              aiResult.status === 'clear'
                ? 'alert-success border-success'
                : aiResult.status === 'warning'
                ? 'alert-danger border-danger'
                : 'alert-warning border-warning'
            } mt-4 p-4 rounded-3 shadow-sm`}
            aria-label="Kết quả phân tích hình ảnh AI"
          >
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="fs-3">
                <Icon
                  name={
                    aiResult.status === 'clear'
                      ? 'check-circle-fill text-success'
                      : aiResult.status === 'warning'
                      ? 'x-circle-fill text-danger'
                      : 'exclamation-triangle-fill text-warning'
                  }
                />
              </span>
              <h2 className="h4 mb-0 fw-bold">
                {aiResult.status === 'clear'
                  ? 'PHÙ HỢP VỚI CHẾ ĐỘ ĂN CHAY'
                  : aiResult.status === 'warning'
                  ? 'KHÔNG PHÙ HỢP — PHÁT HIỆN THÀNH PHẦN VI PHẠM'
                  : 'CẦN THẬN TRỌNG — CÓ NGUY CƠ GIA VỊ ẨN'}
              </h2>
            </div>

            <p className="mb-2">
              Món <strong>“{aiResult.dishName || name || 'Món đã quét'}”</strong> ({aiResult.detectedScanType === 'LABEL' ? 'Bao bì nhãn thành phần' : 'Đĩa món ăn chế biến'}) đã được thẩm định theo chế độ <strong>{selectedDiet?.name || 'Ăn chay'}</strong>.
            </p>

            <p className="fw-semibold text-secondary mb-3">{aiResult.summary}</p>

            {/* Thành phần vi phạm hoặc cảnh báo */}
            {aiResult.findings?.length > 0 && (
              <div className="card mb-3 border-0 bg-white shadow-sm p-3">
                <h3 className="h6 text-danger fw-bold mb-2">
                  <Icon name="exclamation-octagon-fill" /> Các thành phần phát hiện vi phạm / cần lưu ý:
                </h3>
                <ul className="list-group list-group-flush small">
                  {aiResult.findings.map((finding, idx) => (
                    <li key={idx} className="list-group-item d-flex justify-content-between align-items-start px-0">
                      <div>
                        <strong>{finding.ingredient}</strong>: {finding.reason}
                      </div>
                      <span className={`badge ${finding.severity === 'violation' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                        Lớp {finding.layer}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Nguyên liệu chay an toàn */}
            {aiResult.identifiedIngredients?.length > 0 && (
              <div className="mb-3">
                <span className="fw-semibold small text-muted">Nguyên liệu thực vật an toàn đã phát hiện: </span>
                <div className="d-flex flex-wrap gap-1 mt-1">
                  {aiResult.identifiedIngredients.map((item, idx) => (
                    <span key={idx} className="badge bg-success-subtle text-success border border-success-subtle">
                      ✓ {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Checklist hỏi quán ăn ngoài */}
            {aiResult.restaurantChecklist?.length > 0 && (
              <div className="card mb-3 border-0 bg-white shadow-sm p-3">
                <h3 className="h6 text-primary fw-bold mb-2">
                  <Icon name="chat-square-quote-fill" /> Câu hỏi nhanh khi dùng bữa ngoài quán:
                </h3>
                <ul className="mb-0 small text-secondary">
                  {aiResult.restaurantChecklist.map((question, idx) => (
                    <li key={idx} className="mb-1">{question}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Ước tính dinh dưỡng */}
            {aiResult.nutritionEstimate?.calories > 0 && (
              <div className="row g-2 mb-3 text-center">
                <div className="col-3">
                  <div className="bg-white rounded p-2 shadow-sm">
                    <div className="small text-muted">Năng lượng</div>
                    <strong className="text-success">{aiResult.nutritionEstimate.calories} kcal</strong>
                  </div>
                </div>
                <div className="col-3">
                  <div className="bg-white rounded p-2 shadow-sm">
                    <div className="small text-muted">Chất đạm</div>
                    <strong className="text-primary">{aiResult.nutritionEstimate.protein}g</strong>
                  </div>
                </div>
                <div className="col-3">
                  <div className="bg-white rounded p-2 shadow-sm">
                    <div className="small text-muted">Đường bột</div>
                    <strong className="text-warning">{aiResult.nutritionEstimate.carbs}g</strong>
                  </div>
                </div>
                <div className="col-3">
                  <div className="bg-white rounded p-2 shadow-sm">
                    <div className="small text-muted">Chất béo</div>
                    <strong className="text-danger">{aiResult.nutritionEstimate.fat}g</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Hành động liên kết thông minh */}
            <div className="d-flex flex-wrap gap-2 pt-2 border-top">
              {aiResult.status === 'warning' && (
                <button
                  type="button"
                  className="btn btn-warning btn-sm fw-bold"
                  onClick={() => navigate('/doi-mon-chay')}
                >
                  <Icon name="arrow-repeat" /> Tìm món chay thay thế (Đổi món)
                </button>
              )}
              {aiResult.status === 'clear' && (
                <button
                  type="button"
                  className="btn btn-success btn-sm fw-bold"
                  onClick={() => navigate('/nhat-ky')}
                >
                  <Icon name="journal-bookmark-fill" /> Lưu vào Nhật ký ăn uống
                </button>
              )}
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => navigate('/quan-chay')}
              >
                <Icon name="geo-alt-fill" /> Tìm quán chay lân cận
              </button>
            </div>
          </section>
        )}

        {/* KẾT QUẢ PHÂN TÍCH NHẬP TAY (TEXT) */}
        {textResult && (
          <section className={`cx-scan-result is-${textResult.status} mt-4 p-3 rounded alert alert-info`} aria-label="Kết quả kiểm tra văn bản">
            <h2 className="h5 fw-bold">
              <Icon name={textResult.status === 'warning' ? 'x-circle-fill text-danger' : 'check-circle-fill text-success'} /> Kết quả đối chiếu từ khóa
            </h2>
            <p className="mb-2">
              Đã kiểm tra danh sách thành phần theo chế độ <strong>{selectedDiet?.name || 'Chưa chọn'}</strong>.
            </p>
            {textResult.findings.length > 0 ? (
              <ul className="mb-2 small">
                {textResult.findings.map((finding, index) => (
                  <li key={`${finding.ingredient}-${index}`} className="text-danger">
                    <strong>{finding.ingredient}:</strong> {finding.reason} (Lớp {finding.layer})
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-success small mb-0">Chưa phát hiện từ khóa thành phần không phù hợp trong danh sách bạn nhập.</p>
            )}
          </section>
        )}
      </section>
    </main>
  );
}
