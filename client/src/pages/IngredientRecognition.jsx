// client/src/pages/IngredientRecognition.jsx
import { useState, useEffect } from 'react';
import { Container, Row, Col, Alert, Spinner, Tab, Nav, Card, Badge, Button } from 'react-bootstrap';
import { useDatabase } from '../hooks/useDatabase.js';
import { ingredientRecognitionService } from '../services/ingredientRecognitionService.js';
import PhotoUploadZone from '../components/recognition/PhotoUploadZone.jsx';
import RecognizedItemsList from '../components/recognition/RecognizedItemsList.jsx';
import MatchingRecipesList from '../components/recognition/MatchingRecipesList.jsx';

export default function IngredientRecognition() {
  const { data, user } = useDatabase();
  const diets = data?.diets || [];

  const [activeTab, setActiveTab] = useState('scan');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [scanResult, setScanResult] = useState(null);

  // History state
  const [historyItems, setHistoryItems] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const handleAnalyze = async (formData) => {
    setIsLoading(true);
    setErrorMsg('');
    setScanResult(null);

    try {
      const result = await ingredientRecognitionService.recognize(formData);
      setScanResult(result);
    } catch (err) {
      setErrorMsg(err.message || 'Không thể nhận diện ảnh. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistory = async () => {
    if (!user) return;
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const res = await ingredientRecognitionService.getHistory({ page: 1, limit: 10 });
      setHistoryItems(res.data || []);
    } catch (err) {
      setHistoryError(err.message || 'Không thể tải lịch sử quét.');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history' && user) {
      loadHistory();
    }
  }, [activeTab, user]);

  const handleViewHistoricalScan = async (scanId) => {
    setIsLoading(true);
    setErrorMsg('');
    setActiveTab('scan');
    try {
      const detail = await ingredientRecognitionService.getScanById(scanId);
      setScanResult({
        scanId: detail.id,
        imageUrl: detail.imageUrl,
        summary: detail.summary,
        recognizedItems: detail.items || [],
        matchingRecipes: detail.matchingRecipes || [],
      });
    } catch (err) {
      setErrorMsg(err.message || 'Không thể tải chi tiết phiên quét.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <div className="text-center mb-4">
        <h2 className="fw-bold text-success mb-2">
          <i className="bi bi-camera-fill me-2" aria-hidden="true" />
          Nhận Diện Nguyên Liệu & Tủ Lạnh Bằng AI
        </h2>
        <p className="text-muted mx-auto" style={{ maxWidth: '680px' }}>
          Chụp ảnh nguyên liệu hoặc tủ lạnh của bạn. Trợ lý AI sẽ tự động kiểm tra số lượng, đánh giá độ tươi, cảnh báo thực phẩm sắp hỏng và gợi ý các món chay hấp dẫn nấu được ngay!
        </p>
      </div>

      <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
        <Nav variant="pills" className="justify-content-center mb-4">
          <Nav.Item>
            <Nav.Link eventKey="scan" className="fw-semibold">
              <i className="bi bi-camera me-1" aria-hidden="true" /> Quét Ảnh Mới
            </Nav.Link>
          </Nav.Item>
          {user && (
            <Nav.Item>
              <Nav.Link eventKey="history" className="fw-semibold">
                <i className="bi bi-clock-history me-1" aria-hidden="true" /> Lịch Sử Quét
              </Nav.Link>
            </Nav.Item>
          )}
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="scan">
            <Row className="justify-content-center">
              <Col xs={12} lg={8}>
                <PhotoUploadZone onAnalyze={handleAnalyze} isLoading={isLoading} diets={diets} />

                {errorMsg && (
                  <Alert variant="danger" dismissible onClose={() => setErrorMsg('')} className="my-3">
                    <i className="bi bi-exclamation-octagon-fill me-2" aria-hidden="true" />
                    {errorMsg}
                  </Alert>
                )}

                {isLoading && (
                  <Card className="text-center p-5 border-0 shadow-sm my-3">
                    <Card.Body>
                      <Spinner animation="border" variant="success" className="mb-3" />
                      <h6 className="fw-bold">Thị giác máy tính AI đang phân tích ảnh...</h6>
                      <p className="text-muted small mb-0">Đang quét nhận diện nguyên liệu, đo độ tươi và tính toán công thức phù hợp.</p>
                    </Card.Body>
                  </Card>
                )}

                {scanResult && !isLoading && (
                  <div className="mt-4">
                    {scanResult.summary && (
                      <Alert variant="success" className="d-flex align-items-center mb-4">
                        <i className="bi bi-robot fs-4 me-3 text-success" aria-hidden="true" />
                        <div>
                          <strong>Đánh giá tổng quan từ AI:</strong>
                          <p className="mb-0 small">{scanResult.summary}</p>
                        </div>
                      </Alert>
                    )}

                    <RecognizedItemsList items={scanResult.recognizedItems} />
                    <MatchingRecipesList recipes={scanResult.matchingRecipes} />
                  </div>
                )}
              </Col>
            </Row>
          </Tab.Pane>

          {user && (
            <Tab.Pane eventKey="history">
              <Row className="justify-content-center">
                <Col xs={12} lg={8}>
                  {historyLoading ? (
                    <div className="text-center py-5">
                      <Spinner animation="border" variant="success" />
                      <p className="text-muted mt-2 small">Đang nạp lịch sử quét...</p>
                    </div>
                  ) : historyError ? (
                    <Alert variant="danger">{historyError}</Alert>
                  ) : historyItems.length === 0 ? (
                    <Alert variant="info" className="text-center py-4">
                      <i className="bi bi-journal-x fs-3 d-block mb-2" aria-hidden="true" />
                      Bạn chưa có lịch sử quét tủ lạnh nào. Hãy thử chụp ảnh ngay!
                    </Alert>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {historyItems.map((item) => (
                        <Card key={item.id} className="border-0 shadow-sm">
                          <Card.Body className="d-flex justify-content-between align-items-center p-3">
                            <div>
                              <h6 className="fw-bold mb-1">
                                Quét ngày {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                              </h6>
                              <p className="text-muted small mb-0 text-truncate" style={{ maxWidth: '450px' }}>
                                {item.summary || 'Đã phân tích nguyên liệu'}
                              </p>
                              <Badge bg="success" className="mt-1">
                                {item._count?.items || 0} nguyên liệu
                              </Badge>
                            </div>
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => handleViewHistoricalScan(item.id)}
                            >
                              Xem lại kết quả
                            </Button>
                          </Card.Body>
                        </Card>
                      ))}
                    </div>
                  )}
                </Col>
              </Row>
            </Tab.Pane>
          )}
        </Tab.Content>
      </Tab.Container>
    </Container>
  );
}
