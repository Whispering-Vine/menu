import React, { type ReactNode } from "react";
import { BottleWine, Wine } from "lucide-react";
import { MenuQrCode } from "./menu-qr-code";
import {
  measureMenuText as textWidth,
  wrapMenuDescription,
} from "@/lib/menu-text-layout";
import {
  menuValue,
  signatureGroup,
  type MenuPath,
  type MenuRecord,
} from "@/lib/fourth-street-visual-menu";

export const FOURTH_STREET_PAGES = [
  ["signature", "Signature"],
  ["flights", "Flights"],
  ["cocktails", "Cocktails"],
  ["beer", "Beer & spirits"],
  ["food-1", "Kitchen · 1"],
  ["food-2", "Kitchen · 2"],
] as const;
export type MenuFieldRenderer = (
  path: MenuPath,
  label: string,
  className?: string,
  placeholder?: string,
  format?: (value: string) => string,
) => ReactNode;
export type MenuInteraction = {
  field: MenuFieldRenderer;
  itemProps: (path: MenuPath) => React.HTMLAttributes<HTMLElement>;
  showSection: (path: MenuPath) => void;
};
export const menuText = (value: string) =>
  value.replace(/\s*\|\s*|\s*\n\s*/g, " · ").trim();
const Favorite = () => (
  <svg
    className="favorite-star"
    viewBox="0 0 12 12"
    aria-label="House favorite"
  >
    <path
      fill="currentColor"
      d="M6 0 7.8 4.2 12 6 7.8 7.8 6 12 4.2 7.8 0 6 4.2 4.2Z"
    />
  </svg>
);
const compactWine = (wine: MenuRecord) => {
  const nameWidth = textWidth(
    String(wine.name).trim().toUpperCase(),
    "name",
    9.7,
  );
  const description = `${String(wine.variety).trim()} · ${String(wine.location).trim()}`;
  return (
    nameWidth + textWidth(description, "description", 9) + 38 > 238 &&
    nameWidth + textWidth(description, "description", 8.5) + 38 <= 240
  );
};
const money = (value: string) => value.replace(/^\$/, "").trim();
const categoryPath = (page: string, key: string): MenuPath => [
  page,
  "categories",
  key,
];
type Entry = { item: MenuRecord; path: MenuPath };

/** The editor and the PDF use this exact DOM. All design values live in design.css. */
export function FourthStreetMenuPage({
  menuData: menu,
  page,
  interaction,
}: {
  menuData: MenuRecord;
  page: string;
  interaction?: MenuInteraction;
}) {
  const field: MenuFieldRenderer =
    interaction?.field ??
    ((path, _label, className, _placeholder, format) => {
      const value = String(menuValue(menu, path) ?? "");
      return (
        <span className={className}>{format ? format(value) : value}</span>
      );
    });
  const props = (path: MenuPath) => ({
    "data-print-item": JSON.stringify(path),
    ...interaction?.itemProps(path),
  });
  const entries = (p: string, key: string): Entry[] =>
    (menu[p]?.categories?.[key]?.items || []).map(
      (item: MenuRecord, i: number) => ({
        item,
        path: [...categoryPath(p, key), "items", i],
      }),
    );
  const value = (
    path: MenuPath,
    fallback: string,
    label = "Section title",
    format?: (text: string) => string,
  ) =>
    menuValue(menu, path) == null
      ? fallback
      : field(path, label, undefined, undefined, format);
  const cost = (path: MenuPath) =>
    field(path, "Price", "price", undefined, money);
  const heading = (text: ReactNode, caption?: ReactNode) => (
    <header className="section-heading">
      <h2>{text}</h2>
      {caption && <div className="caption">{caption}</div>}
    </header>
  );
  const title = (text: ReactNode, caption?: ReactNode) => (
    <header className="page-heading">
      <h1>{text}</h1>
      {caption && <div className="caption">{caption}</div>}
    </header>
  );
  const icons = (
    <span className="wine-icons">
      <Wine aria-label="Glass" />
      <BottleWine aria-label="Bottle" />
    </span>
  );
  const wineRow = ({ item, path }: Entry, special = false) => (
    <div key={JSON.stringify(path)} {...props(path)} className="wine-row">
      <div className="leader">
        <span className="row-copy">
          <span className="name">{field([...path, "name"], "Wine name")}</span>{" "}
          <span className="description">
            {field(
              [...path, special ? "notes" : "description"],
              "Wine description",
              undefined,
              undefined,
              menuText,
            )}
          </span>
        </span>
        <i className="dots" />
      </div>
      {cost([...path, ...(special ? ["glass"] : ["price", "glass"])])}
      {cost([...path, ...(special ? ["bottle"] : ["price", "bottle"])])}
    </div>
  );
  const optional = (p: string, key: string, content: ReactNode) => {
    const cat = menu[p]?.categories?.[key];
    if (!cat) return null;
    const flag =
      p === "signature" && key === "special-flight" ? "hidden" : "show";
    const visible =
      flag === "hidden" ? cat.hidden === true : cat.show !== false;
    if (visible)
      return (
        <div {...interaction?.itemProps(categoryPath(p, key))}>{content}</div>
      );
    return interaction ? (
      <div className="visual-hidden">
        {cat.name || key} is hidden.{" "}
        <button
          onClick={() =>
            interaction.showSection([...categoryPath(p, key), flag])
          }
        >
          Show section
        </button>
      </div>
    ) : null;
  };
  const badges = (item: MenuRecord) => (
    <>
      {item.warning && "*"}
      {item.gluten_free && (
        <span className="badge gf"><span>GF</span></span>
      )}
      {item.new && <span className="badge">NEW</span>}
    </>
  );
  const foodItem = ({ item, path }: Entry) => (
    <article key={JSON.stringify(path)} {...props(path)} className="food-item">
      <div className="leader food-name">
        <span className="row-copy name">
          {item.favorites && <Favorite />}
          {field([...path, "name"], "Item name")}
          {badges(item)}
        </span>
        <i className="dots" />
        {cost([...path, "price"])}
      </div>
      {item.description && (
        <div className="description">
          {field([...path, "description"], "Description")}
        </div>
      )}
    </article>
  );
  const foodEntries = (section: string): Entry[] => {
    if (["starters", "burgers"].includes(section))
      return entries("food-1", section).filter((e) => !e.item.featured_offer);
    if (["tacos", "desserts"].includes(section))
      return entries("food-2", section);
    if (["salads", "sides"].includes(section))
      return entries("food-1", "sides").filter(
        (e) => (e.item.print_section || "salads") === section,
      );
    return entries("food-2", "mains").filter(
      (e) => (e.item.print_section || "mains") === section,
    );
  };
  const foodSection = (section: string) => {
    const list = foodEntries(section);
    if (!list.length) return null;
    const caption =
      section === "starters"
        ? value(
            [...categoryPath("food-1", "starters"), "caption"],
            "Served All Day",
            "Section caption",
          )
        : section === "burgers"
          ? value(
              [...categoryPath("food-1", "burgers"), "caption"],
              "",
              "Section caption",
            )
          : undefined;
    return (
      <section
        className={`food-section section-${section}`}
        data-layout-region={section}
      >
        {heading(
          value(["print", "sections", section], section.replaceAll("-", " ")),
          caption,
        )}
        <div className="food-items">{list.map(foodItem)}</div>
      </section>
    );
  };
  const flight = ({ item, path }: Entry) => (
    <section
      key={JSON.stringify(path)}
      {...props(path)}
      className={`flight ${item.featured ? "featured-flight double-border" : ""}`}
    >
      <div className="leader flight-heading">
        <span className="name">{field([...path, "name"], "Flight name")}</span>
        <i className="dots" />
        {cost([...path, "price"])}
      </div>
      {(item.items || []).map((wine: MenuRecord, i: number) => {
        const p = [...path, "items", i];
        return (
          <div
            key={i}
            {...props(p)}
            className={`leader flight-wine ${compactWine(wine) ? "compact" : ""}`}
          >
            <span className="row-copy">
              <span className="name">{field([...p, "name"], "Wine name")}</span>{" "}
              <span className="description">
                {field(
                  [...p, "variety"],
                  "Variety",
                  undefined,
                  undefined,
                  (v) => v.trim(),
                )}{" "}
                ·{" "}
                {field(
                  [...p, "location"],
                  "Location",
                  undefined,
                  undefined,
                  (v) => v.trim(),
                )}
              </span>
            </span>
            <i className="dots" />
            <span className="flight-price">
              {cost([...p, "price"])}
              <span className="glass-size">
                {" "}
                /{field([...p, "glassSize"], "Glass size")}
              </span>
            </span>
          </div>
        );
      })}
    </section>
  );
  const cocktail = ({ item, path }: Entry) => {
    const list = entries(page, String(path[2])).filter((e) => !e.item.featured);
    const position = list.findIndex((e) => e.path.at(-1) === path.at(-1));
    const width = item.featured
      ? 222
      : position < Math.ceil(list.length / 2)
        ? 231.1
        : 217.6;
    const ingredients = menuText(String(item.description || ""));
    const preparation = menuText(String(item.serving || ""));
    const joined = wrapMenuDescription(
      ingredients + (preparation ? ` · ${preparation}` : ""),
      width,
    );
    return (
      <article
        key={JSON.stringify(path)}
        {...props(path)}
        className={`cocktail ${item.featured ? "featured-cocktail double-border" : ""}`}
      >
        <div className="leader">
          <span className="name">
            {field([...path, "name"], "Cocktail name")}
          </span>
          {!item.featured && <i className="dots" />}
          {cost([...path, "price"])}
        </div>
        <div className="description">
          {field(
            [...path, "description"],
            "Ingredients",
            undefined,
            undefined,
            () => joined.slice(0, ingredients.length),
          )}
          {preparation && (
            <>
              {joined.slice(ingredients.length, ingredients.length + 3)}
              {field(
                [...path, "serving"],
                "Preparation",
                undefined,
                undefined,
                () => joined.slice(ingredients.length + 3),
              )}
            </>
          )}
        </div>
      </article>
    );
  };
  const split = (
    list: Entry[],
    render: (e: Entry) => ReactNode,
    className = "",
  ) => {
    const half = Math.ceil(list.length / 2);
    return (
      <div className={`two-columns ${className}`}>
        <div>{list.slice(0, half).map(render)}</div>
        <div>{list.slice(half).map(render)}</div>
      </div>
    );
  };
  let content: ReactNode;
  if (page === "signature") {
    const groups: { name: string; list: Entry[] }[] = [];
    const labels: Record<string, string> = {
      Bubbles: "Sparkling",
      "White Wines": "White",
      Reds: "Red",
      "Non-Alcoholic": "Zero Proof",
    };
    for (const e of entries(page, "signature")) {
      const name =
        e.item.print_section ||
        labels[signatureGroup(e.item)] ||
        signatureGroup(e.item);
      if (groups.at(-1)?.name === name) groups.at(-1)!.list.push(e);
      else groups.push({ name, list: [e] });
    }
    content = (
      <>
        {title(
          value(
            [...categoryPath(page, "signature"), "name"],
            "Signature Selection",
          ),
          value(
            [...categoryPath(page, "signature"), "caption"],
            "Enjoy an 8oz. glass",
            "Caption",
          ),
        )}
        <div className="signature-list" data-layout-region="signature wines">
          {groups.map((g, i) => (
            <section className="signature-group" key={i}>
              {heading(
                <>
                  {g.name}
                  {i === 0 && icons}
                </>,
              )}
              {g.list.map((e) => wineRow(e))}
            </section>
          ))}
        </div>
        {optional(
          page,
          "special-flight",
          <section className="special-flight">
            {heading(
              value(
                [...categoryPath(page, "special-flight"), "name"],
                "Special Flight",
              ),
            )}
            {entries(page, "special-flight").map((e) =>
              typeof e.item.price === "object" ? wineRow(e) : foodItem(e),
            )}
          </section>,
        )}
      </>
    );
  } else if (page === "flights") {
    const list = entries(page, "flights");
    content = (
      <>
        {title(
          value(
            [...categoryPath(page, "flights"), "title"],
            "Flights & Glasses",
          ),
          value([...categoryPath(page, "flights"), "caption"], "", "Caption"),
        )}
        {split(
          list.filter((e) => !e.item.featured),
          flight,
          "flights-grid",
        )}
        {list.filter((e) => e.item.featured).map(flight)}
        <section
          className="weekly-specials"
          data-layout-region="weekly specials"
        >
          {heading(<>Weekly Specials{icons}</>)}
          {entries(page, "specials").map((e) => wineRow(e, true))}
        </section>
      </>
    );
  } else if (page === "cocktails") {
    content = (
      <>
        {title("Cocktails")}
        {["seasonal", "house"].map((key) => (
          <section
            key={key}
            className={`cocktail-section ${key}`}
            data-layout-region={`${key} cocktails`}
          >
            {heading(
              value(
                [...categoryPath(page, key), "name"],
                key === "seasonal"
                  ? "Seasonal Cocktails"
                  : "House Classic Cocktails",
              ),
            )}
            {split(
              entries(page, key).filter((e) => !e.item.featured),
              cocktail,
              "cocktail-grid",
            )}
            {entries(page, key)
              .filter((e) => e.item.featured)
              .map(cocktail)}
          </section>
        ))}
        <footer className="cocktail-footer">
          <div>
            <span className="name">
              {value(
                [...categoryPath(page, "non"), "name"],
                "Non Alcoholic Cocktails Available",
              )}
            </span>{" "}
            -{" "}
            <span className="description">
              {value(
                [...categoryPath(page, "non"), "description"],
                "",
                "Description",
              )}
            </span>
          </div>
          <div className="kitchen-round">
            {value(
              [...categoryPath(page, "kitchen"), "name"],
              "",
              "Kitchen offering",
            )}{" "}
            - ${cost([...categoryPath(page, "kitchen"), "price"])}
          </div>
        </footer>
      </>
    );
  } else if (page === "beer") {
    const beerList = (key: string) => (
      <section className={`beer-list ${key}`} data-layout-region={key}>
        {heading(value([...categoryPath(page, key), "name"], key))}
        {entries(page, key).map(({ item, path }) => (
          <div
            key={JSON.stringify(path)}
            {...props(path)}
            className="leader beer-row"
          >
            <span className="row-copy">
              <span className="name">
                {field([...path, "name"], "Beer name")}
              </span>
              {item.local && <span className="badge">LOCAL</span>}{" "}
              <span className="description">
                {field([...path, "brewery"], "Brewery")} ·{" "}
                {field([...path, "abv"], "ABV", undefined, undefined, (v) =>
                  v.replace(/\s/g, ""),
                )}{" "}
                ABV · {field([...path, "ibu"], "IBU")} IBU
              </span>
            </span>
            <i className="dots" />
            {cost([...path, "price"])}
          </div>
        ))}
      </section>
    );
    const qr = menu[page]?.categories?.qr;
    content = (
      <>
        {title("Beer & Spirits")}
        {beerList("tap")}
        {optional(page, "bottled", beerList("bottled"))}
        <div className="spirits-grid two-columns" data-layout-region="spirits">
          <section>
            {heading(
              value(
                [...categoryPath(page, "whiskey-flight"), "title"],
                "Spirits Flight",
              ),
              value(
                [...categoryPath(page, "whiskey-flight"), "caption"],
                "",
                "Caption",
              ),
            )}
            <div className="spirit-pours">
              {field(
                [...categoryPath(page, "whiskey-flight"), "description"],
                "Flight description",
              )}
            </div>
            <div className="spirit-price">
              {field(
                [...categoryPath(page, "whiskey-flight"), "price"],
                "Flight price",
              )}
            </div>
          </section>
          <section>
            {heading(
              value(
                [...categoryPath(page, "qr"), "title"],
                "Whispering Vine Spirits Bible",
              ),
            )}
            <div className="spirits-caption">
              {field(
                [...categoryPath(page, "qr"), "caption"],
                "Spirits caption",
                undefined,
                undefined,
                (v) =>
                  v
                    .replace(/ 150\+/, "\n150+")
                    .replace(/ Create a/, "\nCreate a"),
              )}
            </div>
            <MenuQrCode
              value={qr?.url || "qr.wvwine.co/wsky"}
              size={58}
              className="spirits-qr"
            />
          </section>
        </div>
        <footer className="beer-footer description">
          {field([...categoryPath(page, "note")], "Footer")}
        </footer>
      </>
    );
  } else if (page === "food-1") {
    content = (
      <>
        <header className="kitchen-header">
          <h1>{value(["print", "kitchen_title"], "Kitchen Menu")}</h1>
          <div className="description">
            {value(
              ["print", "kitchen_caption"],
              "Locally inspired, lovingly prepared",
            )}
          </div>
        </header>
        <div className="two-columns food-columns">
          <div>
            {foodSection("starters")}
            {foodSection("small-plates")}
          </div>
          <div>
            {foodSection("salads")}
            {foodSection("flatbreads")}
            {foodSection("tacos")}
          </div>
        </div>
        <footer className="food-legend">
          <div className="food-legend-symbols">
            <span className="food-legend-key"><Favorite /><span>FAVORITES</span></span>
            <span className="food-legend-key">
              <span className="badge gf"><span>GF</span></span>
              <span>GLUTEN FREE</span>
            </span>
          </div>
          <div>{field([page, "footer"], "Footer")}</div>
        </footer>
      </>
    );
  } else {
    const offers = entries("food-1", "burgers").filter(
      (e) => e.item.featured_offer,
    );
    content = (
      <>
        <header className="kitchen-header chef">
          <h2>{value(["print", "chef"], "Chef Josh Davis")}</h2>
          <div>
            {value(
              ["print", "kitchen_hours"],
              "Kitchen Hours: Mon - Sat 4pm - 8:45pm",
            )}
          </div>
        </header>
        <div className="two-columns food-columns">
          <div>
            {foodSection("burgers")}
            {foodSection("sides")}
          </div>
          <div>
            {foodSection("mains")}
            {offers.map(({ item, path }) => (
              <section
                key={JSON.stringify(path)}
                {...props(path)}
                className="burger-offer double-border"
                data-layout-region="burger offer"
              >
                <h3>{field([...path, "name"], "Offer name")}</h3>
                <div className="description">
                  {field([...path, "description"], "Offer description")}
                </div>
                {(item.items?.length
                  ? item.items
                  : [{ name: "", price: item.price }]
                ).map((_: MenuRecord, i: number) => {
                  const p = item.items?.length ? [...path, "items", i] : path;
                  return (
                    <div key={i} {...props(p)} className="leader offer-option">
                      <span className="name">
                        {field([...p, "name"], "Bottle name")}
                      </span>
                      <i className="dots" />
                      {cost([...p, "price"])}
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
        </div>
        <section className="desserts" data-layout-region="desserts">
          {heading(value(["print", "sections", "desserts"], "Desserts"))}
          {split(foodEntries("desserts"), foodItem)}
        </section>
        <footer className="food-advisory">
          <div>{field([page, "warning"], "Consumer advisory")}</div>
          <span>
            SCAN FOR A<br />
            DIGITAL COPY
          </span>
          <MenuQrCode
            value={menu.print?.digital_url || "qr.wvwine.co/1"}
            size={44}
          />
        </footer>
      </>
    );
  }
  return (
    <section
      id={`menu-page-${page}`}
      data-menu-page={page}
      aria-label={FOURTH_STREET_PAGES.find(([id]) => id === page)?.[1]}
      className={`page page-${page}`}
    >
      <svg className="page-frame" viewBox="0 0 612 792" aria-hidden="true">
        <rect
          x="29.25"
          y="29.25"
          width="553.5"
          height="733.5"
          strokeWidth="1.5"
        />
        <rect
          x="34.125"
          y="34.125"
          width="543.75"
          height="723.75"
          strokeWidth=".75"
        />
      </svg>
      <div className="page-content">{content}</div>
    </section>
  );
}

export function FourthStreetMenuDocument({
  menuData,
}: {
  menuData: MenuRecord;
}) {
  return (
    <div id="menu-container">
      {FOURTH_STREET_PAGES.map(([page]) => (
        <FourthStreetMenuPage key={page} page={page} menuData={menuData} />
      ))}
    </div>
  );
}
