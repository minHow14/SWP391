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

export default function MarkdownMessage({ children }) {
  return (
    <div className="cx-chat-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
