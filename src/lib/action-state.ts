/**
 * Shared shape for every server action result.
 *
 * This lives outside the "use server" module because a file marked "use server"
 * may only export async functions — a plain constant like IDLE is not allowed
 * there.
 */
export type ActionState = {
  status: "idle" | "ok" | "error";
  message: string;
  detail?: string;
  errors?: Record<string, string>;
};

export const IDLE: ActionState = { status: "idle", message: "" };
