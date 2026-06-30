import express, { type Express } from "express";
import path from "path";
import fs from "fs";

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");
  const indexPath = path.resolve(distPath, "index.html");

  if (!fs.existsSync(indexPath)) {
    console.error("Static index.html not found at:", indexPath);
  }

  app.use(express.static(distPath));

  app.use((req, res, next) => {
    if (req.method !== "GET") {
      return next();
    }

    res.sendFile(indexPath);
  });
}
