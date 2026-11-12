export function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; message?: string };
  return (
    err.code === "PGRST205" ||
    err.code === "42P01" ||
    err.code === "42703" ||
    Boolean(
      err.message &&
        (err.message.includes("does not exist") ||
          err.message.includes("schema cache") ||
          err.message.includes("Could not find the table") ||
          (err.message.includes("column") && err.message.includes("does not exist"))),
    )
  );
}
