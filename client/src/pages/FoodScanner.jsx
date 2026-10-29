// D:/SWP391/SWP391/client/src/pages/FoodScanner.jsx
import { useState } from 'react';
import { Alert, Card, Container } from 'react-bootstrap';
import { Link, useOutletContext } from 'react-router';
import { useDatabase } from '../hooks/useDatabase.js';
import AiGenerationHistory from '../features/aiHistory/components/AiGenerationHistory.jsx';
import FoodScannerInputs from '../features/foodScanner/components/FoodScannerInputs.jsx';
import FoodScannerResults from '../features/foodScanner/components/FoodScannerResults.jsx';
import ScanDiaryDialog from '../features/foodScanner/components/ScanDiaryDialog.jsx';
import { useFoodScanner } from '../features/foodScanner/hooks/useFoodScanner.js';

function FoodScannerWorkspace({ data, userId, defaultDietId }) {
  const [dietOverride, setDietOverride] = useState(null);
  const dietId = dietOverride ?? defaultDietId;
  const [saving, setSaving] = useState(false);
  const [savedResult, setSavedResult] = useState(null);
  const scanner = useFoodScanner(dietId);
  function restore(record) {
    scanner.restore(record); setSavedResult(null);
    if (record.requestPayload?.dietTypeId) setDietOverride(record.requestPayload.dietTypeId);
  }
  return <Container as="main" className="cx-scanner-page flex-grow-1 py-4">
    <Card as="section" body className="cx-scanner-card shadow-sm border-0 p-sm-3" aria-labelledby="scanner-title">
      <h1 id="scanner-title" className="h3 text-success fw-bold">Giám Định Món & Quét Nhãn Chay</h1>
      <p className="text-muted">Tải ảnh hoặc nhập thành phần để kiểm tra theo chế độ ăn của bạn. Ảnh không thể xác nhận mọi thành phần hay gia vị ẩn.</p>
      <FoodScannerInputs scanner={scanner} dietOptions={data?.diets || []} diet={{ id: dietId, onChange: setDietOverride }} />
      {savedResult && savedResult === scanner.result && <Alert variant="success" className="mt-3">Đã lưu món ăn vào nhật ký. <Link to="/nhat-ky">Xem nhật ký</Link></Alert>}
      <FoodScannerResults result={scanner.result} textResult={scanner.textResult} onSave={() => { setSaving(true); setSavedResult(null); }} />
      {saving && scanner.result && <ScanDiaryDialog result={scanner.result} userId={userId} onClose={() => setSaving(false)} onSaved={() => { setSaving(false); setSavedResult(scanner.result); }} />}
      <h2 className="h5 mt-4">Lịch sử quét món ăn</h2>
      <AiGenerationHistory key={scanner.historyVersion} userId={userId} type="FOOD_SCAN" onSelect={restore} />
    </Card>
  </Container>;
}

export default function FoodScanner() {
  const { data, user } = useDatabase();
  const { diet } = useOutletContext() || {};
  const userId = user?.user_id;
  return <FoodScannerWorkspace key={userId || 'guest'} data={data} userId={userId} defaultDietId={diet?.diet_type_id ?? 1} />;
}
