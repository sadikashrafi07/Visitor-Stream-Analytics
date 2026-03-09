import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines conditional class names and merges Tailwind classes safely.
 *
 * - clsx handles conditional logic
 * - tailwind-merge removes conflicting Tailwind classes
 *
 * Example:
 * cn("p-2", condition && "bg-red-500", "p-4")
 * -> "bg-red-500 p-4"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs));
}