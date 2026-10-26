// D:/SWP391/SWP391/client/src/features/videoRecipeSummary/hooks/useVideoRecipeSummary.js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSession } from '../../../utils/session.js';
import { videoRecipeSummaryApi } from '../../../services/videoRecipeSummaryApi.js';
import { VideoRecipeOperation } from '../utils/videoRecipeOperation.js';
import { clearSavedVideoJob, savedVideoJob } from '../utils/videoRecipeJobs.js';

export const isVideoRecipeMessage = (message) => ['videoRecipe', 'videoRecipeRequest'].includes(message.kind);

async function discoverJob(context, signal) {
  const stored = savedVideoJob(context.userId);
  if (stored) {
    try { return await videoRecipeSummaryApi.getJob(stored.jobId, signal); }
    catch (error) { if (error.status !== 404) throw error; clearSavedVideoJob(context.userId); }
  }
  const pages = await Promise.all(['PENDING', 'PROCESSING'].map((status) => videoRecipeSummaryApi.list({ status, limit: 1 }, signal)));
  return pages.flat()[0] || null;
}

function beginOperation(context, request) {
  if (context.operation.current) return;
  if (!context.userId || getSession()?.user?.user_id !== context.userId) {
    context.setMessages((previous) => [...previous, { id: context.nextId.current++, role: 'assistant', kind: 'videoRecipe',
      ownerId: context.userId || null, needsLogin: true, observationError: 'Vui lòng đăng nhập để tạo công thức từ video.' }]);
    return;
  }
  if (request.question) context.setMessages((previous) => [...previous, { id: context.nextId.current++, role: 'user',
    kind: 'videoRecipeRequest', ownerId: context.userId, text: request.question }]);
  const operation = new VideoRecipeOperation(context);
  context.operation.current = operation;
  void operation.run(request);
}

function useVideoRecipeOwner(context, enabled) {
  const { operation: operationRef } = context;
  useEffect(() => {
    const discovery = new AbortController();
    operationRef.current?.stop();
    operationRef.current = null;
    context.setBusy(false);
    context.setMessages((previous) => previous.filter((item) => !isVideoRecipeMessage(item) || item.ownerId === (context.userId || null)));
    if (enabled && context.userId) discoverJob(context, discovery.signal).then((job) => {
      if (job && !discovery.signal.aborted && !operationRef.current && getSession()?.user?.user_id === context.userId) beginOperation(context, { job });
    }).catch(() => {});
    return () => {
      discovery.abort();
      const active = operationRef.current;
      if (active?.context.userId === context.userId) { active.stop(); operationRef.current = null; }
      if (getSession()?.user?.user_id !== context.userId) clearSavedVideoJob(context.userId);
    };
  }, [context, enabled, operationRef]);
}

export function useVideoRecipeSummary({ userId, enabled, setMessages, nextId }) {
  const [busy, setBusy] = useState(false);
  const operation = useRef(null);
  const context = useMemo(() => ({ userId, setMessages, nextId, setBusy, operation }), [userId, setMessages, nextId]);
  useVideoRecipeOwner(context, enabled);
  const send = useCallback((source, question) => beginOperation(context, { source, question }), [context]);
  const retry = useCallback((message) => beginOperation(context, { job: message.job, retry: true,
    source: { videoUrl: message.videoUrl, videoId: message.videoUrl?.match(/[?&]v=([\w-]{11})/)?.[1] } }), [context]);
  return { busy, send, retry };
}
