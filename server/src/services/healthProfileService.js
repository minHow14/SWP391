// D:/SWP391/SWP391/server/src/services/healthProfileService.js
import { userRepository } from '../repositories/user.repository.js';

export async function syncHealthProfileWeightHistory(userId, profile, tx) {
  if (profile.weight == null) return;
  const numericWeight = Number(profile.weight);

  const latest = await userRepository.findLatestHealthHistory(userId, tx);
  if (latest && Number(latest.weight) === numericWeight) return;

  const currentHeight = profile.height != null
    ? Number(profile.height)
    : (await userRepository.findHealthProfile(userId, tx))?.height;
  const bmi = currentHeight > 0
    ? Number((numericWeight / (currentHeight / 100) ** 2).toFixed(1))
    : null;

  await userRepository.addHealthHistory(
    userId,
    { weight: numericWeight, bmi, recorded_date: new Date() },
    tx
  );
}
