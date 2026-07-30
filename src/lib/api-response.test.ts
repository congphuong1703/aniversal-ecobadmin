// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { parseJson } from "./api-response";

const schema = z.object({ value: z.string() }).strict();

function request(contentType?: string, body = JSON.stringify({ value: "ok" })) {
  const headers = new Headers();

  if (contentType) {
    headers.set("content-type", contentType);
  }

  return new Request("http://localhost/example", {
    method: "POST",
    headers,
    body,
  });
}

describe("parseJson", () => {
  it.each([
    "application/json",
    "application/json; charset=utf-8",
    "application/problem+json",
    "application/vnd.ecobadminton+json; charset=UTF-8",
  ])("accepts the JSON media type %s", async (contentType) => {
    await expect(parseJson(request(contentType), schema)).resolves.toEqual({
      data: { value: "ok" },
    });
  });

  it.each([undefined, "text/plain", "multipart/form-data", "application/xml"])(
    "returns 415 for unsupported media type %s before parsing",
    async (contentType) => {
      const bodyReader = vi.fn();
      const unsupportedRequest = {
        headers: new Headers(
          contentType ? { "content-type": contentType } : undefined,
        ),
        json: bodyReader,
      } as unknown as Request;

      const result = await parseJson(unsupportedRequest, schema);

      expect("response" in result).toBe(true);
      if ("response" in result) {
        expect(result.response.status).toBe(415);
        expect(await result.response.json()).toEqual({
          error: {
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: "Content-Type must be application/json.",
          },
        });
      }
      expect(bodyReader).not.toHaveBeenCalled();
    },
  );

  it("returns 400 when an accepted JSON body cannot be parsed", async () => {
    const result = await parseJson(
      request("application/json", "not-json"),
      schema,
    );

    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(400);
    }
  });
});
