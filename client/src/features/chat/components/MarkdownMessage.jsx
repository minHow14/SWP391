// client/src/features/chat/components/MarkdownMessage.jsx
// Hiển thị câu trả lời Markdown của chatbot một cách an toàn.
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Câu trả lời của chatbot là Markdown (in đậm, gạch đầu dòng, bảng...). Không render HTML thô,
// chỉ cho phép http(s) và mailto trong liên kết, và luôn mở liên kết ở tab mới.
const components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

// Component bọc ReactMarkdown; skipHtml để bỏ qua HTML thô, tránh XSS từ nội dung AI sinh ra.
export default function MarkdownMessage({ children }) {
  return (
    <div className="cx-chat-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
