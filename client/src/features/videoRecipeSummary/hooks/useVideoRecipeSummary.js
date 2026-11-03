// D:/SWP391/SWP391/client/src/features/videoRecipeSummary/hooks/useVideoRecipeSummary.js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSession } from '../../../utils/session.js';
import { VideoRecipeOperation } from '../utils/videoRecipeOperation.js';
import { clearSavedVideoJob } from '../utils/videoRecipeJobs.js';
import { discoverVideoHistory } from '../utils/videoRecipeHistory.js';

export const isVideoRecipeMessage = (message) => ['videoRecipe', 'videoRecipeRequest'].includes(message.kind);

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

function showDiscoveryFailure(context, error, signal) {
  if (signal.aborted || context.operation.current || getSession()?.user?.user_id !== context.userId) return;
  context.setMessages((previous) => {
    const pending = previous.some((message) => message.kind === 'videoRecipe' && message.ownerId === context.userId && message.pending);
    const failure = { pending: false, preparing: false, observationError: error.message, requestId: error.requestId, needsLogin: error.status === 401 };
    if (!pending) return [...previous.filter((message) => !message.historyError), { ...failure,
      id: context.nextId.current++, role: 'assistant', kind: 'videoRecipe', ownerId: context.userId, historyError: true }];
    return previous.map((message) => message.kind === 'videoRecipe' && message.ownerId === context.userId && message.pending ? { ...message, ...failure } : message);
  });
}

function useVideoRecipeOwner(context, enabled, reload) {
  const { operation: operationRef } = context;
  useEffect(() => {
    const discovery = new AbortController();
    operationRef.current?.stop();
    operationRef.current = null;
    context.setBusy(false);
    context.setMessages((previous) => previous.filter((item) => !isVideoRecipeMessage(item) || item.ownerId === (context.userId || null)));
    if (enabled && context.userId) discoverVideoHistory(context, discovery.signal).then((job) => {
      if (!discovery.signal.aborted) context.setMessages((previous) => previous.filter((message) => !message.historyError));
      if (job && !discovery.signal.aborted && !operationRef.current && getSession()?.user?.user_id === context.userId) beginOperation(context, { job });
    }).catch((error) => showDiscoveryFailure(context, error, discovery.signal));
    return () => {
      discovery.abort();
      const active = operationRef.current;
      if (active?.context.userId === context.userId) { active.stop(); operationRef.current = null; }
      if (getSession()?.user?.user_id !== context.userId) clearSavedVideoJob(context.userId);
    };
  }, [context, enabled, operationRef, reload]);
}

export function useVideoRecipeSummary({ userId, enabled, setMessages, nextId }) {
  const [busy, setBusy] = useState(false);
  const operation = useRef(null);
  const [reload, setReload] = useState(0);
  const context = useMemo(() => ({ userId, setMessages, nextId, setBusy, operation }), [userId, setMessages, nextId]);
  useVideoRecipeOwner(context, enabled, reload);
  const send = useCallback((source, question) => beginOperation(context, { source, question }), [context]);
  const retry = useCallback((message) => {
    if (message.ownerId !== context.userId) return;
    if (message.historyError) { setReload((value) => value + 1); return; }
    beginOperation(context, { job: message.job, retry: true,
      source: { videoUrl: message.videoUrl, videoId: message.videoUrl?.match(/[?&]v=([\w-]{11})/)?.[1] } });
  }, [context]);
  return { busy, send, retry };
}
