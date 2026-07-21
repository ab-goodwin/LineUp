import express, { type Express } from "express";
import path from "path";
import fs from "fs";

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");
  const indexPath = path.resolve(distPath, "index.html");

  if (!fs.existsSync(indexPath)) {
    console.error("Static index.html not found at:", indexPath);
  }

  app.use((req, res, next) => {
    if (
      req.path === "/" ||
      req.path === "/index.html" ||
      req.path === "/sw.js" ||
      req.path === "/manifest.json"
    ) {
      res.setHeader(
        "Cache-Control",
        "no-cache, no-store, must-revalidate",
      );
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }

    next();
  });

  app.use(
    express.static(distPath, {
      setHeaders(res, filePath) {
        const fileName = path.basename(filePath);

        if (
          fileName === "index.html" ||
          fileName === "sw.js" ||
          fileName === "manifest.json"
        ) {
          res.setHeader(
            "Cache-Control",
            "no-cache, no-store, must-revalidate",
          );
          return;
        }

        // Vite-generated assets use hashed filenames and can be cached safely.
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader(
            "Cache-Control",
            "public, max-age=31536000, immutable",
          );
        }
      },
    }),
  );

  app.use((req, res, next) => {
    if (req.method !== "GET") {
      return next();
    }

    res.setHeader(
      "Cache-Control",
      "no-cache, no-store, must-revalidate",
    );

    res.sendFile(indexPath);
  });
}