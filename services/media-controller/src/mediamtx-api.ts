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
  if (!response.ok) throw new Error(`MEDIAMTX_${method}_${response.status}`);
  return response;
}

export async function listConfiguredPaths() {
  const response = await request("GET", "/v3/config/paths/list?itemsPerPage=1000");
  const payload = await response.json() as { items?: Array<{ name: string }> };
  return new Set((payload.items ?? []).map((item) => item.name));
}

export async function addPath(name: string, config: Record<string, unknown>) {
  await request("POST", `/v3/config/paths/add/${encodedPath(name)}`, config);
}

export async function replacePath(name: string, config: Record<string, unknown>) {
  await request("POST", `/v3/config/paths/replace/${encodedPath(name)}`, config);
}

export async function deletePath(name: string) {
  await request("DELETE", `/v3/config/paths/delete/${encodedPath(name)}`);
}
