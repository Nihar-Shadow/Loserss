import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import yahooFinance from "yahoo-finance2";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    {
      name: 'yahoo-finance-proxy',
      configureServer(server: any) {
        server.middlewares.use(async (req: any, res: any, next: any) => {
          if (req.url?.startsWith('/api/search/')) {
            try {
              const m = await import('yahoo-finance2');
              const yf = new m.default();
              const urlParts = req.url.split('?')[0].split('/');
              const query = decodeURIComponent(urlParts.pop() || "");
              if (!query) { res.statusCode = 400; return res.end("No query"); }

              const searchRes = await yf.search(query) as any;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(searchRes.quotes));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }

          if (req.url?.startsWith('/api/stock/')) {
            try {
              const m = await import('yahoo-finance2');
              const yf = new m.default();
              const urlParts = req.url.split('?')[0].split('/');
              const symbol = urlParts.pop();
              if (!symbol) { res.statusCode = 400; return res.end("No symbol"); }

              const quote = await yf.quote(symbol);
              const historyData = await yf.chart(symbol, {
                period1: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                interval: "1d"
              });
              const history = historyData.quotes;

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ quote, history }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }
          next();
        });
      }
    }
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
