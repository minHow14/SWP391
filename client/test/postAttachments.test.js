// C:/Users/TRUONGPHU/Desktop/chayxnah/SWP391/client/test/postAttachments.test.js
// Kiểm thử (node:test) validatePostAttachments: loại file, số lượng tối đa và giới hạn dung lượng ảnh/video của bài viết.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePostAttachments } from '../src/utils/postAttachments.js';

// Ảnh và video đúng định dạng được chấp nhận (trả chuỗi lỗi rỗng).
test('mixed supported photos and videos are accepted', () => {
  assert.equal(
    validatePostAttachments([
      { name: 'meal.png', type: 'image/png', size: 2048 },
      { name: 'recipe.mp4', type: 'video/mp4', size: 4096 },
    ]),
    ''
  );
});
// Loại file không hỗ trợ (ví dụ HTML) bị từ chối để tránh tải lên nội dung nguy hiểm.
test('unsupported file types are rejected', () => {
  assert.match(
    validatePostAttachments([
      { name: 'script.html', type: 'text/html', size: 20 },
    ]),
    /không được hỗ trợ/
  );
});
// Giới hạn số lượng tính cả các file đã đính kèm sẵn khi chỉnh sửa bài.
test('media limits include files already attached during editing', () => {
  assert.match(
    validatePostAttachments([{ name: 'a.png', type: 'image/png', size: 1 }], 6),
    /tối đa 6/
  );
});
// Ảnh giới hạn 10 MB, video giới hạn 50 MB; vượt một byte là bị từ chối.
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
