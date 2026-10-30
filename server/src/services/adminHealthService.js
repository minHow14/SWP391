// D:/SWP391/SWP391/server/src/services/adminHealthService.js
import { aiConfig } from '../config/aiConfig.js';
import { healthRepository } from '../repositories/healthRepository.js';

const HEALTH_TIMEOUT_MS = 3000;

async function probe(id, operation) {
  let timer;
  try {
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Health probe timed out')), HEALTH_TIMEOUT_MS);
    });
    await Promise.race([Promise.resolve().then(operation), deadline]);
    return { id, status: 'UP' };
  } catch {
    return { id, status: 'DOWN' };
  } finally {
    clearTimeout(timer);
  }
}

async function checkAiHttp() {
  const response = await fetch(`${aiConfig.url}/health`, {
    redirect: 'error', signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    headers: aiConfig.internalApiKey ? { 'X-Internal-Api-Key': aiConfig.internalApiKey } : {},
  });
  if (!response.ok) throw new Error('AI HTTP health check failed');
  const result = await response.json();
  if (result.success !== true || result.data?.status !== 'ok') throw new Error('Invalid AI health response');
}

export async function getSystemHealth() {
  const services = await Promise.all([
    probe('database', () => healthRepository.checkDatabase()),
    probe('aiService', checkAiHttp),
  ]);
  // HTTP availability does not prove that the external inference provider is healthy.
  return { status: services.every((service) => service.status === 'UP') ? 'HEALTHY' : 'DEGRADED',
    checkedAt: new Date().toISOString(), services };
}
