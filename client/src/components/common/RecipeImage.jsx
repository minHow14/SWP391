// D:/SWP391/SWP391/client/src/components/common/RecipeImage.jsx
import ContentImage from './ContentImage.jsx';

export default function RecipeImage({ src, alt, className = '' }) {
  const referencePhoto = src?.startsWith('/uploads/recipes/');
  return <figure className="position-relative m-0 h-100">
    <ContentImage src={src} alt={alt} className={className} />
    {referencePhoto && <figcaption className="position-absolute top-0 start-0 m-2 badge text-bg-light">
      Ảnh món ăn tham khảo
    </figcaption>}
  </figure>;
}
