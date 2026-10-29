// client/test/postAttachments.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePostAttachments } from '../src/utils/postAttachments.js';
import { COMPOSER_SCHEMA } from '../src/features/community/hooks/usePostComposer.js';

test('mixed supported photos and videos are accepted', () => {
  assert.equal(
    validatePostAttachments([
      { name: 'meal.png', type: 'image/png', size: 2048 },
      { name: 'recipe.mp4', type: 'video/mp4', size: 4096 },
    ]),
    ''
  );
});

test('unsupported file types are rejected', () => {
  assert.match(
    validatePostAttachments([
      { name: 'script.html', type: 'text/html', size: 20 },
    ]),
    /không được hỗ trợ/
  );
});

test('media limits include files already attached during editing', () => {
  assert.match(
    validatePostAttachments([{ name: 'a.png', type: 'image/png', size: 1 }], 6),
    /tối đa 6/
  );
});

test('photos and videos use separate size limits', () => {
  assert.match(
    validatePostAttachments([
      { name: 'photo.png', type: 'image/png', size: 10 * 1024 * 1024 + 1 },
    ]),
    /quá lớn/
  );
  assert.equal(
    validatePostAttachments([
      { name: 'clip.mp4', type: 'video/mp4', size: 50 * 1024 * 1024 },
    ]),
    ''
  );
  assert.match(
    validatePostAttachments([
      { name: 'clip.mp4', type: 'video/mp4', size: 50 * 1024 * 1024 + 1 },
    ]),
    /quá lớn/
  );
});

test('COMPOSER_SCHEMA requires categoryId and enforces "Chủ đề không được để trống"', () => {
  const emptyCategory = COMPOSER_SCHEMA.safeParse({
    title: 'Chia sẻ món chay ngon',
    content: 'Chi tiết bài viết',
    categoryId: '',
  });
  assert.equal(emptyCategory.success, false);
  assert.equal(emptyCategory.error.issues[0].message, 'Chủ đề không được để trống');

  const missingCategory = COMPOSER_SCHEMA.safeParse({
    title: 'Chia sẻ món chay ngon',
    content: 'Chi tiết bài viết',
  });
  assert.equal(missingCategory.success, false);
  assert.equal(missingCategory.error.issues[0].message, 'Chủ đề không được để trống');

  const validCategory = COMPOSER_SCHEMA.safeParse({
    title: 'Chia sẻ món chay ngon',
    content: 'Chi tiết bài viết',
    categoryId: '3',
  });
  assert.equal(validCategory.success, true);
  assert.equal(validCategory.data.categoryId, 3);

  const invalidCategory = COMPOSER_SCHEMA.safeParse({
    title: 'Chia sẻ món chay ngon',
    content: 'Chi tiết bài viết',
    categoryId: '0',
  });
  assert.equal(invalidCategory.success, false);
  assert.equal(invalidCategory.error.issues[0].message, 'Chủ đề không được để trống');
});
