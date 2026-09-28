# Whispering Vine menus

`menu.json` is the Fourth Street menu source. `menu.pdf` is generated from that JSON using the same fixed React document, CSS, local fonts, and layout helper as the Fourth Street admin editor. Text uses five embedded TrueType faces; borders, icons, QR codes, and dot leaders are vectors. No remote website, older PDF, text masks, or network fonts participate in generation.

## Generate and verify

Requires Node 22.17+. Run `npm ci`, `npm run generate`, then `npm test`. On macOS the renderer uses installed Google Chrome. Set `CHROME_EXECUTABLE_PATH` to override; Linux uses the pinned packaged Chromium. `npm run generate -- --html` also writes a self-contained inspection page.

Pushes to `main`, manual runs, and the Sunday schedule generate and validate six letter pages, commit `menu.pdf`, then publish the exact validated JSON/PDF/assets to GitHub Pages at https://menu.wvwine.co. Overflow fails the build. Pull requests generate and validate without publishing. A generation failure cannot deploy a mismatched JSON/PDF pair. There is one publishing workflow; the old Webflow scraper and independent deploy jobs have been replaced.

## Editing and design

Edit menu content/flags/order in `menu.json` or save from the Fourth Street admin. The current storage categories and Toast metadata remain intact; food `print_section` determines print placement. `featured` controls the premium flight and cocktail; `featured_offer` identifies the burger-and-bottle offer with its own bottle/price rows. Legacy special-flight `hidden: true` means shown.

The shared source files under `src/` and `public/fourth-street-menu/` are synchronized from vine-admin using `scripts/sync-fourth-street-publisher.mjs` there. Change design in the admin source and sync it here to avoid editor/export drift. The PDF reference is v11.15, with the subsequent approved badge alignment and typography polish.

South Creek JSON, spirits data, and existing static menu assets retain their existing URLs. The main website reads this repository's published `menu.json` and links `menu.pdf`.
