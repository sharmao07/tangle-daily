import { reddit } from '@devvit/web/server';
import { calculateDayNumber } from '../../shared/generator';

export const createPost = async () => {
  const dayNumber = calculateDayNumber();
  const paddedDay = dayNumber.toString().padStart(3, '0');

  return await reddit.submitCustomPost({
    title: `Windward Daily Flight #${paddedDay} · The Migration Corridor 🕊️`,
  });
};
