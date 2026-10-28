// client/src/features/journal/hooks/useJournalData.js
import { useEffect, useState, useCallback } from 'react';
import { workspaceService } from '../../../services/workspaceService.js';
import { getSession } from '../../../utils/session.js';
import { mealGroups } from '../../../utils/journal.js';

export function useJournalData(user, mealSamples) {
  const [data, setData] = useState(null);
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const result = await workspaceService.getJournal();
      if (getSession()?.user?.user_id === user.user_id) {
        setData({ ...result, ownerId: user.user_id });
      }
    } catch (e) {
      setNotice(e.message);
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    if (user) {
      workspaceService
        .getJournal()
        .then((result) => {
          if (active) setData({ ...result, ownerId: user.user_id });
        })
        .catch((e) => {
          if (active) setNotice(e.message);
        });
    }
    return () => {
      active = false;
    };
  }, [user]);

  async function changePlan(day, group, recipe) {
    try {
      await workspaceService.setMealPlan({
        date: day,
        group: group.toUpperCase(),
        recipe_id: recipe ? Number(recipe) : null,
      });
      await refresh();
    } catch (e) {
      setNotice(e.message);
    }
  }

  async function addMeal(entry) {
    try {
      await workspaceService.addDiaryEntry(entry);
      await refresh();
      setNotice('Đã thêm món vào nhật ký.');
      return true;
    } catch (e) {
      setNotice(e.message);
      return false;
    }
  }

  async function removeMeal(id) {
    try {
      await workspaceService.deleteDiaryEntry(id);
      await refresh();
      setNotice('Đã xóa món khỏi nhật ký.');
    } catch (e) {
      setNotice(e.message);
    }
  }

  async function updateProfile(payload) {
    try {
      await workspaceService.updateProfile(payload);
      await refresh();
      return true;
    } catch (e) {
      setNotice(e.message);
      return false;
    }
  }

  async function recordPlan(day) {
    if (data?.days[day]?.length) return false;
    const planned = mealGroups.flatMap((group) => {
      const meal = mealSamples.find((item) => item.id === data?.plans[day]?.[group.id]);
      return meal
        ? [
            {
              date: day,
              name: meal.name,
              recipe_id: meal.recipe_id,
              serving: meal.serving,
              calories: meal.calories,
              protein: meal.protein,
              carbs: meal.carbs,
              fat: meal.fat,
              fiber: meal.fiber,
              group: group.id.toUpperCase(),
            },
          ]
        : [];
    });
    if (!planned.length) return false;
    try {
      await workspaceService.recordPlan({ date: day });
      await refresh();
      setNotice('Đã lưu các bữa ăn từ kế hoạch vào nhật ký.');
      return true;
    } catch (e) {
      setNotice(e.message);
      return false;
    }
  }

  return {
    data,
    notice,
    setNotice,
    refresh,
    changePlan,
    addMeal,
    removeMeal,
    updateProfile,
    recordPlan,
  };
}
