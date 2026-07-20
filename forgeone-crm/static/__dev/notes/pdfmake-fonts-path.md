# pdfmake Font Path in Floot Backend

In Floot's serverless backend, Node.js built-in modules (`path`, `fs`, `require`) are NOT accessible at import/require time. The bundler strips them.

## Working Approach: CDN-based font loading

Fetch Roboto fonts from jsdelivr CDN at runtime and pass Buffer objects to PdfPrinter:

```ts
const FONT_URLS = {
  normal: "https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-400-normal.woff",
  bold: "https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-500-normal.woff",
  italics: "https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-400-italic.woff",
  bolditalics: "https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.0.8/files/roboto-latin-500-italic.woff",
};
```

Cache the buffers so they're only fetched once per Lambda cold start. Pass them to PdfPrinter as Buffer objects (not file paths).

## What Does NOT Work

- `import path from "path"` → Module not found (bundler strips it)
- `globalThis.require("path")` → not a function
- `eval("require")("path")` → Module not found
- `/var/task/fonts/Roboto-*.ttf` → files don't exist at that path
- `/var/task/node_modules/pdfmake/fonts/` → files may not exist in sandbox

## Key Rule

Never use filesystem-based font loading in Floot serverless. Always use CDN + Buffer approach.