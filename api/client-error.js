export default function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed" });
  const message = String(request.body?.message || "Unknown client error").slice(0, 500);
  const stack = String(request.body?.stack || "").slice(0, 3000);
  const path = String(request.body?.path || "/").slice(0, 200);
  console.error("[client-render-error]", { message, stack, path });
  return response.status(204).end();
}
