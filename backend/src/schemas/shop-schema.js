import { z } from "zod";

export const updateOrderingStatusSchema = z.object({
  isOrderingOpen: z.coerce.boolean(),
});
