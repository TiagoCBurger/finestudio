export const parseError = (error: unknown) => {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    // For database errors, extract only the relevant message
    // and avoid including query parameters that might contain sensitive data
    let message = error.message;

    // If it's a database error with query details, extract just the error message
    if (message.includes('Failed query:')) {
      const lines = message.split('\n');
      const errorLine = lines.find(line => line.includes('Error:') || line.includes('error:'));
      if (errorLine) {
        message = errorLine.replace(/^.*Error:\s*/, '').trim();
      } else {
        message = 'Database operation failed';
      }
    }

    return message;
  }

  return 'An error occurred';
};
