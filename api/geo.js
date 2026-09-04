// Vercel / Edge API endpoint for IP Geolocation Country Detection
export default function handler(req, res) {
  // Read Vercel IP country header, Cloudflare header, or fallback headers
  const countryHeader =
    req.headers['x-vercel-ip-country'] ||
    req.headers['cf-ipcountry'] ||
    req.headers['x-country-code'] ||
    '';

  const country = String(countryHeader).toUpperCase().trim();

  // Set Cache-Control header to keep response fast
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('Content-Type', 'application/json');

  return res.status(200).json({
    country: country || null,
    ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null
  });
}
