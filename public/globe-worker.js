self.onmessage = async () => {
  try {
    const response = await fetch("/globe-dots.json");
    const raw = await response.json(); // [[lng, lat], ...]
    const dots = raw.map(([lng, lat]) => ({ lng, lat }));
    self.postMessage({ dots });
  } catch (e) {
    self.postMessage({ error: String(e) });
  }
};
