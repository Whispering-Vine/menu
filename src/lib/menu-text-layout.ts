import fontMetrics from "./menu-font-metrics.json";

/** Bundled font advance widths, in ems. Used for the reference's deliberate wraps. */
export function measureMenuText(
  text: string,
  font: keyof typeof fontMetrics,
  size: number,
) {
  return [...text].reduce(
    (width, char) =>
      width +
      ((fontMetrics[font] as Record<string, number>)[char] ?? 0.6) * size,
    0,
  );
}

export function wrapMenuDescription(text: string, width: number, size = 9) {
  // Keep ingredient separators with the preceding word, never alone at the
  // beginning of a wrapped line.
  const words = text.replace(/ · /g, "\u00a0· ").split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const trial = current ? `${current} ${word}` : word;
    if (!current || measureMenuText(trial, "description", size) <= width)
      current = trial;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  // Avoid the short trailing fragments left by the original PDF's mask edits.
  while (
    lines.length > 1 &&
    measureMenuText(lines.at(-1)!, "description", size) < width * 0.32
  ) {
    const previous = lines.at(-2)!.split(" ");
    if (previous.length <= 1) break;
    lines[lines.length - 1] = `${previous.pop()} ${lines.at(-1)}`;
    lines[lines.length - 2] = previous.join(" ");
  }
  return lines.join("\n");
}
