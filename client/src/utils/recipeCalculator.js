// client/src/utils/recipeCalculator.js
// Tính dinh dưỡng (calo, đạm, chất béo, tinh bột, chất xơ) của công thức dựa trên lượng và đơn vị nguyên liệu.
/**
 * Tính calo của một nguyên liệu trong công thức theo đơn vị và số lượng.
 */
export function calculateIngredientCalories(recipeIngredient, ingredient, liquidDensities) {
    if (!ingredient || ingredient.calories_per_100g === null || ingredient.calories_per_100g === undefined) {
        return null;
    }

    const { unit, quantity } = recipeIngredient;
    const caloriesPer100g = ingredient.calories_per_100g;

    if (unit === 'gram' || unit === 'g') {
        // Tính trực tiếp: (số lượng * calo trên 100g) / 100
        return (quantity * caloriesPer100g) / 100;
    }

    if (unit === 'milliliter' || unit === 'ml') {
        // Đổi ml sang gram bằng khối lượng riêng lấy từ cơ sở dữ liệu
        const densityRecord = liquidDensities.find(
            (ld) => ld.ingredient_id === ingredient.ingredient_id
        );

        if (densityRecord) {
            const gramsFromMl = quantity * densityRecord.density;
            return (gramsFromMl * caloriesPer100g) / 100;
        }
        // Không có khối lượng riêng trong cơ sở dữ liệu thì trả về null
        return null;
    }

    // Đơn vị khác (cái, quả, hạt...) trả về calo trên 100g kèm ghi chú
    return caloriesPer100g;
}

/**
 * Định dạng chuỗi hiển thị nguyên liệu kèm thông tin calo.
 */
export function formatIngredientDisplay(recipeIngredient, ingredient, liquidDensities) {
    if (!ingredient) {
        return recipeIngredient.name || 'Unknown ingredient';
    }

    const { unit, quantity } = recipeIngredient;
    const calories = calculateIngredientCalories(recipeIngredient, ingredient, liquidDensities);
    let displayText = `${quantity} ${unit} ${ingredient.name}`;

    // Thêm thông tin calo
    if (calories !== null) {
        if (unit === 'gram' || unit === 'g' || unit === 'milliliter' || unit === 'ml') {
            displayText += ` (${calories.toFixed(1)} kcal)`;
        } else {
            // Với đơn vị khác, thêm ghi chú là calo trên 100g
            displayText += ` (~${calories.toFixed(1)} kcal per 100g*)`;
        }
    }

    return displayText;
}

/**
 * Tính tổng calo của công thức; không có danh sách nguyên liệu thì dùng total_calories có sẵn.
 */
export function calculateTotalCalories(recipeWithIngredients, liquidDensities) {
    if (!recipeWithIngredients.recipeIngredients || recipeWithIngredients.recipeIngredients.length === 0) {
        return recipeWithIngredients.total_calories || 0;
    }

    return recipeWithIngredients.recipeIngredients.reduce((total, recipeIng) => {
        const ingredient = recipeIng.ingredient;
        const calories = calculateIngredientCalories(recipeIng, ingredient, liquidDensities);
        return total + (calories !== null ? calories : 0);
    }, 0);
}
/**
 * Tính lượng đạm của một nguyên liệu trong công thức theo đơn vị và số lượng.
 */
export function calculateIngredientProtein(recipeIngredient, ingredient, liquidDensities) {
    if (!ingredient || ingredient.protein_per_100g === null || ingredient.protein_per_100g === undefined) {
        return null;
    }

    const { unit, quantity } = recipeIngredient;
    const proteinPer100g = ingredient.protein_per_100g;

    if (unit === 'gram' || unit === 'g') {
        return (quantity * proteinPer100g) / 100;
    }

    if (unit === 'milliliter' || unit === 'ml') {
        const densityRecord = liquidDensities.find(
            (ld) => ld.ingredient_id === ingredient.ingredient_id
        );
        if (densityRecord) {
            const gramsFromMl = quantity * densityRecord.density;
            return (gramsFromMl * proteinPer100g) / 100;
        }
        return null;
    }

    return proteinPer100g;
}

/**
 * Tính lượng chất béo của một nguyên liệu trong công thức theo đơn vị và số lượng.
 */
export function calculateIngredientFat(recipeIngredient, ingredient, liquidDensities) {
    if (!ingredient || ingredient.fat_per_100g === null || ingredient.fat_per_100g === undefined) {
        return null;
    }

    const { unit, quantity } = recipeIngredient;
    const fatPer100g = ingredient.fat_per_100g;

    if (unit === 'gram' || unit === 'g') {
        return (quantity * fatPer100g) / 100;
    }

    if (unit === 'milliliter' || unit === 'ml') {
        const densityRecord = liquidDensities.find(
            (ld) => ld.ingredient_id === ingredient.ingredient_id
        );
        if (densityRecord) {
            const gramsFromMl = quantity * densityRecord.density;
            return (gramsFromMl * fatPer100g) / 100;
        }
        return null;
    }

    return fatPer100g;
}

/**
 * Tính lượng tinh bột của một nguyên liệu trong công thức theo đơn vị và số lượng.
 */
export function calculateIngredientCarbs(recipeIngredient, ingredient, liquidDensities) {
    if (!ingredient || ingredient.carbs_per_100g === null || ingredient.carbs_per_100g === undefined) {
        return null;
    }

    const { unit, quantity } = recipeIngredient;
    const carbsPer100g = ingredient.carbs_per_100g;

    if (unit === 'gram' || unit === 'g') {
        return (quantity * carbsPer100g) / 100;
    }

    if (unit === 'milliliter' || unit === 'ml') {
        const densityRecord = liquidDensities.find(
            (ld) => ld.ingredient_id === ingredient.ingredient_id
        );
        if (densityRecord) {
            const gramsFromMl = quantity * densityRecord.density;
            return (gramsFromMl * carbsPer100g) / 100;
        }
        return null;
    }

    return carbsPer100g;
}

/**
 * Tính lượng chất xơ của một nguyên liệu trong công thức theo đơn vị và số lượng.
 */
export function calculateIngredientFiber(recipeIngredient, ingredient, liquidDensities) {
    if (!ingredient || ingredient.fiber_per_100g === null || ingredient.fiber_per_100g === undefined) {
        return null;
    }

    const { unit, quantity } = recipeIngredient;
    const fiberPer100g = ingredient.fiber_per_100g;

    if (unit === 'gram' || unit === 'g') {
        return (quantity * fiberPer100g) / 100;
    }

    if (unit === 'milliliter' || unit === 'ml') {
        const densityRecord = liquidDensities.find(
            (ld) => ld.ingredient_id === ingredient.ingredient_id
        );
        if (densityRecord) {
            const gramsFromMl = quantity * densityRecord.density;
            return (gramsFromMl * fiberPer100g) / 100;
        }
        return null;
    }

    return fiberPer100g;
}

/**
 * Tính tổng lượng đạm của công thức.
 */
export function calculateTotalProtein(recipeWithIngredients, liquidDensities) {
    if (!recipeWithIngredients.recipeIngredients || recipeWithIngredients.recipeIngredients.length === 0) {
        return 0;
    }

    return recipeWithIngredients.recipeIngredients.reduce((total, recipeIng) => {
        const ingredient = recipeIng.ingredient;
        const protein = calculateIngredientProtein(recipeIng, ingredient, liquidDensities);
        return total + (protein !== null ? protein : 0);
    }, 0);
}

/**
 * Tính tổng lượng chất béo của công thức.
 */
export function calculateTotalFat(recipeWithIngredients, liquidDensities) {
    if (!recipeWithIngredients.recipeIngredients || recipeWithIngredients.recipeIngredients.length === 0) {
        return 0;
    }

    return recipeWithIngredients.recipeIngredients.reduce((total, recipeIng) => {
        const ingredient = recipeIng.ingredient;
        const fat = calculateIngredientFat(recipeIng, ingredient, liquidDensities);
        return total + (fat !== null ? fat : 0);
    }, 0);
}

/**
 * Tính tổng lượng tinh bột của công thức.
 */
export function calculateTotalCarbs(recipeWithIngredients, liquidDensities) {
    if (!recipeWithIngredients.recipeIngredients || recipeWithIngredients.recipeIngredients.length === 0) {
        return 0;
    }

    return recipeWithIngredients.recipeIngredients.reduce((total, recipeIng) => {
        const ingredient = recipeIng.ingredient;
        const carbs = calculateIngredientCarbs(recipeIng, ingredient, liquidDensities);
        return total + (carbs !== null ? carbs : 0);
    }, 0);
}

/**
 * Tính tổng lượng chất xơ của công thức.
 */
export function calculateTotalFiber(recipeWithIngredients, liquidDensities) {
    if (!recipeWithIngredients.recipeIngredients || recipeWithIngredients.recipeIngredients.length === 0) {
        return 0;
    }

    return recipeWithIngredients.recipeIngredients.reduce((total, recipeIng) => {
        const ingredient = recipeIng.ingredient;
        const fiber = calculateIngredientFiber(recipeIng, ingredient, liquidDensities);
        return total + (fiber !== null ? fiber : 0);
    }, 0);
}
