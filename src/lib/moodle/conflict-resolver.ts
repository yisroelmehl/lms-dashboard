import type { DataSource } from "@prisma/client";

/**
 * Determines whether a Moodle-synced value should update the resolved field.
 * Manual overrides always take priority.
 */
export function shouldUpdateField(currentSource: DataSource): boolean {
  return currentSource === "moodle";
}

/**
 * Build an update object for a field with override pattern.
 * Only updates the Moodle value; never touches the override.
 */
export function buildSyncUpdate<T>(
  fieldPrefix: string,
  moodleValue: T,
  currentSource: DataSource
): Record<string, unknown> {
  const update: Record<string, unknown> = {
    [`${fieldPrefix}Moodle`]: moodleValue,
  };

  // Only update the source to moodle if there's no manual override
  if (currentSource === "moodle") {
    update[`${fieldPrefix}Source`] = "moodle";
  }

  return update;
}

/**
 * Build a reset-to-moodle update object.
 * Clears the override and sets source back to moodle.
 */
export function buildResetUpdate(
  fieldPrefix: string
): Record<string, unknown> {
  return {
    [`${fieldPrefix}Override`]: null,
    [`${fieldPrefix}Source`]: "moodle",
  };
}

/**
 * Build a manual override update object.
 */
export function buildOverrideUpdate<T>(
  fieldPrefix: string,
  overrideValue: T
): Record<string, unknown> {
  return {
    [`${fieldPrefix}Override`]: overrideValue,
    [`${fieldPrefix}Source`]: "manual",
  };
}
