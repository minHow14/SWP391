// client/src/utils/recipeCalculator.js
/**
 * Calculate calories for a recipe ingredient based on unit and quantity
 */
export function calculateIngredientCalories(recipeIngredient, ingredient, liquidDensities) {
    if (!ingredient || ingredient.calories_per_100g === null || ingredient.calories_per_100g === undefined) {
        return null;
    }

    const { unit, quantity } = recipeIngredient;
    const caloriesPer100g = ingredient.calories_per_100g;

    if (unit === 'gram' || unit === 'g') {
        // Direct calculation: (quantity * calories_per_100g) / 100
        return (quantity * caloriesPer100g) / 100;
    }

    if (unit === 'milliliter' || unit === 'ml') {
        // Convert ml to grams using density from database
        const densityRecord = liquidDensities.find(
            (ld) => ld.ingredient_id === ingredient.ingredient_id
        );

        if (densityRecord) {
            const gramsFromMl = quantity * densityRecord.density;
            return (gramsFromMl * caloriesPer100g) / 100;
        }
        // If density not found in database, return null
        return null;
    }

    // For other units (piece, fruit, seed, etc.), return calories per 100g with disclaimer
    return caloriesPer100g;
}

/**
 * Format ingredient display with unit normalization
 */
export function formatIngredientDisplay(recipeIngredient, ingredient, liquidDensities) {
    if (!ingredient) {
        return recipeIngredient.name || 'Unknown ingredient';
    }

    const { unit, quantity } = recipeIngredient;
    const calories = calculateIngredientCalories(recipeIngredient, ingredient, liquidDensities);
    let displayText = `${quantity} ${unit} ${ingredient.name}`;

    // Add calorie information
    if (calories !== null) {
        if (unit === 'gram' || unit === 'g' || unit === 'milliliter' || unit === 'ml') {
            displayText += ` (${calories.toFixed(1)} kcal)`;
        } else {
            // For other units, add disclaimer
            displayText += ` (~${calories.toFixed(1)} kcal per 100g*)`;
        }
    }

    return displayText;
}

/**
 * Calculate total calories for a recipe
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
 * Calculate protein for a recipe ingredient based on unit and quantity
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
 * Calculate fat for a recipe ingredient based on unit and quantity
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
 * Calculate carbs for a recipe ingredient based on unit and quantity
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
 * Calculate fiber for a recipe ingredient based on unit and quantity
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
 * Calculate total protein for a recipe
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
 * Calculate total fat for a recipe
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
 * Calculate total carbs for a recipe
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
 * Calculate total fiber for a recipe
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
