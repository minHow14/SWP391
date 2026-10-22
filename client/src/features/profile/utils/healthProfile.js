// client/src/features/profile/utils/healthProfile.js
export function hasBodyMeasurements(profile) {
  return [profile?.height, profile?.weight].every((value) => {
    if (typeof value !== 'number' && typeof value !== 'string') return false;
    const measurement = Number(value);
    return Number.isFinite(measurement) && measurement > 0;
  });
}
