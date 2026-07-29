export function normalizeGuestName(value: string) {
  return value
    .normalize("NFC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("vi-VN");
}

export function maskGuestName(value: string) {
  return value
    .trim()
    .split(/\s+/u)
    .map((part, index) =>
      index === 0
        ? part
        : `${part.at(0) ?? ""}${"*".repeat(Math.max(part.length - 1, 0))}`,
    )
    .join(" ");
}
