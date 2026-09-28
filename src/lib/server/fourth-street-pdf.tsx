import React from "react";
import { prerender } from "react-dom/static";
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { FourthStreetMenuDocument } from "@/components/menu/fourth-street-menu-document";
import { layoutMenuLeaders } from "@/lib/menu-leader-layout";
import type { MenuRecord } from "@/lib/fourth-street-visual-menu";

export async function fourthStreetHtml(menu: MenuRecord) {
  const root = path.join(process.cwd(), "public/fourth-street-menu");
  let css = await readFile(path.join(root, "design.css"), "utf8");
  for (const font of [
    "Marcellus",
    "Montserrat",
    "Montserrat-Italic",
    "Montserrat-SemiBold",
    "DejaVuSans-Bold",
  ]) {
    const data = await readFile(path.join(root, `fonts/${font}.ttf`));
    css = css.replace(
      `/fourth-street-menu/fonts/${font}.ttf`,
      `data:font/ttf;base64,${data.toString("base64")}`,
    );
  }
  const { prelude } = await prerender(
    <FourthStreetMenuDocument menuData={menu} />,
  );
  const markup = await new Response(prelude).text();
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Whispering Vine · Fourth Street Menu</title><style>${css}</style></head><body>${markup}<script>document.fonts.ready.then(function(){(${layoutMenuLeaders.toString()})(document);});</script></body></html>`;
}

async function browserOptions() {
  if (process.env.CHROME_EXECUTABLE_PATH)
    return { executablePath: process.env.CHROME_EXECUTABLE_PATH };
  if (process.platform === "darwin") {
    const executablePath =
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    await access(executablePath);
    return { executablePath };
  }
  const { default: chromium } = await import("@sparticuz/chromium");
  return {
    executablePath: await chromium.executablePath(),
    args: chromium.args,
  };
}

export class MenuLayoutError extends Error {}

/** Entire document is self-contained: no URL renderer, remote fonts, S3, or older PDF. */
export async function generateFourthStreetPdf(
  menu: MenuRecord,
  options: { allowOverflow?: boolean } = {},
) {
  const browser = await puppeteer.launch({
    ...(await browserOptions()),
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(await fourthStreetHtml(menu), { waitUntil: "load" });
    await page.emulateMediaType("print");
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await page.evaluate(layoutMenuLeaders);
    const issues = await page.evaluate(() => {
      const errors: string[] = [];
      for (const sheet of document.querySelectorAll<HTMLElement>(
        "[data-menu-page]",
      )) {
        const content = sheet.querySelector<HTMLElement>(".page-content")!;
        const bounds = content.getBoundingClientRect();
        if (content.scrollHeight > content.clientHeight + 2)
          errors.push(`${sheet.dataset.menuPage}: content exceeds the page`);
        for (const item of content.querySelectorAll<HTMLElement>(
          "[data-print-item]",
        )) {
          const r = item.getBoundingClientRect();
          if (
            r.bottom > bounds.bottom + 2 ||
            r.right > bounds.right + 2 ||
            item.scrollWidth > item.clientWidth + 2
          )
            errors.push(
              `${sheet.dataset.menuPage}: item does not fit (${item.innerText.slice(0, 65)})`,
            );
        }
        const columns = content.querySelectorAll<HTMLElement>(
          ".two-columns > div, .flights-grid .flight",
        );
        for (const col of columns)
          if (col.scrollHeight > col.clientHeight + 2)
            errors.push(
              `${sheet.dataset.menuPage}: section exceeds its available height`,
            );
      }
      if (
        !document.fonts.check("11px Marcellus") ||
        !document.fonts.check("italic 9px Montserrat")
      )
        errors.push("Menu fonts did not load");
      return [...new Set(errors)];
    });
    if (issues.length && !options.allowOverflow)
      throw new MenuLayoutError(issues.join("\n"));
    const pdf = await page.pdf({
      format: "letter",
      printBackground: true,
      preferCSSPageSize: true,
      scale: 1,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    return { pdf: Buffer.from(pdf), issues };
  } finally {
    await browser.close();
  }
}
