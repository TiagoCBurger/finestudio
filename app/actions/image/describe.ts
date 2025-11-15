'use server';

import { getSubscribedUser } from '@/lib/auth';
import { database } from '@/lib/database';
import { parseError } from '@/lib/error/parse';
import { visionModels } from '@/lib/models/vision';
import { projects } from '@/schema';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';

// Default vision model for image description
const DEFAULT_VISION_MODEL = 'openai-gpt-4.1-nano';

export const describeAction = async (
  url: string,
  projectId: string
): Promise<
  | {
    description: string;
  }
  | {
    error: string;
  }
> => {
  try {
    await getSubscribedUser();

    const openai = new OpenAI();

    // Verify project exists and user has access
    const project = await database.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Use default vision model
    const model = visionModels[DEFAULT_VISION_MODEL];

    if (!model) {
      throw new Error('Model not found');
    }

    let parsedUrl = url;

    if (process.env.NODE_ENV !== 'production') {
      const response = await fetch(url);
      const blob = await response.blob();

      parsedUrl = `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;
    }

    const response = await openai.chat.completions.create({
      model: model.providers[0].model.modelId,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Describe this image.' },
            {
              type: 'image_url',
              image_url: {
                url: parsedUrl,
              },
            },
          ],
        },
      ],
    });

    const description = response.choices.at(0)?.message.content;

    if (!description) {
      throw new Error('No description found');
    }

    return {
      description,
    };
  } catch (error) {
    const message = parseError(error);

    return { error: message };
  }
};
