-- AlterTable
ALTER TABLE "meal_plan_details" ADD COLUMN     "calories" REAL,
ADD COLUMN     "carbs" REAL,
ADD COLUMN     "custom_food_name" VARCHAR(255),
ADD COLUMN     "fat" REAL,
ADD COLUMN     "protein" REAL;
