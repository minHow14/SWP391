// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/mealPlan/components/TagField.jsx
import { useState } from 'react';

export default function TagField({ id, label, tags, onChange, hints = [], placeholder }) {
  const [text, setText] = useState('');
  const add = (value) => {
    const clean = value.trim();
    if (clean && !tags.some((tag) => tag.toLowerCase() === clean.toLowerCase())) onChange([...tags, clean]);
    setText('');
  };
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
