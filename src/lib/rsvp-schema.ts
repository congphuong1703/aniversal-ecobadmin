import { z } from "zod";

export const verifyInputSchema = z
  .object({
    guestId: z.string().trim().min(1),
    name: z.string().trim().min(1),
  })
  .strict();

export const rsvpInputSchema = z
  .object({
    verificationToken: z.string().min(1),
    attending: z.boolean(),
    message: z.string().max(1000).nullable().optional().default(null),
    clientSubmissionId: z.uuid(),
  })
  .strict();

export const loginInputSchema = z
  .object({
    password: z.string().min(1),
  })
  .strict();

export type VerifyInput = z.infer<typeof verifyInputSchema>;
export type RsvpInput = z.infer<typeof rsvpInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
