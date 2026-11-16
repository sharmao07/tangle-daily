import { reddit } from '@devvit/web/server';
import { calculateDayNumber } from '../../shared/tangle-engine';

export const createPost = async () => {
  const dayNumber = calculateDayNumber();
  const paddedDay = dayNumber.toString().padStart(3, '0');

  return await reddit.submitCustomPost({
    title: `Tangle Daily Knot #${paddedDay} · Planar Knot Puzzle`,
  });
};
