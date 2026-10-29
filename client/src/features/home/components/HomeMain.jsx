// client/src/features/home/components/HomeMain.jsx
import { useState } from 'react';
import { Button, Card, Col, Container, Row } from 'react-bootstrap';
import { Link } from 'react-router';
import { useDatabase } from '../../../hooks/useDatabase.js';
import HomeContentDialog from './HomeContentDialog.jsx';
import PostMedia from '../../community/components/PostMedia.jsx';
import ContentImage from '../../../components/common/ContentImage.jsx';
import heroPhoto from '../../../assets/images/chayxanh-bowl.webp';

export default function HomeMain() {
  const { data } = useDatabase();
  const [detail, setDetail] = useState(null);
  const videos = data.posts.filter(post => post.post_type === 'VIDEO');
  const articles = data.posts.filter(post => post.post_type === 'BLOG');
  const openDetail = (kind, item) => setDetail({ kind, item });

  return (
    <main className="home-content cx-home flex-grow-1 pb-5">
      <Container fluid className="cx-home-shell">
        <section className="cx-hero">
          <div className="cx-hero-copy">
            <p className="cx-eyebrow">CĂN BẾP XANH CỦA BẠN</p>
            <h1>Ăn chay ngon.<br /><span>Sống xanh mỗi ngày.</span></h1>
            <p className="cx-hero-description">Công thức, nguyên liệu và trải nghiệm từ cộng đồng ChayXanh.</p>
            <div className="d-flex flex-wrap gap-2 mt-4">
              <Button as={Link} to="/nhat-ky" variant="success" className="cx-hero-cta">Nhật ký bữa ăn</Button>
              <Button as={Link} to="/tu-dien-chay" variant="light" className="cx-outline-button cx-hero-cta">Tra cứu nguyên liệu</Button>
            </div>
            <div className="d-flex flex-wrap gap-4 mt-4 small text-secondary">
              <span>{data.recipes.length} công thức</span><span>{data.restaurants.length} quán chay</span><span>{articles.length} bài chia sẻ</span>
            </div>
          </div>
          <div className="cx-hero-media">
            <ContentImage src={heroPhoto} alt="Bữa ăn thực vật ChayXanh" className="cx-hero-photo" />
          </div>
        </section>
        <section className="cx-section">
          <div className="cx-home-section-heading">
            <h2 className="cx-section-title">Món Ăn Gợi Ý Cho Bạn</h2>
            <Link className="cx-home-section-link" to="/cong-thuc">Xem tất cả <i className="bi bi-arrow-right" aria-hidden="true" /></Link>
          </div>
          <Row className="g-4">{data.recipes.slice(0, 4).map(recipe => (
            <Col md={6} xl={3} key={recipe.recipe_id}>
              <Card className="cx-home-interactive-card border-0 rounded-4 h-100 overflow-hidden">
                <Button variant="link" className="cx-home-media" aria-label={`Xem công thức ${recipe.recipe_name}`} onClick={() => openDetail('recipe', recipe)}>
                  <ContentImage src={recipe.image} alt={recipe.recipe_name} className="cx-recipe-image" />
                </Button>
                <Card.Body className="p-3">
                  <h3 className="h6 fw-bold">{recipe.recipe_name}</h3>
                  <p className="small text-secondary">{recipe.prep_time} phút · {recipe.total_calories} kcal</p>
                </Card.Body>
              </Card>
            </Col>
          ))}</Row>
          {!data.recipes.length && <p>Chưa có công thức. Hãy quay lại sau nhé.</p>}
        </section>
        <section className="cx-section cx-home-videos">
          <h2 className="cx-section-title mb-3">Video Từ Cộng Đồng</h2>
          <Row className="g-4">{videos.map(video => (
            <Col xs={12} md={6} xl={3} key={video.post_id}>
              <Card className="cx-home-interactive-card cx-home-video-card border-0 rounded-4 overflow-hidden h-100">
                <Button variant="link" className="cx-home-media cx-home-video-preview" aria-label={`Xem video ${video.title}`} onClick={() => openDetail('video', video)}>
                  <ContentImage src={video.thumbnail_url} alt={video.title} />
                  <span className="cx-home-play"><i className="bi bi-play-fill" aria-hidden="true" /></span>
                  <span className="cx-home-media-hint">Xem video</span>
                </Button>
                <Card.Body className="p-3"><h3 className="h6 fw-bold">{video.title}</h3><p className="small text-secondary">{video.author_full_name}</p></Card.Body>
              </Card>
            </Col>
          ))}</Row>
          {!videos.length && <p>Chưa có video.</p>}
        </section>
        <section className="cx-section">
          <div className="cx-home-section-heading">
            <h2 className="cx-section-title">Góc Chia Sẻ Cộng Đồng</h2>
            <Link className="cx-home-section-link" to="/cong-dong">Xem bảng tin <i className="bi bi-arrow-right" aria-hidden="true" /></Link>
          </div>
          <Row className="g-4">{articles.slice(0, 4).map(post => (
            <Col md={6} key={post.post_id}>
              <Card className="cx-home-interactive-card border-0 rounded-4 p-4 h-100">
                <h3 className="h6 fw-bold">{post.title}</h3><p className="small text-secondary">{post.content}</p>
                <PostMedia attachments={post.attachments} />
                <p className="small mt-3 mb-0">{post.author_full_name} · {post.comments.length} bình luận</p>
                <Button variant="outline-success" size="sm" className="align-self-start mt-3" onClick={() => openDetail('article', post)}>Xem chi tiết</Button>
              </Card>
            </Col>
          ))}</Row>
          {!articles.length && <p>Chưa có bài chia sẻ.</p>}
        </section>
        <section className="cx-section">
          <div className="cx-home-section-heading">
            <h2 className="cx-section-title">Quán Chay & Nhà Hàng</h2>
            <Link className="cx-home-section-link" to="/quan-chay">Xem bản đồ <i className="bi bi-arrow-right" aria-hidden="true" /></Link>
          </div>
          <Row className="g-4">{data.restaurants.slice(0, 4).map(place => (
            <Col md={6} xl={3} key={place.id}>
              <Card as={Link} to="/quan-chay" className="cx-home-place-link cx-home-interactive-card border-0 rounded-4 overflow-hidden h-100" aria-label={`${place.name} — Xem trang Quán chay`}>
                <div className="cx-home-media">
                  <ContentImage src={place.image} alt={place.name} className="cx-recipe-image" />
                  <span className="cx-home-media-hint">Khám phá quán chay <i className="bi bi-arrow-right" aria-hidden="true" /></span>
                </div>
                <Card.Body className="p-3">
                  <h3 className="h6 fw-bold">{place.name}</h3><p className="small text-secondary">{place.address}</p>
                  {place.rating !== null && <p className="small">⭐ {place.rating}</p>}
                </Card.Body>
              </Card>
            </Col>
          ))}</Row>
          {!data.restaurants.length && <p>Chưa có quán chay.</p>}
        </section>
      </Container>
      {detail && <HomeContentDialog detail={detail} onClose={() => setDetail(null)} />}
    </main>
  );
}
