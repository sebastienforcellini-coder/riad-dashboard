export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "No URL" });
  try {
    const response = await fetch(decodeURIComponent(url), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; calendar-sync/1.0)" }
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const text = await response.text();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.status(200).send(text);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
