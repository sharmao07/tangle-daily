import { Hono } from 'hono';
import { createPost } from '../core/post';

export const scheduler = new Hono();

scheduler.post('/daily-post', async (c) => {
  try {
    const post = await createPost();
    console.log(`[Scheduler] Daily knot post created: ${post.id}`);
    return c.json({ status: 'success', postId: post.id }, 200);
  } catch (error) {
    console.error(`[Scheduler] Failed to create daily post: ${error}`);
    return c.json({ status: 'error', message: String(error) }, 500);
  }
});
