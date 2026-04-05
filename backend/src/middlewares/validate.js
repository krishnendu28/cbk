import { ZodError } from "zod";

export function validateRequest({ bodySchema, paramsSchema, querySchema }) {
  return (req, res, next) => {
    try {
      if (bodySchema) {
        req.body = bodySchema.parse(req.body);
      }
      if (paramsSchema) {
        req.params = paramsSchema.parse(req.params);
      }
      if (querySchema) {
        req.query = querySchema.parse(req.query);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(422).json({
          message: "Validation failed",
          requestId: req.requestId,
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
      }
      return next(error);
    }
  };
}
