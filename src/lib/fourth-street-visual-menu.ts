/** Paths address the existing menu payload without dropping Toast links or other metadata. */
export type MenuPath = (string | number)[];
export type MenuRecord = Record<string, any>;

export function menuValue(menu: MenuRecord, path: MenuPath): any {
  return path.reduce((value, key) => value?.[key], menu);
}

export function editMenuValue(
  menu: MenuRecord,
  path: MenuPath,
  value: unknown,
): MenuRecord {
  if (!path.length || menuValue(menu, path.slice(0, -1)) == null) return menu;
  const next = structuredClone(menu);
  menuValue(next, path.slice(0, -1))[path.at(-1)!] = value;
  return next;
}

export function moveMenuItem(
  menu: MenuRecord,
  path: MenuPath,
  offset: number,
): MenuRecord {
  const index = path.at(-1);
  const items = menuValue(menu, path.slice(0, -1));
  if (
    typeof index !== "number" ||
    !Array.isArray(items) ||
    index + offset < 0 ||
    index + offset >= items.length
  )
    return menu;
  const reordered = [...items];
  const [item] = reordered.splice(index, 1);
  reordered.splice(index + offset, 0, item);
  return editMenuValue(menu, path.slice(0, -1), reordered);
}

export function removeMenuItem(menu: MenuRecord, path: MenuPath): MenuRecord {
  const index = path.at(-1);
  const items = menuValue(menu, path.slice(0, -1));
  if (typeof index !== "number" || !Array.isArray(items)) return menu;
  return editMenuValue(
    menu,
    path.slice(0, -1),
    items.filter((_, i) => i !== index),
  );
}

export function signatureGroup(item: MenuRecord): string {
  const name = String(item.name || "").toLowerCase();
  const description = String(item.description || "");
  const variety = (description.split("|")[1] || description)
    .trim()
    .toLowerCase();
  if (name.includes("0% alcohol") || variety.includes("0%"))
    return "Non-Alcoholic";
  if (/brut|sparkling|champagne|blanc de blanc/.test(variety)) return "Bubbles";
  if (/sauvignon blanc|chardonnay|moscato|white blend|viognier/.test(variety))
    return "White Wines";
  if (/rosé|rose/.test(variety)) return "Rosé";
  if (
    /cab|pinot noir|merlot|malbec|chianti|montepulciano|zinfandel|grenache|red blend/.test(
      variety,
    )
  )
    return "Reds";
  return "Other Selections";
}

/** Move within the displayed section, even when storage combines multiple sections. */
export function menuItemPeers(menu: MenuRecord, path: MenuPath): number[] {
  const siblings = menuValue(menu, path.slice(0, -1));
  const selected = menuValue(menu, path);
  if (!Array.isArray(siblings) || !selected) return [];
  return siblings.flatMap((item: MenuRecord, index: number) =>
    item.print_section === selected.print_section &&
    Boolean(item.featured) === Boolean(selected.featured) &&
    Boolean(item.featured_offer) === Boolean(selected.featured_offer)
      ? [index]
      : [],
  );
}

export function moveVisibleMenuItem(
  menu: MenuRecord,
  path: MenuPath,
  offset: number,
) {
  const peers = menuItemPeers(menu, path);
  const index = Number(path.at(-1));
  const target = peers[peers.indexOf(index) + offset];
  if (target === undefined) return { menu, path };
  const siblings = [...menuValue(menu, path.slice(0, -1))];
  const [item] = siblings.splice(index, 1);
  siblings.splice(target, 0, item);
  return {
    menu: editMenuValue(menu, path.slice(0, -1), siblings),
    path: [...path.slice(0, -1), target],
  };
}
