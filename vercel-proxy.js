// Local proxy for Vercel OAuth device flow.
// User opens http://localhost:8899/oauth/device?user_code=XXXX
// which proxies to vercel.com via the unblocked IP.
const http = require("http");
const https = require("https");
const dns = require("dns");

// DNS patch for vercel.com
const origLookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
  if (typeof options === "function") { callback = options; options = undefined; }
  if (hostname === "vercel.com") {
    return origLookup("76.76.21.112", options || { family: 4 }, callback);
  }
  return origLookup(hostname, options, callback);
};

const PORT = 8899;

const server = http.createServer((clientReq, clientRes) => {
  const options = {
    hostname: "vercel.com",
    port: 443,
    path: clientReq.url,
    method: clientReq.method,
    headers: {
      ...clientReq.headers,
      host: "vercel.com",
    },
  };

  delete options.headers["proxy-connection"];

  console.log(`→ ${clientReq.method} ${clientReq.url}`);

  const proxyReq = https.request(options, (proxyRes) => {
    // Pass through CORS-relevant headers to allow localhost
    const headers = { ...proxyRes.headers };
    // Allow iframe/redirect from localhost
    if (headers["location"]) {
      headers["location"] = headers["location"].replace(
        "https://vercel.com",
        `http://localhost:${PORT}`
      );
    }
    clientRes.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(clientRes);
  });

  proxyReq.on("error", (err) => {
    console.error("Proxy error:", err.message);
    clientRes.writeHead(502);
    clientRes.end("Proxy error: " + err.message);
  });

  clientReq.pipe(proxyReq);
});

server.listen(PORT, () => {
  console.log(`Vercel proxy running at http://localhost:${PORT}`);
  console.log("Open in browser: http://localhost:" + PORT + "/");
  console.log("Press Ctrl+C to stop");
});
