// DNS patch: redirect vercel.com to api.vercel.com's IP (76.76.21.112)
// because vercel.com's actual IP (128.14.67.148) is blocked by GFW TLS filter.
const dns = require("dns");
const origLookup = dns.lookup;

function normalized(hostname, options, callback) {
  // Normalize arguments: dns.lookup(hostname, cb) or dns.lookup(hostname, opts, cb)
  if (typeof options === "function") {
    callback = options;
    options = undefined;
  }
  if (hostname === "vercel.com") {
    return origLookup("76.76.21.112", options || { family: 4 }, callback);
  }
  return origLookup(hostname, options, callback);
}

dns.lookup = normalized;
// Also patch resolve4/resolve as they might be used
const origResolve4 = dns.resolve4;
dns.resolve4 = function (hostname, options, callback) {
  if (typeof options === "function") { callback = options; options = undefined; }
  if (hostname === "vercel.com") return origResolve4("76.76.21.112", options, callback);
  return origResolve4(hostname, options, callback);
};
