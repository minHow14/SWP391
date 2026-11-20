// D:/SWP391/SWP391/server/src/services/healthProfileService.js
// Đồng bộ lịch sử cân nặng/BMI mỗi khi hồ sơ sức khỏe người dùng thay đổi cân nặng.
import { userRepository } from '../repositories/user.repository.js';

/**
 * Ghi thêm một bản ghi lịch sử cân nặng khi cân nặng mới khác bản ghi gần nhất.
 * @param {number} userId - ID người dùng.
 * @param {object} profile - Dữ liệu hồ sơ vừa cập nhật (weight, height).
 * @param {object} tx - Prisma transaction client để ghi cùng transaction với cập nhật hồ sơ.
 */
export async function syncHealthProfileWeightHistory(userId, profile, tx) {
  if (profile.weight == null) return;
  const numericWeight = Number(profile.weight);

  const latest = await userRepository.findLatestHealthHistory(userId, tx);
  // Không ghi trùng khi cân nặng không đổi, tránh làm biểu đồ tiến trình bị nhiễu.
  if (latest && Number(latest.weight) === numericWeight) return;

  // Ưu tiên chiều cao vừa gửi lên; nếu không có thì lấy chiều cao đang lưu để vẫn tính được BMI.
  const currentHeight = profile.height != null
    ? Number(profile.height)
    : (await userRepository.findHealthProfile(userId, tx))?.height;
  // BMI = cân nặng (kg) / chiều cao (m)^2; thiếu chiều cao thì để null thay vì tính sai.
  const bmi = currentHeight > 0
    ? Number((numericWeight / (currentHeight / 100) ** 2).toFixed(1))
    : null;

  await userRepository.addHealthHistory(
    userId,
    { weight: numericWeight, bmi, recorded_date: new Date() },
    tx
  );
}
