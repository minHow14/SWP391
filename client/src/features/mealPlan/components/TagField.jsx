// client/src/features/mealPlan/components/TagField.jsx
// Ô nhập dạng tag (dị ứng, nguyên liệu có sẵn) kèm các gợi ý bấm nhanh.
import { useState } from 'react';

// Component nhập tag; onChange nhận danh sách tag mới.
export default function TagField({ id, label, tags, onChange, hints = [], placeholder }) {
  const [text, setText] = useState('');
  // Thêm tag nếu chưa có (không phân biệt hoa thường).
  const add = (value) => {
    const clean = value.trim();
    if (clean && !tags.some((tag) => tag.toLowerCase() === clean.toLowerCase())) onChange([...tags, clean]);
    setText('');
  };
  // Enter hoặc dấu phẩy để thêm tag (bỏ qua khi đang gõ bộ gõ tiếng Việt), Backspace khi ô trống để xóa tag cuối.
  return (
    <div className="cx-mp-field cx-mp-wide">
      <label htmlFor={id}>{label}</label>
      <div className="cx-mp-tags">
        {tags.map((tag) => (
          <span key={tag} className="cx-mp-tag">
            {tag}
            <button type="button" aria-label={`Bỏ ${tag}`} onClick={() => onChange(tags.filter((item) => item !== tag))}>×</button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          maxLength={60}
          placeholder={tags.length ? '' : placeholder}
          onChange={(event) => setText(event.target.value)}
          onBlur={() => add(text)}
          onKeyDown={(event) => {
            if ((event.key === 'Enter' || event.key === ',') && !event.nativeEvent.isComposing) {
              event.preventDefault();
              add(text);
            } else if (event.key === 'Backspace' && !text && tags.length) onChange(tags.slice(0, -1));
          }}
        />
      </div>
      {hints.length > 0 && (
        <div className="cx-mp-hints">
          {hints.filter((hint) => !tags.includes(hint)).map((hint) => (
            <button type="button" key={hint} onClick={() => add(hint)}>+ {hint}</button>
          ))}
        </div>
      )}
    </div>
  );
}
