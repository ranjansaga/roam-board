/** Framework-free mapping from an AI-boundary failure to a user-facing error (code/message/status). */
export interface MappedError {
  code: string;
  message: string;
  status: number;
}

export function mapGenerationError(e: unknown): MappedError {
  const name = e instanceof Error ? e.name : "";
  const status =
    typeof e === "object" && e !== null
      ? ((e as { statusCode?: number; status?: number }).statusCode ??
        (e as { status?: number }).status)
      : undefined;

  if (name === "TimeoutError" || name === "AbortError") {
    return { code: "timeout", message: "The plan took too long to generate. Please try again.", status: 408 };
  }
  if (name.includes("NoObjectGenerated")) {
    return {
      code: "unusable_output",
      message: "We couldn't produce a valid plan. Please try again.",
      status: 422,
    };
  }
  if (status === 401 || status === 403) {
    return { code: "provider_auth", message: "Your API key was rejected. Check it in Settings.", status: 401 };
  }
  if (status === 429) {
    return {
      code: "provider_rate_limited",
      message: "The AI service is busy. Please try again shortly.",
      status: 429,
    };
  }
  return {
    code: "provider_error",
    message: "Something went wrong generating your plan. You can keep editing manually.",
    status: 502,
  };
}
