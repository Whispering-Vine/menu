/** Measure the last line, so leaders never run through wrapped item text.
 * Used by both the live iframe and the PDF. No white masks or text overlays. */
export function layoutMenuLeaders(root: Document = document) {
  for (const leader of root.querySelectorAll<HTMLElement>(".leader")) {
    const dots = leader.querySelector<HTMLElement>(":scope > .dots");
    const copy = leader.querySelector<HTMLElement>(
      ":scope > .row-copy, :scope > .name",
    );
    if (!dots || !copy) continue;
    // Reserve the real price/pour width. Prefer the reference's compact
    // description sizes (down to 8pt) before introducing another line.
    if (leader.classList.contains("flight-wine")) {
      const flightPrice = leader.querySelector<HTMLElement>(
        ":scope > .flight-price",
      );
      const description = copy.querySelector<HTMLElement>(".description");
      if (flightPrice && description) {
        leader.style.paddingRight = "";
        description.style.fontSize = "";
        const originalHeight = leader.offsetHeight;
        let size = parseFloat(
          root.defaultView!.getComputedStyle(description).fontSize,
        );
        leader.style.paddingRight = `${flightPrice.offsetWidth + 4}px`;
        while (
          leader.offsetHeight > originalHeight + 1 &&
          size > 32 / 3 + 0.01
        ) {
          size = Math.max(32 / 3, size - 2 / 3);
          description.style.fontSize = `${size}px`;
        }
      }
    }
    const bounds = leader.getBoundingClientRect();
    const scale = bounds.width / leader.offsetWidth || 1;
    const walker = root.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
    const rects: DOMRect[] = [];
    while (walker.nextNode()) {
      const range = root.createRange();
      range.selectNodeContents(walker.currentNode);
      for (const rect of range.getClientRects())
        if (rect.width) rects.push(rect);
    }
    // Include the tag's box, not just its glyphs, so the leader clears its border.
    for (const badge of copy.querySelectorAll<HTMLElement>(".badge"))
      rects.push(badge.getBoundingClientRect());
    const bottom = Math.max(...rects.map((rect) => rect.bottom));
    const lastLine = rects.filter((rect) => bottom - rect.bottom < 7 * scale);
    const end = Math.max(bounds.left, ...lastLine.map((rect) => rect.right));
    const price = leader.querySelector<HTMLElement>(
      ":scope > .price, :scope > .flight-price",
    );
    // A zero-height inline marker gives the actual last text baseline. Bounding
    // boxes alone include different ascenders/descenders for the two typefaces.
    const baselines: number[] = [];
    for (const element of [copy, price]) {
      if (!element) continue;
      const marker = root.createElement("span");
      marker.style.cssText =
        "display:inline-block;width:0;height:0;padding:0;margin:0;border:0;vertical-align:baseline";
      element.append(marker);
      const y = marker.getBoundingClientRect().top;
      marker.remove();
      baselines.push(y);
    }
    const textBaseline = baselines[0];
    const dotSize = leader.closest(".cocktail") ? 0.6 : 1;
    const dotRise = leader.closest(".cocktail")
      ? 8 / 3
      : leader.classList.contains("food-name")
        ? 1
        : 2;
    dots.style.top = `${(textBaseline - bounds.top) / scale - dotRise}px`;
    dots.style.bottom = "auto";
    if (
      price &&
      root.defaultView!.getComputedStyle(price).position === "absolute"
    ) {
      const priceBounds = price.getBoundingClientRect();
      const ascent = (baselines[1] - priceBounds.top) / scale;
      price.style.top = `${(textBaseline - bounds.top) / scale - ascent + (leader.classList.contains("beer-row") ? 1 : 0)}px`;
      price.style.bottom = "auto";
    }
    const right = price?.getBoundingClientRect().left ?? bounds.right;
    dots.style.left = `${(end - bounds.left) / scale + 4}px`;
    dots.style.right = `${Math.max(0, (bounds.right - right) / scale + 3)}px`;
    dots.style.display = right - end < 9 * scale ? "none" : "block";
    // Use vector rectangles, not a CSS gradient (Chromium rasterizes gradients
    // with phase-dependent thickness in a PDF).
    const width = Math.max(0, dots.getBoundingClientRect().width / scale);
    const svg = root.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(dotSize));
    svg.setAttribute("viewBox", `0 0 ${width || 1} ${dotSize}`);
    svg.style.display = "block";
    for (let x = 0; x + dotSize <= width; x += 2) {
      const dot = root.createElementNS("http://www.w3.org/2000/svg", "rect");
      dot.setAttribute("x", String(x));
      dot.setAttribute("width", String(dotSize));
      dot.setAttribute("height", String(dotSize));
      svg.append(dot);
    }
    dots.replaceChildren(svg);
  }
}
