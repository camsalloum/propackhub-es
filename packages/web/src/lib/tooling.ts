export type ToolingScenario = 'new' | 'existing' | 'modification';

export function normalizeToolingScenario(
  value: string | null | undefined
): ToolingScenario {
  if (value === 'existing' || value === 'modification') return value;
  return 'new';
}

/** Colors charged for plates/cylinders — separate from total print colors. */
export function resolveBillableColorCount(input: {
  toolingScenario?: ToolingScenario | string | null;
  printColorCount?: number | null;
  billableColorCount?: number | null;
}): number | null {
  const scenario = normalizeToolingScenario(input.toolingScenario);
  const printColors =
    input.printColorCount != null && Number.isFinite(Number(input.printColorCount))
      ? Math.max(0, Number(input.printColorCount))
      : null;

  if (scenario === 'existing') return 0;
  if (scenario === 'modification') {
    const raw =
      input.billableColorCount != null && Number.isFinite(Number(input.billableColorCount))
        ? Math.max(0, Number(input.billableColorCount))
        : printColors;
    if (raw == null) return null;
    return printColors != null ? Math.min(raw, printColors) : raw;
  }
  return printColors;
}

export function toolingDevelopmentTotal(input: {
  toolingScenario?: ToolingScenario | string | null;
  printColorCount?: number | null;
  billableColorCount?: number | null;
  costPerColor?: number | null;
}): number | null {
  const billable = resolveBillableColorCount(input);
  const cost =
    input.costPerColor != null && Number.isFinite(Number(input.costPerColor))
      ? Number(input.costPerColor)
      : null;
  if (billable == null || cost == null) return null;
  return billable * cost;
}
