import { reddit } from '@devvit/web/server';
import { calculateDayNumber } from '../../shared/prism-levels';

export const createPost = async () => {
  const dayNumber = calculateDayNumber();
  const paddedDay = dayNumber.toString().padStart(3, '0');

  return await reddit.submitCustomPost({
    title: `PRISM Daily Chamber #${paddedDay} · Light & Color Synthesis 💎`,
  });
};
