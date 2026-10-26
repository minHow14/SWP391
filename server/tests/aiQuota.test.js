// d:\Projects\FPT\SWP391\server\tests/aiQuota.test.js
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it, vi } from 'vitest';
import prisma from '../src/config/prisma.js';
import { guestQuotaService } from '../src/services/guestQuotaService.js';
import { guestQuotaAdminService } from '../src/services/guestQuotaAdminService.js';
import { aiLogService } from '../src/services/aiLogService.js';

const PREFIX = `quota-${randomUUID()}`;
afterAll(async () => {
  await prisma.guestQuota.deleteMany({ where: { guestId: { startsWith: PREFIX } } });
  await prisma.$disconnect();
});

describe('Guest quota transaction and date regression tests', () => {
  it('never reserves more than three turns under concurrency', async () => {
    const guestId = `${PREFIX}-concurrent`;
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => guestQuotaService.reserveTurn({ guestId })));
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(3);
    expect(results.filter((result) => result.status === 'rejected').every((result) => result.reason.statusCode === 429)).toBe(true);
    expect((await guestQuotaService.getUsage({ guestId })).used).toBe(3);
  });

  it('refunds the original date without reducing a new day reservation', async () => {
    const guestId = `${PREFIX}-midnight`;
    const beforeMidnight = new Date('2026-10-22T16:59:59Z');
    const afterMidnight = new Date('2026-10-22T17:00:01Z');
    const previous = await guestQuotaService.reserveTurn({ guestId, now: beforeMidnight });
    await guestQuotaService.reserveTurn({ guestId, now: afterMidnight });
    await guestQuotaService.releaseTurn(previous);
    expect((await guestQuotaService.getUsage({ guestId, now: beforeMidnight })).used).toBe(0);
    expect((await guestQuotaService.getUsage({ guestId, now: afterMidnight })).used).toBe(1);
  });

  it('rolls back a reset when audit persistence fails', async () => {
    const guestId = `${PREFIX}-rollback`;
    const reservation = await guestQuotaService.reserveTurn({ guestId });
    const logger = vi.spyOn(aiLogService, 'recordLog').mockRejectedValueOnce(new Error('audit unavailable'));
    try {
      await expect(guestQuotaAdminService.resetUsage({ guestId, adminUserId: 1 })).rejects.toThrow('audit unavailable');
    } finally { logger.mockRestore(); }
    expect((await guestQuotaService.getUsage({ guestId })).used).toBe(1);
    await guestQuotaService.releaseTurn(reservation);
    expect((await guestQuotaService.getUsage({ guestId })).used).toBe(0);
  });

  it('records the previous usage and actor when resetting successfully', async () => {
    const guestId = `${PREFIX}-reset`;
    await guestQuotaService.reserveTurn({ guestId });
    const result = await guestQuotaAdminService.resetUsage({ guestId, adminUserId: 1 });
    expect(result.usedBefore).toBe(1);
    expect((await guestQuotaService.getUsage({ guestId })).used).toBe(0);
    const log = await prisma.aiLog.findFirst({ where: { errorFeedback: { contains: guestId } }, orderBy: { logId: 'desc' } });
    expect(log.action).toBe('ADMIN_RESET_GUEST_QUOTA_BY_1');
  });

  it('does not refund a new request when a request reserved before admin reset fails', async () => {
    const guestId = `${PREFIX}-reset-during-inference`;
    const oldReservation = await guestQuotaService.reserveTurn({ guestId });
    await guestQuotaAdminService.resetUsage({ guestId, adminUserId: 1 });
    const newReservation = await guestQuotaService.reserveTurn({ guestId });
    await guestQuotaService.releaseTurn(oldReservation);
    expect((await guestQuotaService.getUsage({ guestId })).used).toBe(1);
    await guestQuotaService.releaseTurn(newReservation);
    expect((await guestQuotaService.getUsage({ guestId })).used).toBe(0);
  });
});
