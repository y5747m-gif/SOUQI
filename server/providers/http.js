export async function requestJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 15_000);
  try {
    const response = await fetch(url, {...options, signal: controller.signal, headers: {'content-type': 'application/json', ...(options.headers || {})}});
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = {message: text}; }
    if (!response.ok) {
      const error = new Error(data.message || data.detail || `Gateway HTTP ${response.status}`);
      error.status = response.status; error.gatewayResponse = data;
      throw error;
    }
    return data;
  } finally { clearTimeout(timeout); }
}
