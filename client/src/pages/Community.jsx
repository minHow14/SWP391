import {
  DEMO_USER_ID,
  createDemoId,
  formatCreatedAt,
} from '../lib/modelFields.js';
import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router';
import { communityPosts, communityCategories } from '../data/community.js';
import ContentDialog from '../components/ContentDialog.jsx';
import ContentImage from '../components/ContentImage.jsx';
import PostMedia from '../components/PostMedia.jsx';
import {
  POST_MEDIA_ACCEPT,
  validatePostAttachments,
} from '../lib/postAttachments.js';

export default function Community() {
  const {
    personalPosts,
    setPersonalPosts,
    createPostAttachment,
    releasePostAttachment,
  } = useOutletContext();
  const [view, setView] = useState('feed');
  const [category, setCategory] = useState(null);
  const [liked, setLiked] = useState([]);
  const [extraComments, setExtraComments] = useState({});
  const [commentPostId, setCommentPostId] = useState(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const draftUrls = useRef(new Set());
  useEffect(() => {
    const urls = draftUrls.current;
    return () => urls.forEach(releasePostAttachment);
  }, [releasePostAttachment]);
  const [postDraft, setPostDraft] = useState({
    title: '',
    content: '',
    category_id: 6,
  });
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const allPosts = [...personalPosts, ...communityPosts];
  const visiblePosts = (view === 'mine' ? personalPosts : allPosts).filter(
    (post) => category === null || post.category_id === category
  );
  const commentPost = allPosts.find((post) => post.post_id === commentPostId);
  const commentList = commentPost
    ? [...commentPost.comments, ...(extraComments[commentPost.post_id] || [])]
    : [];

  function discardDraftMedia() {
    draftUrls.current.forEach(releasePostAttachment);
    draftUrls.current.clear();
  }

  function closeComposer() {
    discardDraftMedia();
    setComposing(false);
    setEditingId(null);
    setAttachments([]);
    setPostDraft({ title: '', content: '', category_id: 6 });
    setFormError('');
  }

  function openComposer(post) {
    discardDraftMedia();
    setEditingId(post?.post_id || null);
    setPostDraft(
      post
        ? {
            title: post.title,
            content: post.content,
            category_id: post.category_id,
          }
        : { title: '', content: '', category_id: 6 }
    );
    setAttachments(post?.attachments || []);
    setFormError('');
    setComposing(true);
  }

  function attachMedia(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    const error = validatePostAttachments(files, attachments.length);
    if (error) {
      setFormError(error);
      return;
    }
    const newAttachments = files.map((file) => createPostAttachment(file));
    newAttachments.forEach((item) => draftUrls.current.add(item.url));
    setAttachments((previous) => [...previous, ...newAttachments]);
    setFormError('');
  }

  function removeAttachment(attachment) {
    if (draftUrls.current.delete(attachment.url))
      releasePostAttachment(attachment.url);
    setAttachments((previous) =>
      previous.filter((item) => item.id !== attachment.id)
    );
    setFormError('');
  }

  function publishPost(event) {
    event.preventDefault();
    const title = postDraft.title.trim();
    const content = postDraft.content.trim();
    if (title.length < 6 || content.length < 10) {
      setFormError(
        'Tiêu đề cần ít nhất 6 ký tự và nội dung cần ít nhất 10 ký tự.'
      );
      return;
    }
    if (editingId) {
      const originalPost = personalPosts.find(
        (post) => post.post_id === editingId
      );
      if (!originalPost) {
        setFormError('Không tìm thấy bài viết của bạn để chỉnh sửa.');
        return;
      }
      const retainedUrls = new Set(attachments.map((item) => item.url));
      originalPost.attachments?.forEach((item) => {
        if (!retainedUrls.has(item.url)) releasePostAttachment(item.url);
      });
      setPersonalPosts((previous) =>
        previous.map((post) =>
          post.post_id === editingId
            ? {
                ...post,
                title,
                content,
                category_id: postDraft.category_id,
                attachments: [...attachments],
                edited: true,
              }
            : post
        )
      );
    } else {
      const post = {
        post_id: createDemoId(),
        author_id: DEMO_USER_ID,
        author_full_name: 'Bạn',
        post_type: 'BLOG',
        status: 'DRAFT',
        attached_video_id: null,
        initials: 'B',
        created_at: new Date().toISOString(),
        location: 'Cộng đồng ChayXanh',
        category_id: postDraft.category_id,
        title,
        content,
        vote_count: 0,
        comments: [],
        image: null,
        attachments: [...attachments],
      };
      setPersonalPosts((previous) => [post, ...previous]);
    }
    // Published files are owned by SiteLayout, not the draft cleanup.
    draftUrls.current.clear();
    setAttachments([]);
    setEditingId(null);
    setPostDraft({ title: '', content: '', category_id: 6 });
    setFormError('');
    setComposing(false);
    setCategory(null);
    setView('mine');
    setNotice(
      editingId
        ? 'Đã lưu chỉnh sửa bài viết của bạn.'
        : 'Đã thêm bài viết mẫu của bạn, bao gồm ảnh/video đính kèm.'
    );
  }

  function addComment(event) {
    event.preventDefault();
    const content = commentDraft.trim();
    if (!content || !commentPost) return;
    const id = commentPost.post_id;
    setExtraComments((previous) => ({
      ...previous,
      [id]: [
        ...(previous[id] || []),
        {
          comment_id: createDemoId(),
          post_id: id,
          user_id: DEMO_USER_ID,
          user_full_name: 'Bạn',
          content,
          created_at: new Date().toISOString(),
          is_flagged_by_ai: false,
          status: 'ACTIVE',
        },
      ],
    }));
    setCommentDraft('');
  }

  return (
    <main
      className="cx-explore-page flex-grow-1"
      aria-label="Cộng đồng ChayXanh"
    >
      <div className="container-fluid cx-explore-shell cx-community-shell">
        <section
          className="cx-page-toolbar cx-community-toolbar"
          aria-labelledby="community-title"
        >
          <div>
            <h1 id="community-title">
              <span className="cx-heading-icon">
                <i className="bi bi-people-fill" aria-hidden="true" />
              </span>
              Cộng Đồng ChayXanh
            </h1>
            <p>
              Nơi kết nối, chia sẻ kinh nghiệm ăn chay và cùng khám phá những
              bữa ăn xanh.
            </p>
          </div>
          <div className="cx-community-actions">
            <div className="cx-feed-tabs" aria-label="Chọn bảng tin">
              <button
                type="button"
                className={view === 'feed' ? 'is-active' : ''}
                aria-pressed={view === 'feed'}
                onClick={() => {
                  setView('feed');
                  setCategory(null);
                }}
              >
                <i className="bi bi-globe" aria-hidden="true" /> Bảng Tin
              </button>
              <button
                type="button"
                className={view === 'mine' ? 'is-active' : ''}
                aria-pressed={view === 'mine'}
                onClick={() => {
                  setView('mine');
                  setCategory(null);
                }}
              >
                <i className="bi bi-folder-fill" aria-hidden="true" /> Bài Viết
                Của Tôi{' '}
                <span className="badge rounded-pill bg-warning text-dark">
                  {personalPosts.length}
                </span>
              </button>
            </div>
            <button
              type="button"
              className="btn btn-success rounded-pill fw-semibold"
              onClick={() => openComposer()}
            >
              <i className="bi bi-pencil-square me-2" aria-hidden="true" />
              Đăng Bài Viết Mới
            </button>
          </div>
        </section>
        <div
          className="cx-category-filters cx-community-filters"
          aria-label="Lọc chủ đề bài viết"
        >
          {communityCategories.map((item) => (
            <button
              type="button"
              key={item.category_id ?? 'all'}
              className={category === item.category_id ? 'is-active' : ''}
              aria-pressed={category === item.category_id}
              onClick={() => setCategory(item.category_id)}
            >
              <i className={`bi bi-${item.icon}`} aria-hidden="true" />
              {item.name}
            </button>
          ))}
        </div>
        <p className="cx-sample-note">
          Bài viết và tương tác minh họa. Nội dung của bạn chỉ lưu tạm trong lần
          mở web này.
        </p>
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
        <div className="row g-4">
          {visiblePosts.map((post) => {
            const label = communityCategories.find(
              (item) => item.category_id === post.category_id
            )?.name;
            const isLiked = liked.includes(post.post_id);
            const isOwn = personalPosts.some(
              (item) => item.post_id === post.post_id
            );
            return (
              <div key={post.post_id} className="col-12 col-lg-6">
                <article className="cx-post-card h-100">
                  <div className="cx-post-body">
                    <div className="cx-post-author-row">
                      <span className="cx-post-avatar">{post.initials}</span>
                      <div className="flex-grow-1">
                        <strong>{post.author_full_name}</strong>
                        <span className="cx-post-metadata">
                          <i className="bi bi-clock" aria-hidden="true" />{' '}
                          {formatCreatedAt(post.created_at)}
                          {post.edited ? ' (đã chỉnh sửa)' : ''} ·{' '}
                          <i className="bi bi-geo-alt" aria-hidden="true" />{' '}
                          {post.location}
                        </span>
                      </div>
                      <span className="cx-post-category">{label}</span>
                      {isOwn && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success cx-post-edit"
                          aria-label={`Chỉnh sửa bài ${post.title}`}
                          onClick={() => openComposer(post)}
                        >
                          <i className="bi bi-pencil" aria-hidden="true" /> Sửa
                        </button>
                      )}
                    </div>
                    <h2>{post.title}</h2>
                    <p className="cx-post-text">{post.content}</p>
                    {post.image && (
                      <ContentImage
                        src={post.image}
                        alt={`Ảnh minh họa: ${post.title}`}
                        className="cx-post-image"
                      />
                    )}
                    <PostMedia attachments={post.attachments} />
                  </div>
                  <div className="cx-post-actions">
                    <button
                      type="button"
                      className={isLiked ? 'is-liked' : ''}
                      aria-pressed={isLiked}
                      aria-label={`${isLiked ? 'Bỏ thích' : 'Thích'} bài ${post.title}`}
                      onClick={() =>
                        setLiked((previous) =>
                          isLiked
                            ? previous.filter((id) => id !== post.post_id)
                            : [...previous, post.post_id]
                        )
                      }
                    >
                      <i
                        className={`bi bi-heart${isLiked ? '-fill' : ''}`}
                        aria-hidden="true"
                      />{' '}
                      {post.vote_count + Number(isLiked)} Thích
                    </button>
                    <button
                      type="button"
                      aria-label={`Bình luận bài ${post.title}`}
                      onClick={() => {
                        setCommentDraft('');
                        setCommentPostId(post.post_id);
                      }}
                    >
                      <i className="bi bi-chat" aria-hidden="true" />{' '}
                      {post.comments.length +
                        (extraComments[post.post_id]?.length || 0)}{' '}
                      Bình luận
                    </button>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
        {!visiblePosts.length && (
          <div className="cx-empty-state">
            <i className="bi bi-chat-square-text" aria-hidden="true" />
            <h2>
              {view === 'mine'
                ? 'Bạn chưa có bài viết trong chủ đề này'
                : 'Chưa có bài viết trong chủ đề này'}
            </h2>
            <p>Chia sẻ trải nghiệm đầu tiên của bạn với cộng đồng.</p>
            <button
              type="button"
              className="btn btn-success"
              onClick={() => openComposer()}
            >
              Viết bài mới
            </button>
          </div>
        )}
      </div>

      {composing && (
        <ContentDialog
          title={editingId ? 'Chỉnh sửa bài viết' : 'Chia sẻ với cộng đồng'}
          onClose={closeComposer}
        >
          <p className="small text-secondary">
            Bài viết mẫu chỉ lưu tại giao diện trong lần mở web này, chưa được
            đăng lên máy chủ.
          </p>
          <form onSubmit={publishPost}>
            <div className="mb-3">
              <label htmlFor="post-category" className="form-label fw-semibold">
                Chủ đề
              </label>
              <select
                id="post-category"
                className="form-select"
                value={postDraft.category_id}
                onChange={(event) =>
                  setPostDraft({
                    ...postDraft,
                    category_id: Number(event.target.value),
                  })
                }
              >
                {communityCategories
                  .filter((item) => item.category_id !== null)
                  .map((item) => (
                    <option
                      value={item.category_id}
                      key={item.category_id ?? 'all'}
                    >
                      {item.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="mb-3">
              <label htmlFor="post-title" className="form-label fw-semibold">
                Tiêu đề
              </label>
              <input
                id="post-title"
                className="form-control"
                value={postDraft.title}
                maxLength={140}
                minLength={6}
                required
                onChange={(event) =>
                  setPostDraft({ ...postDraft, title: event.target.value })
                }
                placeholder="Bạn muốn chia sẻ điều gì?"
              />
            </div>
            <div className="mb-3">
              <label htmlFor="post-content" className="form-label fw-semibold">
                Nội dung
              </label>
              <textarea
                id="post-content"
                rows={6}
                className="form-control"
                value={postDraft.content}
                maxLength={5000}
                minLength={10}
                required
                onChange={(event) =>
                  setPostDraft({ ...postDraft, content: event.target.value })
                }
                placeholder="Viết trải nghiệm, câu hỏi hoặc mẹo nấu ăn của bạn..."
              />
            </div>
            <div className="mb-3">
              <label htmlFor="post-media" className="form-label fw-semibold">
                Ảnh hoặc video đính kèm
              </label>
              <input
                id="post-media"
                type="file"
                className="form-control"
                accept={POST_MEDIA_ACCEPT}
                multiple
                onChange={attachMedia}
                aria-describedby="post-media-help"
              />
              <p id="post-media-help" className="small text-secondary mt-2">
                Tối đa 6 file. Ảnh JPG/PNG/WebP/GIF tối đa 10 MB; video
                MP4/WebM/OGG tối đa 50 MB. File chỉ được xem tại giao diện, chưa
                tải lên máy chủ.
              </p>
              <PostMedia
                attachments={attachments}
                preview
                onRemove={removeAttachment}
              />
            </div>
            {formError && (
              <p role="alert" className="small text-danger">
                {formError}
              </p>
            )}
            <button type="submit" className="btn btn-success w-100 py-2">
              {editingId ? 'Lưu thay đổi' : 'Đăng bài mẫu'}
            </button>
          </form>
        </ContentDialog>
      )}
      {commentPost && (
        <ContentDialog
          title={`Bình luận: ${commentPost.title}`}
          onClose={() => setCommentPostId(null)}
        >
          <div className="cx-comments" role="log" aria-live="polite">
            {commentList.length ? (
              commentList.map((comment) => (
                <div key={comment.comment_id} className="cx-comment">
                  <strong>{comment.user_full_name}</strong>
                  <p>{comment.content}</p>
                </div>
              ))
            ) : (
              <p className="text-secondary">Hãy là người đầu tiên bình luận.</p>
            )}
          </div>
          <form onSubmit={addComment} className="mt-4">
            <label
              htmlFor="community-comment"
              className="form-label fw-semibold"
            >
              Bình luận của bạn
            </label>
            <textarea
              id="community-comment"
              className="form-control mb-3"
              rows={3}
              value={commentDraft}
              maxLength={1000}
              onChange={(event) => setCommentDraft(event.target.value)}
              required
            />
            <button
              type="submit"
              className="btn btn-success w-100"
              disabled={!commentDraft.trim()}
            >
              Gửi bình luận mẫu
            </button>
          </form>
        </ContentDialog>
      )}
    </main>
  );
}
