// client/src/features/community/hooks/usePostComposer.js
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { validatePostAttachments } from '../../../utils/postAttachments.js';
import { savePost, uploadPostMedia } from '../../../services/communityService.js';

export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  return match ? match[1] : null;
}

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
    categoryId: z.coerce.number().int().positive().nullable().optional(),
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

export function usePostComposer({ post = {}, onSaved }) {
  const initialPostType = post.post_type === 'VIDEO' || post.video_url ? 'VIDEO' : 'BLOG';
  const [postType, setPostType] = useState(initialPostType);
  const [attachments, setAttachments] = useState(post.attachments || []);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const submitting = useRef(false);

  const form = useForm({
    resolver: zodResolver(COMPOSER_SCHEMA),
    defaultValues: {
      postType: initialPostType,
      title: post.title || '',
      content: post.content || '',
      videoUrl: post.video_url || '',
      thumbnailUrl: post.thumbnail_url || post.image || '',
      transcript: post.transcript || post.content || '',
      categoryId: post.category_id || post.categoryId || '',
    },
  });

  const changePostType = (type) => {
    setPostType(type);
    form.setValue('postType', type);
    form.clearErrors();
    setError('');
  };

  const handleVideoUrlChange = (e) => {
    const val = e.target.value;
    form.setValue('videoUrl', val, { shouldValidate: true });
    const ytId = extractYouTubeId(val);
    if (ytId && !form.getValues('thumbnailUrl')) {
      const autoThumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      form.setValue('thumbnailUrl', autoThumb);
    }
  };

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
        type: file.type || 'image',
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

  function removeAttachment(attachment) {
    setAttachments((current) => current.filter((item) => item.id !== attachment.id));
    setError('');
  }

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
    submit: form.handleSubmit(submit),
    busy: submitting.current || uploading,
    error,
    uploading,
    progress,
  };
}
