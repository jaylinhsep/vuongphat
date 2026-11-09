export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const initialFormState: FormState = { status: "idle" };

export function errorState(error: unknown, fallback = "Đã có lỗi xảy ra"): FormState {
  const message = error instanceof Error ? error.message : fallback;
  return { status: "error", message };
}
