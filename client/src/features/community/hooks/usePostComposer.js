// D:/SWP391/SWP391/client/src/features/community/hooks/usePostComposer.js
// Hook logic trình soạn bài đăng cộng đồng: form (zod), đổi loại bài, upload video/ảnh bìa/tệp đính kèm và lưu bài.
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { validatePostAttachments } from '../../../utils/postAttachments.js';
import { savePost, uploadPostMedia } from '../../../services/communityService.js';

// Trích ID video YouTube (11 ký tự) từ các dạng link watch, youtu.be, embed, shorts; trả về null nếu không khớp.
export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : null;
}

// Schema form soạn bài; Blog bắt buộc có nội dung, Video bắt buộc có link video.
const COMPOSER_SCHEMA = z
  .object({
    postType: z.enum(['BLOG', 'VIDEO']).default('BLOG'),
    title: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập tiêu đề.')
      .max(255, 'Tiêu đề tối đa 255 ký tự.'),
    content: z.string().max(50000).optional(),
    videoUrl: z.string().max(500).optional(),
    thumbnailUrl: z.string().max(500).optional(),
    transcript: z.string().max(50000).optional(),
    // Ô chọn chuyên mục trả về chuỗi rỗng khi không chọn -> chuyển thành null trước khi ép kiểu số.
    categoryId: z.preprocess((value) => value === '' ? null : value,
      z.coerce.number().int().positive().nullable().optional()),
  })
  .superRefine((data, ctx) => {
    if (data.postType === 'BLOG') {
      if (!data.content?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['content'],
          message: 'Vui lòng nhập nội dung bài viết.',
        });
      }
    } else if (data.postType === 'VIDEO') {
      if (!data.videoUrl?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['videoUrl'],
          message: 'Vui lòng nhập link video hoặc tải tệp video lên.',
        });
      }
    }
  });

// Hook soạn bài; post rỗng là tạo mới, có post_id là chỉnh sửa.
export function usePostComposer({ post = {}, onSaved }) {
  const initialPostType = post.post_type === 'VIDEO' || post.video_url || post.video ? 'VIDEO' : 'BLOG';
  const [postType, setPostType] = useState(initialPostType);
  // Chuẩn hóa tệp đính kèm cũ (tên field có thể khác nhau giữa các API) và tạo id tạm nếu thiếu.
  const initialAttachments = (post.attachments || []).map((a) => ({
    id: a.attachment_id || a.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Math.random())),
    url: a.file_url || a.url,
    type: String(a.file_type || a.type || 'image').trim().toLowerCase(),
    name: a.file_name || a.name || '',
  }));
  const [attachments, setAttachments] = useState(initialAttachments);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const submitting = useRef(false);

  const form = useForm({
    resolver: zodResolver(COMPOSER_SCHEMA),
    defaultValues: {
      postType: initialPostType,
      title: post.title || post.blog?.title || post.video?.title || '',
      content: post.content || post.blog?.content || '',
      videoUrl: post.videoUrl || post.video_url || post.video?.video_url || '',
      thumbnailUrl: post.thumbnailUrl || post.thumbnail_url || post.video?.thumbnail_url || post.image || '',
      transcript: post.transcript || post.video?.transcript || (initialPostType === 'VIDEO' ? '' : post.content) || '',
      categoryId: post.categoryId || post.category_id || post.post_categories?.[0]?.category_id || '',
    },
  });

  // Đổi loại bài (BLOG/VIDEO) và xóa lỗi validate của loại cũ.
  const changePostType = (type) => {
    setPostType(type);
    form.setValue('postType', type);
    form.clearErrors();
    setError('');
  };

  // Cập nhật link video; nếu là YouTube và chưa có ảnh bìa thì tự lấy ảnh bìa mặc định của YouTube.
  const handleVideoUrlChange = (e) => {
    const val = e.target.value;
    form.setValue('videoUrl', val, { shouldValidate: true });
    const ytId = extractYouTubeId(val);
    if (ytId && !form.getValues('thumbnailUrl')) {
      const autoThumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      form.setValue('thumbnailUrl', autoThumb);
    }
  };

  // Tải trực tiếp tệp video từ máy lên server (tối đa 50MB) và gán URL vào trường videoUrl.
  async function uploadDirectVideo(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Vui lòng chọn một tệp video hợp lệ (MP4, WebM, OGG).');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('Dung lượng tệp video vượt quá giới hạn 50MB.');
      return;
    }

    setError('');
    setUploading(true);
    setProgress(0);

    try {
      const uploaded = await uploadPostMedia([file], (progressEvent) => {
        if (progressEvent.total) {
          setProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      });
      if (uploaded[0]?.url) {
        form.setValue('videoUrl', uploaded[0].url, { shouldValidate: true });
      }
    } catch (failure) {
      setError(failure.message || 'Không thể tải video lên máy chủ.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  // Tải ảnh bìa từ máy lên server (tối đa 10MB) và gán URL vào trường thumbnailUrl.
  async function uploadThumbnail(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn một tệp hình ảnh hợp lệ làm ảnh bìa.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Dung lượng ảnh bìa vượt quá giới hạn 10MB.');
      return;
    }

    setError('');
    setUploading(true);
    setProgress(0);

    try {
      const uploaded = await uploadPostMedia([file], (progressEvent) => {
        if (progressEvent.total) {
          setProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      });
      if (uploaded[0]?.url) {
        form.setValue('thumbnailUrl', uploaded[0].url);
      }
    } catch (failure) {
      setError(failure.message || 'Không thể tải ảnh bìa lên máy chủ.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  // Tải nhiều tệp đính kèm cho bài Blog sau khi kiểm tra số lượng, định dạng và dung lượng.
  async function selectFiles(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    const validationMessage = validatePostAttachments(files, attachments.length);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError('');
    setUploading(true);
    setProgress(0);

    try {
      const uploaded = await uploadPostMedia(files, (progressEvent) => {
        if (progressEvent.total) {
          setProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      });

      const newItems = uploaded.map((file) => ({
        id: crypto.randomUUID(),
        url: file.url,
        type: String(file.type || 'image').trim().toLowerCase(),
        name: file.name,
      }));

      setAttachments((current) => [...current, ...newItems]);
    } catch (failure) {
      setError(failure.message || 'Không thể tải tệp lên. Vui lòng thử lại.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  // Gỡ một tệp đính kèm khỏi danh sách (chưa xóa trên server cho tới khi lưu bài).
  function removeAttachment(attachment) {
    setAttachments((current) => current.filter((item) => item.id !== attachment.id));
    setError('');
  }

  // Lưu bài viết; ref submitting chặn gửi trùng và không cho lưu khi còn tệp đang tải lên.
  async function submit(values) {
    if (submitting.current || uploading) return;
    submitting.current = true;
    setError('');

    try {
      const result = await savePost({
        postId: post.post_id,
        values: {
          ...values,
          postType,
        },
        attachments,
        postType,
      });
      onSaved(result);
    } catch (failure) {
      setError(failure.message || 'Không thể lưu bài viết. Vui lòng thử lại.');
    } finally {
      submitting.current = false;
    }
  }

  return {
    form,
    postType,
    changePostType,
    handleVideoUrlChange,
    uploadDirectVideo,
    uploadThumbnail,
    attachments,
    selectFiles,
    removeAttachment,
    submit: (event) => form.handleSubmit(submit)(event),
    busy: form.formState.isSubmitting || uploading,
    error,
    uploading,
    progress,
  };
}
