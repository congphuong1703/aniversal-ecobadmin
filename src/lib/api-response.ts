import { NextResponse } from "next/server";
import { z } from "zod";

export type JsonError = {
  error: {
    code: string;
    message: string;
    field?: string;
  };
};

type ParseJsonResult<T> = { data: T } | { response: NextResponse<JsonError> };

export function jsonError(
  status: number,
  code: string,
  message: string,
  field?: string,
) {
  return NextResponse.json<JsonError>(
    { error: { code, message, ...(field ? { field } : {}) } },
    { status },
  );
}

export async function parseJson<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<ParseJsonResult<T>> {
  const mediaType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  const isJson =
    mediaType === "application/json" ||
    Boolean(
      mediaType?.startsWith("application/") &&
      mediaType.length > "application/+json".length &&
      mediaType.endsWith("+json"),
    );

  if (!isJson) {
    return {
      response: jsonError(
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Content-Type must be application/json.",
      ),
    };
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return { response: jsonError(400, "INVALID_REQUEST", "Invalid request.") };
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    const field = result.error.issues[0]?.path[0];
    return {
      response: jsonError(
        400,
        "INVALID_REQUEST",
        "Invalid request.",
        typeof field === "string" ? field : undefined,
      ),
    };
  }

  return { data: result.data };
}
