// D:/SWP391/SWP391/server/tests/restaurantImageRepair.test.js
import './loadTestEnvironment.js';
import { randomUUID } from 'node:crypto';
import { afterAll, expect, it } from 'vitest';
import prisma from '../src/config/prisma.js';
import { placeRepository } from '../src/repositories/place.repository.js';

afterAll(() => prisma.$disconnect());

it('updates image fields in a batch only when both place identity and previous image still match', async () => {
  await expect(prisma.$transaction(async (db) => {
    const placeId = `photo-repair-${randomUUID()}`;
    const place = await db.restaurant.create({ data: {
      name: 'Restaurant photo repair integration fixture', address: 'Test database only',
      place_id: placeId, image_url: 'places/photo-repair/photos/old',
    } });
    const record = { restaurantId: place.restaurant_id, placeId,
      previousImageUrl: place.image_url, imageUrl: '/uploads/restaurants/verified.jpg' };
    expect(await placeRepository.replaceImageUrls([{ ...record, placeId: 'wrong-place' }], db)).toHaveLength(0);
    expect(await placeRepository.replaceImageUrls([record], db)).toHaveLength(1);
    expect(await placeRepository.replaceImageUrls([record], db)).toHaveLength(0);
    expect(await db.restaurant.findUnique({ where: { restaurant_id: place.restaurant_id } }))
      .toMatchObject({ name: place.name, image_url: record.imageUrl });
    throw new Error('Rollback photo repair fixture');
  })).rejects.toThrow('Rollback photo repair fixture');
});
