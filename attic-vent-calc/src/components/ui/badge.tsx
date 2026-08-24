import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.ComponentProps<"span"> & {
  tone?: "neutral" | "ok" | "warn" | "fail" | "intake" | "exhaust";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-surface-2 text-fg",
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn",
    fail: "bg-danger-soft text-danger",
    intake: "bg-intake-soft text-intake",
    exhaust: "bg-exhaust-soft text-exhaust",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
