import "server-only";

export class SubmissionIdConflictError extends Error {
  constructor() {
    super("Submission ID is already in use.");
    this.name = "SubmissionIdConflictError";
  }
}
