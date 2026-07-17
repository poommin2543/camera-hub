const API = process.env.MEDIAMTX_API_URL ?? "http://mediamtx:9997";

function encodedPath(path: string) {
  return encodeURIComponent(path);
}

async function request(method: string, endpoint: string, body?: unknown) {
  const response = await fetch(`${API}${endpoint}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`MEDIAMTX_${response.status}:${detail.slice(0, 200)}`);
  }
  return response;
}

export async function listConfiguredPaths() {
  const response = await request("GET", "/v3/config/paths/list?itemsPerPage=1000");
  const payload = await response.json() as { items?: Array<{ name: string }> };
  return new Set((payload.items ?? []).map((item) => item.name));
}

export async function upsertPath(name: string, config: Record<string, unknown>, existing: Set<string>) {
  const path = encodedPath(name);
  if (existing.has(name)) await request("POST", `/v3/config/paths/replace/${path}`, config);
  else await request("POST", `/v3/config/paths/add/${path}`, config);
}

export async function deletePath(name: string) {
  await request("DELETE", `/v3/config/paths/delete/${encodedPath(name)}`);
}
