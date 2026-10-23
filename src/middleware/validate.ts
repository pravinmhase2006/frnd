import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = (error.issues || []).map((e: any) => ({
          field: Array.isArray(e.path) ? e.path.join('.') : '',
          message: e.message,
        }));
        res.status(400).json({
          success: false,
          message: issues[0]?.message || 'Input validation failed',
          errors: issues,
        });
        return;
      }
      res.status(400).json({ success: false, message: 'Invalid request data' });
    }
  };
};
