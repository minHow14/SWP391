// server/src/services/mealPlanJournalService.js
import prisma from '../config/prisma.js';
import { workspaceRepository } from '../repositories/workspace.repository.js';
import { aiGenerationRepository } from '../repositories/aiGenerationRepository.js';
import { MEAL_TYPE } from '../constants/postTypes.js';
import { ApiError } from '../utils/apiError.js';
import { weekRangeOf } from '../utils/weekRange.js';

const AI_MEAL_FIELDS = Object.freeze({
  breakfast: MEAL_TYPE.BREAKFAST,
  lunch: MEAL_TYPE.LUNCH,
  dinner: MEAL_TYPE.DINNER,
  snacks: MEAL_TYPE.SNACK,
});
const FIRST_DAY_OF_WEEK = 1;
const LAST_DAY_OF_WEEK = 7;
const MAX_NAME_LENGTH = 255;

function dayOfWeekOf(day, index) {
  const dayNumber = Number(day.dayNumber);
  return Number.isInteger(dayNumber) ? dayNumber : index + 1;
}

function detailRow({ planId, dayOfWeek, mealType, meal }) {
  return {
    plan_id: planId,
    day_of_week: dayOfWeek,
    meal_type: mealType,
    custom_food_name: meal.name.slice(0, MAX_NAME_LENGTH),
    calories: meal.estimatedCalories ?? 0,
    protein: meal.proteinG ?? 0,
    carbs: meal.carbsG ?? 0,
    fat: meal.fatG ?? 0,
  };
}

/** Thực đơn AI bắt đầu từ Thứ Hai: `dayNumber` 1..7 ứng với Thứ Hai..Chủ Nhật của tuần được chọn. */
export function buildPlanDetails(planId, weeklyPlan) {
  return weeklyPlan.flatMap((day, index) => {
    const dayOfWeek = dayOfWeekOf(day, index);
    if (dayOfWeek < FIRST_DAY_OF_WEEK || dayOfWeek > LAST_DAY_OF_WEEK) return [];
    return Object.entries(AI_MEAL_FIELDS)
      .filter(([field]) => typeof day[field]?.name === 'string' && day[field].name.trim())
      .map(([field, mealType]) => detailRow({ planId, dayOfWeek, mealType, meal: day[field] }));
  });
}

async function findCompletedMealPlan({ generationId, userId }) {
  const generation = await aiGenerationRepository.findOwned({ id: generationId, userId });
  const isUsable = generation?.type === 'MEAL_PLAN' && generation.status === 'COMPLETED';
  if (!isUsable || !generation.responsePayload?.weeklyPlan?.length) {
    throw ApiError.notFound('Không tìm thấy thực đơn AI để áp dụng.');
  }
  return generation.responsePayload;
}

function planAttributes(payload, sunday) {
  return {
    title: String(payload.title || 'Thực đơn AI').slice(0, MAX_NAME_LENGTH),
    end_date: sunday,
    target_calories: payload.profileSummary?.targetDailyCalories ?? null,
  };
}

export const mealPlanJournalService = {
  /** Ghi thực đơn AI vào kế hoạch tuần của Nhật Ký; thay toàn bộ món cũ trong tuần chứa `date`. */
  async applyAiMealPlan(userId, { generationId, date }) {
    const payload = await findCompletedMealPlan({ generationId, userId });
    const { monday, sunday } = weekRangeOf(date);
    const weekStart = monday.toISOString().slice(0, 10);
    return prisma.$transaction(async (tx) => {
      await workspaceRepository.lockUserDate(userId, weekStart, tx);
      const attributes = planAttributes(payload, sunday);
      const existing = await workspaceRepository.findMealPlanByStartDate(userId, monday, tx);
      const plan = existing
        ? await workspaceRepository.updateMealPlan(existing.plan_id, attributes, tx)
        : await workspaceRepository.createMealPlan({ user_id: Number(userId), start_date: monday, ...attributes }, tx);
      await workspaceRepository.deleteMealPlanDetails({ plan_id: plan.plan_id }, tx);
      const rows = buildPlanDetails(plan.plan_id, payload.weeklyPlan);
      await workspaceRepository.createMealPlanDetails(rows, tx);
      return { planId: plan.plan_id, weekStart, appliedMeals: rows.length };
    });
  },
};
