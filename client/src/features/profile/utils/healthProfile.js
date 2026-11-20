// client/src/features/profile/utils/healthProfile.js
// Tiện ích kiểm tra hồ sơ sức khỏe.
// Kiểm tra hồ sơ có đủ chiều cao và cân nặng hợp lệ (số dương) để tính BMI hay không; chấp nhận cả dạng chuỗi số.
export function hasBodyMeasurements(profile) {
  return [profile?.height, profile?.weight].every((value) => {
    if (typeof value !== 'number' && typeof value !== 'string') return false;
    const measurement = Number(value);
    return Number.isFinite(measurement) && measurement > 0;
  });
}
