import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

export function validateRequest(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({
      message: "Validation failed",
      errors: errors.array().reduce(
        (acc, err: any) => ({
          ...acc,
          [err.path]: [...(acc[err.path] ?? []), err.msg],
        }),
        {} as Record<string, string[]>
      ),
    });
    return;
  }
  next();
}
