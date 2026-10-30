// D:/SWP391/SWP391/client/src/features/videoRecipeSummary/components/VideoRecipeMessage.jsx
import { Alert, Button, Spinner } from 'react-bootstrap';
import { Link } from 'react-router';
import '../styles/videoRecipeSummary.css';

const STAGE_LABELS = { VALIDATING_VIDEO: 'Đang kiểm tra video và thời lượng…', FETCHING_AUDIO: 'Đang lấy âm thanh…',
  TRANSCRIBING: 'Đang chuyển giọng nói thành văn bản…', SUMMARIZING: 'Đang tạo công thức…', SAVING_RESULT: 'Đang hoàn tất công thức…' };

function statusLabel(message) {
  if (message.preparing) return 'Đang gửi yêu cầu xử lý video…';
  if (message.job?.status === 'PENDING') return message.job.errorCode === 'VIDEO_AI_RATE_LIMITED'
    ? 'Đang chờ hạn mức nhận dạng để thử lại…' : 'Video đang chờ xử lý…';
  if (message.job?.status === 'COMPLETED') return 'Đang tải công thức đã tạo…';
  return STAGE_LABELS[message.job?.stage] || 'Đang theo dõi xử lý video…';
}

function RecipeContent({ recipe }) {
  return <>
    <h3 className="cx-video-recipe-title">{recipe.title || 'Công thức từ video'}</h3>
    <h4 className="cx-video-recipe-label">Nguyên liệu</h4>
    {recipe.ingredients.length ? <ul>{recipe.ingredients.map((item, index) => <li key={index}>
      <strong>{item.name}</strong> — {item.quantity ? [item.quantity, item.unit].filter(Boolean).join(' ') : 'Chưa nêu định lượng'}
    </li>)}</ul> : <p>Video chưa nêu rõ danh sách nguyên liệu.</p>}
    <h4 className="cx-video-recipe-label">Cách làm</h4>
    <ol>{recipe.steps.map((step, index) => <li key={index}>{step.instruction}</li>)}</ol>
    <p className="cx-video-recipe-note">Hướng dẫn được trích từ lời nói trong video. Hãy đối chiếu video khi có thông tin chưa rõ.</p>
  </>;
}

export default function VideoRecipeMessage({ message, busy, onRetry }) {
  const failure = message.observationError || (message.job?.status === 'FAILED' && message.job.errorMessage);
  return <div className="cx-video-recipe">
    {message.pending && <div className="cx-video-recipe-progress" role="status" aria-live="polite">
      <Spinner animation="border" size="sm" aria-hidden="true" /><span>{statusLabel(message)}</span>
    </div>}
    {message.summary?.recipe && <RecipeContent recipe={message.summary.recipe} />}
    {failure && <Alert variant="danger" className="mb-2" role="alert">{failure}</Alert>}
    {message.requestId && failure && <p className="cx-video-recipe-note">Mã yêu cầu: {message.requestId}</p>}
    {message.needsLogin ? <Link to="/dang-nhap">Đăng nhập để tạo công thức</Link> : failure && <Button
      variant="outline-success" size="sm" disabled={busy} onClick={() => onRetry(message)}>
      {message.historyError ? 'Tải lại lịch sử video' : message.job?.status === 'FAILED' ? 'Thử tạo lại' : message.job ? 'Tiếp tục theo dõi' : 'Gửi lại yêu cầu'}
    </Button>}
    {message.videoUrl && <a className="cx-video-recipe-source" href={message.videoUrl} target="_blank" rel="noopener noreferrer">Xem video nguồn <i className="bi bi-box-arrow-up-right" aria-hidden="true" /></a>}
  </div>;
}
