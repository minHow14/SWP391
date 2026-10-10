/**
 * Định nghĩa loại bài viết (post_type)
 */
export const POST_TYPE = Object.freeze({
  BLOG: 'BLOG',
  VIDEO: 'VIDEO',
  RECIPE: 'RECIPE',
});

/**
 * Định nghĩa loại bình chọn (post_votes)
 */
export const VOTE_TYPE = Object.freeze({
  UPVOTE: 'UPVOTE',
  DOWNVOTE: 'DOWNVOTE',
});

/**
 * Định nghĩa loại bữa ăn (meal_plans / food_diaries)
 */
export const MEAL_TYPE = Object.freeze({
  BREAKFAST: 'BREAKFAST',
  LUNCH: 'LUNCH',
  DINNER: 'DINNER',
  SNACK: 'SNACK',
});

/**
 * Định nghĩa giới tính (health_profiles)
 */
export const GENDER = Object.freeze({
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
});
