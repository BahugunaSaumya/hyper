// server.js
import express from "express";
import history from "connect-history-api-fallback";
import serveStatic from "serve-static";
const app = express();
app.use(history({ // handles /cart, /checkout, /product-details?... -> /index.html
  verbose: false,
  rewrites: [{ from: /\/assets\/.*/, to: ctx => ctx.parsedUrl.path }] // don't rewrite assets
}));
app.use(serveStatic("public", { index: ["index.html"] })); // your web root
app.listen(5173, () => console.log("SPA server at http://localhost:5173"));
