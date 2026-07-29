import { z } from "zod";

function hasAtMostCodePoints(value: string, maximum: number) {
  const codePoints = value[Symbol.iterator]();
  let count = 0;

  while (!codePoints.next().done) {
    count += 1;

    if (count > maximum) {
      return false;
    }
  }

  return true;
}

export const rsvpMessageSchema = z
  .string()
  .refine(
    (value) => hasAtMostCodePoints(value, 1000),
    "Message must contain at most 1,000 characters.",
  );

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
    message: rsvpMessageSchema.nullable().optional().default(null),
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
