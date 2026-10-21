// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/ingredients/components/IngredientPreview.jsx
import { useEffect, useRef, useState } from 'react';
import ContentImage from '../../../components/common/ContentImage.jsx';

export default function IngredientPreview({ ingredients }) {
  const [demo, setDemo] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState('');
  const upload = useRef(null);
  const sample =
    ingredients.find((item) => item.category === 'mushroom') || ingredients[0];
  useEffect(() => {
    if (photo) return () => URL.revokeObjectURL(photo.url);
  }, [photo]);

  function loadPhoto(file) {
    if (!file) return;
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      setError('Chọn ảnh JPG, PNG hoặc WebP dưới 10 MB.');
      return;
    }
    setPhoto({ url: URL.createObjectURL(file), name: file.name });
    setDemo(false);
    setError('');
  }

  return (
    <section
      className="cx-ingredient-camera"
      aria-label="Tra cứu nguyên liệu"
    >
      <div className="cx-camera-toolbar">
        <div className="cx-camera-heading">
          <span className="cx-camera-icon">
            <i className="bi bi-camera-fill" aria-hidden="true" />
          </span>
          <div>
            <h2>
              Khám phá nguyên liệu <span>Thông tin nguyên liệu</span>
            </h2>
            <p>
              Tìm hiểu nguồn gốc, dinh dưỡng và cách sử dụng nguyên liệu.
            </p>
          </div>
        </div>
        <div className="cx-camera-actions">
          <button
            className="cx-camera-demo"
            type="button"
            disabled={!sample}
            onClick={() => {
              setDemo(!demo);
              setPhoto(null);
              setError('');
            }}
          >
            <i className="bi bi-magic" aria-hidden="true" />{' '}
            {demo ? 'Thu gọn' : 'Xem nguyên liệu gợi ý'}
          </button>
          <button
            className="cx-camera-upload"
            type="button"
            onClick={() => upload.current?.click()}
          >
            <i className="bi bi-upload" aria-hidden="true" /> Tải Ảnh Nguyên
            Liệu
          </button>
        </div>
      </div>
      <input
        ref={upload}
        type="file"
        className="visually-hidden"
        aria-label="Chọn ảnh nguyên liệu"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          loadPhoto(event.target.files[0]);
          event.target.value = '';
        }}
      />
      <p className="cx-camera-note">
        Tìm kiếm theo tên để xem thông tin nguyên liệu. Ảnh tải lên chỉ dùng
        để xem trước.
      </p>
      {error && (
        <p className="cx-camera-error" role="alert">
          {error}
        </p>
      )}
      {photo && (
        <div className="cx-ingredient-upload-preview">
          <img src={photo.url} alt="Ảnh nguyên liệu đã chọn" />
          <div>
            <strong>{photo.name}</strong>
            <p>
              Đã tải ảnh xem trước. Nhập tên nguyên liệu bên dưới để tra cứu
              thông tin.
            </p>
            <button type="button" onClick={() => setPhoto(null)}>
              Xóa ảnh
            </button>
          </div>
        </div>
      )}
      {demo && sample && (
        <div className="cx-ingredient-demo-result" role="status">
          <div className="cx-ingredient-demo-main">
            <div className="cx-ingredient-demo-photo">
              <ContentImage
                src={sample.image}
                alt={`Ảnh nguyên liệu ${sample.name}`}
              />
              <span>Chi tiết nguyên liệu</span>
            </div>
            <div className="cx-ingredient-demo-text">
              <div className="cx-ingredient-demo-title">
                <h3>{sample.name}</h3>
                <span>{sample.origin}</span>
              </div>
              <p>{sample.description}</p>
              <div className="cx-ingredient-facts">
                {[
                  ['Nguồn gốc', sample.origin],
                  ['Đạm / 100g', sample.protein + 'g'],
                  ['Năng lượng / 100g', sample.calories_per_100g + ' kcal'],
                  ['Chất béo / 100g', sample.fat + 'g'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <small>{label}</small>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
