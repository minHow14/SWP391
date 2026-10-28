// client/src/pages/FoodScanner.jsx
import { useState } from 'react';
import { useOutletContext } from 'react-router';
import { useDatabase } from '../hooks/useDatabase.js';
import { useFoodScanner } from '../features/foodScanner/hooks/useFoodScanner.js';
import FoodScannerImageTab from '../features/foodScanner/components/FoodScannerImageTab.jsx';
import FoodScannerTextTab from '../features/foodScanner/components/FoodScannerTextTab.jsx';
import FoodScannerAiResult from '../features/foodScanner/components/FoodScannerAiResult.jsx';
import FoodScannerTextResult from '../features/foodScanner/components/FoodScannerTextResult.jsx';

const layers = [
  'Thịt & hải sản',
  'Chiết xuất phụ phẩm',
  'Trứng, sữa & mật ong',
  'Ngũ vị tân',
  'Dị ứng cá nhân',
];

const Icon = ({ name }) => <i className={`bi bi-${name}`} aria-hidden="true" />;

export default function FoodScanner() {
  const { data } = useDatabase();
  const dietOptions = data.diets || [];
  const recipe = data.recipes?.[0];
  const scanDemo = recipe ? { name: recipe.recipe_name, ingredients: recipe.ingredients.join(', ') } : null;
  const demoImage = recipe?.image;
  const { diet } = useOutletContext() || { diet: { diet_type_id: 1 } };

  const [dietOverride, setDietOverride] = useState(null);
  const dietId = dietOverride ?? diet?.diet_type_id ?? 1;
  const selectedDiet = dietOptions.find((item) => item.diet_type_id === dietId);

  const {
    activeTab,
    setActiveTab,
    name,
    setName,
    ingredients,
    setIngredients,
    scanType,
    setScanType,
    photo,
    setPhoto,
    loading,
    error,
    setError,
    textResult,
    aiResult,
    handleFileSelected,
    useDemoRecipe,
    handleAiAnalyze,
    handleTextAnalyze,
  } = useFoodScanner(scanDemo, demoImage, dietId);

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
              onClick={() => {
                setActiveTab('image');
                setError('');
              }}
            >
              <Icon name="camera-fill" /> Quét bằng hình ảnh (AI Vision)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'text' ? 'btn-success' : 'btn-outline-success'}`}
              onClick={() => {
                setActiveTab('text');
                setError('');
              }}
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
          <FoodScannerImageTab
            scanType={scanType}
            setScanType={setScanType}
            photo={photo}
            setPhoto={setPhoto}
            loading={loading}
            error={error}
            setError={setError}
            onSubmit={handleAiAnalyze}
            onFileSelected={handleFileSelected}
            onUseDemo={useDemoRecipe}
          />
        )}

        {/* Tab 2: Nhập danh sách thành phần văn bản */}
        {activeTab === 'text' && (
          <FoodScannerTextTab
            ingredients={ingredients}
            setIngredients={setIngredients}
            error={error}
            onSubmit={handleTextAnalyze}
          />
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
        <FoodScannerAiResult
          aiResult={aiResult}
          dishName={name}
          selectedDiet={selectedDiet}
        />

        {/* KẾT QUẢ PHÂN TÍCH NHẬP TAY (TEXT) */}
        <FoodScannerTextResult
          textResult={textResult}
          selectedDiet={selectedDiet}
        />
      </section>
    </main>
  );
}
