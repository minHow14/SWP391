// D:/SWP391/SWP391/client/src/features/home/components/HomeContentDialog.jsx
import { Modal } from 'react-bootstrap';
import RecipeImage from '../../../components/common/RecipeImage.jsx';
import ContentVideo from '../../../components/common/ContentVideo.jsx';
import PostMedia from '../../community/components/PostMedia.jsx';

export default function HomeContentDialog({ detail, onClose }) {
  const { kind, item } = detail;
  const title = item.recipe_name || item.title;

  return (
    <Modal show onHide={onClose} centered scrollable size="lg" className="cx-home-detail" aria-labelledby="cx-home-detail-title">
      <Modal.Header closeButton closeLabel="Đóng hộp thoại">
        <Modal.Title id="cx-home-detail-title" as="h2">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {kind === 'recipe' && <>
          <RecipeImage src={item.image} alt={title} className="cx-home-detail-image" />
          <p className="text-secondary mt-3">{item.prep_time} phút · {item.total_calories} kcal</p>
          <h3 className="h6">Nguyên liệu</h3>
          <ul>{item.ingredients.map(ingredient => <li key={ingredient}>{ingredient}</li>)}</ul>
          <h3 className="h6">Cách nấu</h3>
          <p className="cx-home-detail-text">{item.instructions}</p>
        </>}
        {kind === 'video' && <ContentVideo src={item.video_url} poster={item.thumbnail_url} title={title} />}
        {(kind === 'video' || kind === 'article') && <>
          <p className="small text-secondary mt-3">{item.author_full_name}</p>
          <p className="cx-home-detail-text">{item.content}</p>
        </>}
        {kind === 'article' && <PostMedia attachments={item.attachments} />}
      </Modal.Body>
    </Modal>
  );
}
