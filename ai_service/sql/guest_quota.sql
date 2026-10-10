-- Bảng lưu lượt dùng AI trong ngày của khách (Unauthorized user).
-- Một lượt = một câu hỏi chatbot HOẶC một lần tạo thực đơn tuần (dùng chung hạn mức).
-- Ngày tính theo giờ Việt Nam (+07:00); hạn mức mặc định 3 lượt/ngày (GUEST_DAILY_LIMIT).

CREATE TABLE IF NOT EXISTS GuestQuota (
    guest_id    VARCHAR(100) NOT NULL,
    quota_date  DATE         NOT NULL,
    used_count  INT          NOT NULL DEFAULT 0 CHECK (used_count >= 0),
    updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guest_id, quota_date)
);

-- Dọn dữ liệu cũ (chạy định kỳ, ví dụ mỗi tuần):
-- DELETE FROM GuestQuota WHERE quota_date < CURRENT_DATE - INTERVAL '7 days';
