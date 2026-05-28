/** Pressable / LayeredPillButton disabled checks under jsdom + RN-web. */
export function isElementDisabled(el: unknown): boolean {
  if (!el || typeof el !== "object") return false;
  const node = el as {
    getAttribute?: (name: string) => string | null;
    disabled?: boolean;
    props?: { disabled?: boolean; accessibilityState?: { disabled?: boolean } };
  };
  if (node.getAttribute?.("aria-disabled") === "true") return true;
  if (node.disabled === true) return true;
  if (node.props?.disabled === true) return true;
  if (node.props?.accessibilityState?.disabled === true) return true;
  return false;
}
