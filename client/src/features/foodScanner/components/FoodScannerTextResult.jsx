// client/src/features/foodScanner/components/FoodScannerTextResult.jsx

const Icon = ({ name }) => <i className={`bi bi-${name}`} aria-hidden="true" />;

export default function FoodScannerTextResult({
  textResult,
  selectedDiet,
}) {
  if (!textResult) return null;

  return (
    <section
      className={`cx-scan-result is-${textResult.status} mt-4 p-3 rounded alert alert-info`}
      aria-label="Kết quả kiểm tra văn bản"
    >
      <h2 className="h5 fw-bold">
        <Icon
          name={
            textResult.status === 'warning'
              ? 'x-circle-fill text-danger'
              : 'check-circle-fill text-success'
          }
        />{' '}
        Kết quả đối chiếu từ khóa
      </h2>
      <p className="mb-2">
        Đã kiểm tra danh sách thành phần theo chế độ{' '}
        <strong>{selectedDiet?.name || 'Chưa chọn'}</strong>.
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
        <p className="text-success small mb-0">
          Chưa phát hiện từ khóa thành phần không phù hợp trong danh sách bạn nhập.
        </p>
      )}
    </section>
  );
}
