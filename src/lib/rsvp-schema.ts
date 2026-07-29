import { z } from "zod";

export const verifyInputSchema = z
  .object({
    guestId: z.string().trim().min(1).max(100),
    name: z.string().trim().min(1).max(200),
  })
  .strict();

export const rsvpInputSchema = z
  .object({
    verificationToken: z.string().trim().min(1).max(4096),
    attending: z.boolean(),
    message: z.string().max(1000).nullable().optional().default(null),
    clientSubmissionId: z.uuid(),
  })
  .strict();

export const loginInputSchema = z
  .object({
    password: z.string().min(1).max(256),
  })
  .strict();

export type VerifyInput = z.infer<typeof verifyInputSchema>;
export type RsvpInput = z.infer<typeof rsvpInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
