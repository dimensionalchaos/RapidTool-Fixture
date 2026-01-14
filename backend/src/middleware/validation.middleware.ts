import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body, params, and query
      const data = {
        ...req.body,
        ...req.params,
        ...req.query,
      };

      await schema.parseAsync(data);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errorMessages,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Internal server error during validation',
      });
    }
  };
};
