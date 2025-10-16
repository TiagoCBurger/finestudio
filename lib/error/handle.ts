import { toast } from 'sonner';
import { parseError } from './parse';

export const handleError = (title: string, error: unknown) => {
  const description = parseError(error);
  const timestamp = new Date().toLocaleTimeString();

  // Log detalhado no console para debug
  console.error(`[${timestamp}] ${title}:`, error);

  toast.error(title, {
    description: `[${timestamp}] ${description}`,
  });
};
