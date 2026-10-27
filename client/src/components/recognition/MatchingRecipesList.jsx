// client/src/components/recognition/MatchingRecipesList.jsx
import { Card, Badge, Row, Col, Alert, Button } from 'react-bootstrap';
import { Link } from 'react-router';

const TIER_CONFIG = {
  READY_TO_COOK: { label: 'Nấu được ngay (100%)', bg: 'success', text: 'white' },
  MISSING_FEW: { label: 'Thiếu ít nguyên liệu', bg: 'info', text: 'dark' },
  INSPIRATION: { label: 'Gợi ý thêm', bg: 'secondary', text: 'white' },
};

export default function MatchingRecipesList({ recipes = [] }) {
  if (!recipes || recipes.length === 0) {
    return (
      <Alert variant="warning" className="text-center my-3">
        <i className="bi bi-emoji-neutral me-2" aria-hidden="true" />
        Chưa tìm thấy công thức nấu chay phù hợp với các nguyên liệu đã nhận diện. Bạn có thể thêm thêm nguyên liệu hoặc tìm kiếm công thức khác.
      </Alert>
    );
  }

  return (
    <div className="mb-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h5 className="fw-bold mb-0">
          <i className="bi bi-journal-richtext text-success me-2" aria-hidden="true" />
          Món Chay Đề Xuất Phù Hợp ({recipes.length})
        </h5>
        <small className="text-muted">Ưu tiên món tận dụng thực phẩm cần dùng gấp</small>
      </div>

      <Row className="g-3">
        {recipes.map((recipe) => {
          const tier = TIER_CONFIG[recipe.tier] || TIER_CONFIG.INSPIRATION;

          return (
            <Col xs={12} lg={6} key={recipe.recipeId}>
              <Card className="h-100 border-0 shadow-sm overflow-hidden">
                <Row className="g-0 h-100">
                  {recipe.imageUrl && (
                    <Col xs={12} sm={4} className="bg-light position-relative">
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.recipeName}
                        className="w-100 h-100"
                        style={{ objectFit: 'cover', minHeight: '160px' }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </Col>
                  )}

                  <Col xs={12} sm={recipe.imageUrl ? 8 : 12}>
                    <Card.Body className="d-flex flex-column h-100 p-3">
                      <div className="d-flex justify-content-between align-items-start gap-1 mb-2">
                        <Badge bg={tier.bg} text={tier.text} className="small">
                          {tier.label}
                        </Badge>
                        {recipe.hasExpiringIngredients && (
                          <Badge bg="danger" className="small d-flex align-items-center gap-1">
                            <i className="bi bi-fire" aria-hidden="true" />
                            Cứu đồ sắp hỏng
                          </Badge>
                        )}
                      </div>

                      <h6 className="fw-bold mb-1 text-dark">{recipe.recipeName}</h6>

                      <div className="d-flex gap-3 text-muted small mb-2">
                        {recipe.prepTime ? (
                          <span>
                            <i className="bi bi-clock me-1" aria-hidden="true" />
                            {recipe.prepTime} phút
                          </span>
                        ) : null}
                        {recipe.totalCalories ? (
                          <span>
                            <i className="bi bi-lightning-charge me-1" aria-hidden="true" />
                            {Math.round(recipe.totalCalories)} kcal
                          </span>
                        ) : null}
                        <span className="text-success fw-semibold">
                          <i className="bi bi-pie-chart-fill me-1" aria-hidden="true" />
                          Khớp {recipe.matchPercentage}%
                        </span>
                      </div>

                      <div className="small mb-2 flex-grow-1">
                        <div className="mb-1">
                          <span className="text-muted">Đã có: </span>
                          {recipe.matchedIngredients?.map((name, i) => (
                            <Badge key={i} bg="success" className="me-1 mb-1 fw-normal">
                              ✓ {name}
                            </Badge>
                          ))}
                        </div>

                        {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
                          <div>
                            <span className="text-muted">Cần thêm: </span>
                            {recipe.missingIngredients.map((ing, i) => (
                              <Badge key={i} bg="light" text="dark" className="border me-1 mb-1 fw-normal">
                                + {ing.name} ({ing.quantity} {ing.unit})
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-auto pt-2 border-top d-flex justify-content-end">
                        <Button
                          as={Link}
                          to={`/cong-thuc?id=${recipe.recipeId}`}
                          variant="outline-success"
                          size="sm"
                          className="fw-semibold"
                        >
                          Xem công thức chi tiết <i className="bi bi-arrow-right ms-1" aria-hidden="true" />
                        </Button>
                      </div>
                    </Card.Body>
                  </Col>
                </Row>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}
