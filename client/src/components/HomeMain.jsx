import { useEffect, useRef, useState } from 'react';
import { meals, videos, articles, places } from '../data/homeData.js';
import ChatBox from './ChatBox.jsx';
import heroPhoto from '../assets/chayxanh-bowl.webp';
import '../Home.css';

function Icon({ name, className = '' }) {
  return <i className={`bi bi-${name} ${className}`} aria-hidden="true" />;
}

function SectionTitle({ icon, children, action, description }) {
  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <div>
        <h2 className="cx-section-title mb-1">
          <Icon name={icon} className="text-success me-2" />
          {children}
        </h2>
        {description && (
          <p className="small text-secondary mb-0">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

function FoodImage({ src, alt }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <div
      className="bg-success-subtle d-flex align-items-center justify-content-center"
      style={{ height: 180 }}
      role="img"
      aria-label={alt}
    >
      <Icon name="flower1" className="display-3 text-success" />
    </div>
  ) : (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="w-100"
      style={{ height: 180, objectFit: 'cover' }}
      onError={() => setFailed(true)}
    />
  );
}

function DetailDialog({ title, children, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="home-dialog-title"
      onCancel={onClose}
      className="border-0 rounded-4 p-0 shadow-lg"
      style={{ width: 'min(600px, calc(100% - 32px))', maxHeight: '85vh' }}
    >
      <div className="d-flex justify-content-between align-items-start gap-3 p-4 border-bottom">
        <h2 id="home-dialog-title" className="h5 fw-bold mb-0">
          {title}
        </h2>
        <button
          type="button"
          className="btn-close flex-shrink-0"
          aria-label="Đóng"
          onClick={onClose}
        />
      </div>
      <div className="p-4">{children}</div>
    </dialog>
  );
}

function TipsList({ compact = false, onOpen, liked, onLike }) {
  return (
    <div
      className={`card cx-tips-list border-0 rounded-4 ${compact ? 'p-3' : 'p-4'}`}
    >
      {articles.map((article, index) => (
        <article
          key={article.id}
          className={index ? 'border-top pt-3 mt-3' : ''}
        >
          <span
            className={`badge bg-${article.tone}-subtle text-${article.tone} mb-2`}
          >
            {article.category}
          </span>
          <h3 className={`${compact ? 'small' : 'h6'} fw-bold mb-2`}>
            <button
              type="button"
              className="btn btn-link text-dark text-start text-decoration-none p-0 fw-bold"
              style={{ fontSize: 'inherit' }}
              onClick={() => onOpen(article)}
            >
              {article.title}
            </button>
          </h3>
          <div className="d-flex justify-content-between align-items-center gap-2 small text-secondary">
            <span>Đăng bởi {article.author}</span>
            <button
              type="button"
              className={`btn btn-sm p-0 text-nowrap ${liked.includes(article.id) ? 'text-success' : 'text-secondary'}`}
              aria-label={`Thích bài ${article.title}`}
              aria-pressed={liked.includes(article.id)}
              onClick={() => onLike(article.id)}
            >
              <Icon name="hand-thumbs-up" />{' '}
              {article.votes + Number(liked.includes(article.id))} vote
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function HomeMain({
  dietName = 'Chưa chọn chế độ ăn',
}) {
  const [dialog, setDialog] = useState(null);
  const [journal, setJournal] = useState([]);
  const [liked, setLiked] = useState([]);
  const [notice, setNotice] = useState('');
  const [selectedFile, setSelectedFile] = useState('');
  const fileInput = useRef(null);
  const closeDialog = () => setDialog(null);
  const openRecipe = (meal) =>
    setDialog({ type: 'recipe', title: meal.name, data: meal });
  const openArticle = (article) =>
    setDialog({ type: 'article', title: article.title, data: article });
  const toggleLike = (id) =>
    setLiked((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  function addMeal(meal) {
    setJournal((previous) => [
      ...previous,
      { ...meal, entryId: `${meal.id}-${Date.now()}-${previous.length}` },
    ]);
    setNotice(`Đã thêm “${meal.name}” vào nhật ký bữa ăn.`);
  }

  return (
    <main
      className="home-content cx-home flex-grow-1 pb-5"
      aria-label="Nội dung trang chủ"
    >
      <div className="container-fluid cx-home-shell">
        <section className="cx-hero" aria-labelledby="welcome-heading">
          <div className="cx-hero-copy">
            <p className="cx-eyebrow">CĂN BẾP XANH CỦA BẠN</p>
            <h1 id="welcome-heading">
              Ăn chay ngon.
              <br />
              <span>Sống xanh mỗi ngày.</span>
            </h1>
            <p className="cx-hero-description">
              Công thức dễ nấu, nguyên liệu quen thuộc. Cùng chuẩn bị một bữa
              chay thật ngon hôm nay.
            </p>
            <div className="d-flex flex-wrap gap-2 mt-4">
              <button
                type="button"
                className="btn btn-success cx-hero-cta"
                onClick={() =>
                  setDialog({
                    type: 'journal',
                    title: 'Nhật ký bữa ăn hôm nay',
                  })
                }
              >
                <Icon name="journal-plus" className="me-2" />
                Nhật ký bữa ăn
                {journal.length > 0 && (
                  <span className="badge bg-white text-success ms-2">
                    {journal.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                className="btn cx-outline-button cx-hero-cta"
                onClick={() => fileInput.current.click()}
              >
                <Icon name="camera" className="me-2" />
                Chụp nguyên liệu
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="visually-hidden"
                aria-label="Chọn ảnh nguyên liệu"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = '';
                  if (!file) return;
                  if (!file.type.startsWith('image/')) {
                    setNotice('Vui lòng chọn một file ảnh.');
                    return;
                  }
                  setSelectedFile(file.name);
                  setDialog({
                    type: 'photo',
                    title: 'Ảnh nguyên liệu đã chọn',
                  });
                }}
              />
            </div>
          </div>
          <img
            src={heroPhoto}
            alt="Bát cơm gạo lứt với đậu hũ áp chảo, bơ và rau củ ngũ sắc"
            className="cx-hero-photo"
            fetchPriority="high"
            width="1536"
            height="1024"
          />
        </section>
        {notice && (
          <div
            className="alert alert-success d-flex justify-content-between gap-3"
            role="status"
          >
            <span>{notice}</span>
            <button
              type="button"
              className="btn-close"
              aria-label="Đóng thông báo"
              onClick={() => setNotice('')}
            />
          </div>
        )}

        <section className="cx-section" aria-labelledby="meals-heading">
          <SectionTitle
            icon="fork-knife"
            description="Khám phá món ngon từ rau củ, đậu và những nguyên liệu quen thuộc."
            action={
              <button
                type="button"
                className="btn btn-link text-success text-decoration-none p-0"
                onClick={() =>
                  setDialog({
                    type: 'all-meals',
                    title: 'Khám phá công thức chay',
                  })
                }
              >
                Xem tất cả <Icon name="arrow-right" />
              </button>
            }
          >
            <span id="meals-heading">Món Ăn Gợi Ý Phù Hợp Cho Bạn</span>
          </SectionTitle>
          <div className="row g-3">
            {meals.map((meal) => (
              <div key={meal.id} className="col-12 col-sm-6 col-xl-3">
                <article className="card cx-food-card h-100 rounded-4 border-0 overflow-hidden">
                  <div className="position-relative">
                    <FoodImage src={meal.image} alt={meal.name} />
                    <span className="badge bg-success position-absolute top-0 start-0 m-2">
                      <Icon name="fire" /> {meal.calories} kcal
                    </span>
                    <span className="badge bg-dark bg-opacity-75 position-absolute top-0 end-0 m-2">
                      {meal.minutes} phút
                    </span>
                  </div>
                  <div className="card-body d-flex flex-column p-3">
                    <div className="d-flex justify-content-between gap-1 mb-2">
                      <span
                        className={`text-${meal.tone} fw-bold`}
                        style={{ fontSize: 10 }}
                      >
                        {meal.category}
                      </span>
                      <span className="small text-warning text-nowrap">
                        <Icon name="star-fill" /> {meal.rating}
                      </span>
                    </div>
                    <h3 className="h6 fw-bold text-dark">{meal.name}</h3>
                    <p className="small text-secondary flex-grow-1">
                      {meal.description}
                    </p>
                    <div className="d-flex justify-content-between align-items-center border-top pt-2 gap-2">
                      <button
                        type="button"
                        className="btn btn-link text-success text-decoration-none p-0 fw-bold"
                        style={{ fontSize: 12 }}
                        onClick={() => openRecipe(meal)}
                      >
                        Xem công thức
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm bg-success-subtle text-success fw-semibold text-nowrap"
                        style={{ fontSize: 12 }}
                        onClick={() => addMeal(meal)}
                      >
                        <Icon name="plus" /> Thêm bữa
                      </button>
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
          <p className="small text-secondary mt-2 mb-0">
            Nội dung minh họa · kcal và đánh giá là dữ liệu mẫu.
          </p>
        </section>

        <div className="row g-4 cx-section">
          <section className="col-lg-8" aria-labelledby="videos-heading">
            <SectionTitle
              icon="play-circle-fill"
              action={
                <span className="small text-secondary">Có tóm tắt văn bản</span>
              }
            >
              <span id="videos-heading">Video Hướng Dẫn Nấu Ăn Nổi Bật</span>
            </SectionTitle>
            <div className="row g-3">
              {videos.map((video) => (
                <div key={video.id} className="col-md-6">
                  <article className="card cx-food-card h-100 rounded-4 border-0 overflow-hidden">
                    <button
                      type="button"
                      className="position-relative border-0 p-0 bg-light w-100"
                      aria-label={`Xem hướng dẫn: ${video.title}`}
                      onClick={() =>
                        setDialog({
                          type: 'video',
                          title: video.title,
                          data: video,
                        })
                      }
                    >
                      <FoodImage src={video.image} alt={video.title} />
                      <span
                        className="position-absolute top-50 start-50 translate-middle rounded-circle bg-danger text-white d-flex align-items-center justify-content-center"
                        style={{ width: 52, height: 52 }}
                      >
                        <Icon name="play-fill" className="fs-2" />
                      </span>
                      <span className="badge bg-dark bg-opacity-75 position-absolute bottom-0 end-0 m-2">
                        {video.duration}
                      </span>
                    </button>
                    <div className="card-body p-3">
                      <div className="small text-secondary mb-2">
                        <span className="badge bg-success-subtle text-success me-2">
                          Tóm tắt văn bản
                        </span>
                        {video.views} lượt xem mẫu
                      </div>
                      <h3 className="h6 fw-bold text-dark">{video.title}</h3>
                      <p className="small text-secondary bg-light rounded-3 p-2 mb-0">
                        <Icon name="quote" className="text-success" />
                        <strong>Tóm tắt 3 bước: </strong>
                        {video.summary}
                      </p>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          </section>
          <section className="col-lg-4" aria-labelledby="featured-tips-heading">
            <SectionTitle icon="newspaper">
              <span id="featured-tips-heading">Mẹo Hay & Chia Sẻ</span>
            </SectionTitle>
            <TipsList
              compact
              onOpen={openArticle}
              liked={liked}
              onLike={toggleLike}
            />
          </section>
        </div>
        <section className="cx-section" aria-labelledby="articles-heading">
          <SectionTitle icon="newspaper">
            <span id="articles-heading">Góc Chia Sẻ Cộng Đồng</span>
          </SectionTitle>
          <TipsList onOpen={openArticle} liked={liked} onLike={toggleLike} />
        </section>
        <section aria-labelledby="places-heading">
          <SectionTitle
            icon="shop"
            description="Tham khảo các địa điểm tại TP.HCM. Địa chỉ, giá và đánh giá dưới đây là dữ liệu minh họa."
            action={
              <a
                href="https://www.google.com/maps/search/qu%C3%A1n+chay+TP.HCM"
                target="_blank"
                rel="noreferrer"
                className="btn btn-link text-success text-decoration-none p-0 fw-semibold"
              >
                Xem bản đồ <Icon name="map-fill" />
              </a>
            }
          >
            <span id="places-heading">Quán Chay & Cửa Hàng Nổi Bật</span>
          </SectionTitle>
          <div className="row g-3">
            {places.map((place) => (
              <div className="col-md-6 col-lg-4" key={place.id}>
                <article className="card cx-place-card border-0 rounded-4 h-100 p-4">
                  <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                    <div>
                      <span
                        className={`badge bg-${place.tone}-subtle text-${place.tone} mb-2`}
                      >
                        {place.category}
                      </span>
                      <h3 className="h5 fw-bold text-dark mb-0">
                        {place.name}
                      </h3>
                    </div>
                    <span className="badge bg-warning-subtle text-warning p-2 fs-6">
                      <Icon name="star-fill" />
                      <br />
                      {place.rating}
                    </span>
                  </div>
                  <p className="text-secondary small">
                    <Icon name="geo-alt-fill" className="text-danger me-1" />
                    {place.address}
                  </p>
                  <p className="small text-secondary flex-grow-1">
                    <strong>Món đặc sắc: </strong>
                    {place.description}
                  </p>
                  <div className="border-top pt-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <span className="small fw-bold text-success">
                      {place.price}
                    </span>
                    <a
                      className="btn btn-sm bg-success-subtle text-success rounded-pill fw-semibold"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name} ${place.address}`)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon name="sign-turn-right-fill" /> Chỉ đường
                    </a>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="py-4" aria-hidden="true" />
      <ChatBox dietName={dietName} />

      {dialog && (
        <DetailDialog title={dialog.title} onClose={closeDialog}>
          {dialog.type === 'recipe' && (
            <>
              <p className="small text-secondary">
                Công thức tham khảo · {dialog.data.minutes} phút
              </p>
              <h3 className="h6 fw-bold">Nguyên liệu</h3>
              <ul>
                {dialog.data.ingredients.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <h3 className="h6 fw-bold">Cách làm</h3>
              <ol>
                {dialog.data.steps.map((step) => (
                  <li key={step} className="mb-2">
                    {step}
                  </li>
                ))}
              </ol>
              <button
                type="button"
                className="btn btn-success w-100"
                onClick={() => {
                  addMeal(dialog.data);
                  closeDialog();
                }}
              >
                Thêm vào nhật ký bữa ăn
              </button>
            </>
          )}
          {dialog.type === 'all-meals' && (
            <div className="list-group">
              {meals.map((meal) => (
                <button
                  key={meal.id}
                  type="button"
                  className="list-group-item list-group-item-action d-flex justify-content-between gap-3 py-3"
                  onClick={() => openRecipe(meal)}
                >
                  <span>{meal.name}</span>
                  <Icon name="arrow-right" />
                </button>
              ))}
            </div>
          )}
          {dialog.type === 'journal' && (
            <>
              <p className="text-secondary small">
                Nhật ký tạm của lần mở trang này. Chọn “Thêm bữa” ở món ăn để
                ghi vào nhật ký.
              </p>
              {journal.length ? (
                <>
                  <ul className="list-group mb-3">
                    {journal.map((meal) => (
                      <li
                        key={meal.entryId}
                        className="list-group-item d-flex justify-content-between align-items-center gap-3"
                      >
                        <span>
                          {meal.name}
                          <small className="d-block text-secondary">
                            {meal.calories} kcal tham khảo
                          </small>
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          aria-label={`Xóa ${meal.name} khỏi nhật ký`}
                          onClick={() =>
                            setJournal((previous) =>
                              previous.filter(
                                (entry) => entry.entryId !== meal.entryId
                              )
                            )
                          }
                        >
                          <Icon name="trash" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="fw-bold text-success mb-0">
                    Tổng năng lượng tham khảo:{' '}
                    {journal.reduce((total, meal) => total + meal.calories, 0)}{' '}
                    kcal
                  </p>
                </>
              ) : (
                <div className="text-center bg-light rounded-3 p-4">
                  <Icon name="journal" className="fs-1 text-success" />
                  <p className="mt-2 mb-0">Bạn chưa thêm món ăn nào.</p>
                </div>
              )}
            </>
          )}
          {dialog.type === 'article' && (
            <>
              <span
                className={`badge bg-${dialog.data.tone}-subtle text-${dialog.data.tone} mb-3`}
              >
                {dialog.data.category}
              </span>
              <p>{dialog.data.content}</p>
              <p className="small text-secondary mb-0">
                Bài viết mẫu · {dialog.data.author}
              </p>
            </>
          )}
          {dialog.type === 'video' && (
            <>
              <p>{dialog.data.summary}</p>
              <p className="small text-secondary">
                Giao diện đang dùng nội dung mẫu. Tìm video hướng dẫn tương ứng
                trên YouTube.
              </p>
              <a
                className="btn btn-success"
                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(dialog.data.query)}`}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="youtube" className="me-2" />
                Tìm video hướng dẫn
              </a>
            </>
          )}
          {dialog.type === 'photo' && (
            <>
              <Icon name="image" className="fs-1 text-success" />
              <p className="mt-3 text-break">
                Đã chọn: <strong>{selectedFile}</strong>
              </p>
              <p className="text-secondary mb-0">
                Ảnh chưa được tải lên máy chủ. Chức năng nhận diện nguyên liệu
                sẽ được kết nối sau.
              </p>
            </>
          )}
        </DetailDialog>
      )}
    </main>
  );
}
