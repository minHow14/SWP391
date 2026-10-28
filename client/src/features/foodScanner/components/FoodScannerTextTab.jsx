// client/src/features/foodScanner/components/FoodScannerTextTab.jsx

const Icon = ({ name }) => <i className={`bi bi-${name}`} aria-hidden="true" />;

export default function FoodScannerTextTab({
  ingredients,
  setIngredients,
  error,
  onSubmit,
}) {
  return (
    <form onSubmit={onSubmit} className="mb-4">
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
      {error && (
        <div className="alert alert-danger py-2 small" role="alert">
          {error}
        </div>
      )}
      <button className="btn btn-success btn-lg w-100 fw-bold" type="submit">
        <Icon name="clipboard2-pulse-fill" /> Kiểm tra danh sách thành phần
      </button>
    </form>
  );
}
