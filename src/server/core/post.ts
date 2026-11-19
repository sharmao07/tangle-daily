import { reddit } from '@devvit/web/server';
import { calculateDayNumber, generatePlanarKnot } from '../../shared/tangle-engine';

export const createPost = async () => {
  const dayNumber = calculateDayNumber();
  const paddedDay = dayNumber.toString().padStart(3, '0');
  const knot = generatePlanarKnot(dayNumber);

  const post = await reddit.submitCustomPost({
    title: `Tangle Daily Knot #${paddedDay}: ${knot.title} · Planar Knot Puzzle`,
  });

  // Automated moderator topology briefing & discussion comment
  try {
    const commentBody = [
      `### 🪢 Tangle Daily Knot #${paddedDay}: **${knot.title}**`,
      '',
      `**Topological Archetype:** ${knot.archetype}`,
      `**Metrics:** ${knot.nodes.length} pins · ${knot.edges.length} elastic threads · ${knot.initialCrossings} initial crossings`,
      `**Target Par:** ${knot.parMoves} moves`,
      '',
      '---',
      '',
      '**Rules of the Board:**',
      '1. Tap the interactive board above to launch the canvas.',
      '2. Drag the wooden pins across the drafting board until **zero threads cross**.',
      '3. Solved threads glow emerald.',
      '',
      '**Community Discussion & Etiquette:**',
      '- Please mark move sequences or decomposition strategies with spoiler tags: `>!like this!<`.',
      '- Share your score card, move count, and accolades below. Can you beat Par today?',
      '',
      '*Untangle carefully, weavers!*'
    ].join('\n');

    const comment = await reddit.submitComment({
      id: post.id,
      text: commentBody,
    });

    try {
      await comment.distinguish(true);
    } catch (e) {
      console.warn('Could not sticky comment (moderator permissions may be pending):', e);
    }
  } catch (err) {
    console.error('Failed to submit moderator sticky comment:', err);
  }

  return post;
};
