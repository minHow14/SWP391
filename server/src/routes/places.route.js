// d:\Projects\FPT\SWP391\server\src\routes\places.route.js
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { getNearby, searchPlaces } from '../controllers/places.controller.js';
import { requestId } from '../middlewares/requestId.js';
import { fail } from '../utils/apiResponse.js';

const router = express.Router();

// Mã request req_<id> cho envelope và header X-Request-Id của các route /places
router.use(requestId);

// Giới hạn theo IP để tránh spam và tiêu hao credit ZIOMAP
router.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: Number(process.env.PLACES_RATE_LIMIT ?? 60),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) =>
      fail(res, 429, 'RATE_LIMIT_EXCEEDED', 'Bạn gửi yêu cầu quá nhanh. Vui lòng thử lại sau.'),
  })
);

router.get('/nearby', getNearby);
router.get('/search', searchPlaces);

// Lỗi không lường trước: không lộ chi tiết nội bộ ra ngoài
// eslint-disable-next-line no-unused-vars
router.use((error, req, res, next) => {
  console.error(`[places] ${res.locals.requestId}`, error);
  fail(res, 500, 'INTERNAL_ERROR', 'Đã xảy ra lỗi khi xử lý yêu cầu.');
});

export default router;
