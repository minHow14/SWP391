// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/src/features/community/hooks/usePostComposer.js
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { validatePostAttachments } from '../../../utils/postAttachments.js';
import { savePost } from '../../../services/communityService.js';

const POST_SCHEMA = z.object({
  title: z.string().trim().min(1, 'Vui lòng nhập tiêu đề.').max(255, 'Tiêu đề tối đa 255 ký tự.'),
  content: z.string().trim().min(1, 'Vui lòng nhập nội dung.').max(50000, 'Nội dung tối đa 50.000 ký tự.'),
});

export function usePostComposer({ post, onSaved }) {
  const [attachments, setAttachments] = useState(post.attachments || []);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const objectUrls = useRef(new Set());
  const submitting = useRef(false);
  const form = useForm({ resolver: zodResolver(POST_SCHEMA),
    defaultValues: { title: post.title || '', content: post.content || '' } });
  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, []);

  function selectFiles(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    const message = validatePostAttachments(files, attachments.length);
    setError(message);
    if (message) return;
    const selected = files.map(file => {
      const url = URL.createObjectURL(file);
      objectUrls.current.add(url);
      return { id: crypto.randomUUID(), url, name: file.name, file,
        type: file.type.startsWith('video/') ? 'video' : 'image' };
    });
    setAttachments(current => [...current, ...selected]);
  }

  function removeAttachment(attachment) {
    if (attachment.file) {
      URL.revokeObjectURL(attachment.url);
      objectUrls.current.delete(attachment.url);
    }
    setAttachments(current => current.filter(item => item.id !== attachment.id));
    setError('');
  }

  async function submit(values) {
    if (submitting.current) return;
    submitting.current = true;
    setError('');
    setProgress(0);
    try {
      const blog = await savePost({ postId: post.post_id, values, attachments }, event => {
        if (event.total) setProgress(Math.round(event.loaded * 100 / event.total));
      });
      onSaved(blog);
    } catch (failure) { setError(failure.message); }
    finally { submitting.current = false; }
  }

  return { form, attachments, error, progress, selectFiles, removeAttachment,
    submit: event => form.handleSubmit(submit)(event), busy: form.formState.isSubmitting };
}
