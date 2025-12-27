import express from "express";
import Product from "../models/product.model.js";
import { redis } from "../lib/redis.js";

const router = express.Router();

router.get("/sitemap.xml", async (req, res) => {
  try {
    const cacheKey = "sitemap:xml";
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.header("Content-Type", "application/xml");
      return res.send(cached);
    }

    const products = await Product.find({}).select("_id updatedAt").lean();
    const baseUrl = process.env.CLIENT_URL || `http://localhost:${process.env.PORT || 5173}`;

    const urls = [];
    urls.push({ loc: baseUrl + "/", priority: 1.0 });
    urls.push({ loc: baseUrl + "/signup", priority: 0.5 });
    urls.push({ loc: baseUrl + "/login", priority: 0.5 });

    products.forEach((p) => {
      urls.push({ loc: `${baseUrl}/product/${p._id}`, lastmod: p.updatedAt.toISOString(), priority: 0.8 });
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}\n    <priority>${u.priority}</priority>\n  </url>`)
      .join("\n")}\n</urlset>`;

    await redis.set(cacheKey, xml, "EX", 60 * 10);
    res.header("Content-Type", "application/xml");
    res.send(xml);
  } catch (e) {
    console.log("Failed to build sitemap", e);
    res.status(500).send("<?xml version=\"1.0\"?><urlset></urlset>");
  }
});

router.get("/robots.txt", (req, res) => {
  const baseUrl = process.env.CLIENT_URL || `http://localhost:${process.env.PORT || 5173}`;
  const lines = [
    "User-agent: *",
    "Allow: /",
    `Sitemap: ${baseUrl}/sitemap.xml`,
  ];
  res.type("text/plain");
  res.send(lines.join("\n"));
});

export default router;
