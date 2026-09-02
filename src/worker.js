// Tick-Tock-Clock Worker
// 静的アセット（public/）を配信する。/api/* は将来の履歴保存（D1）用に予約。

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init.headers || {}) },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return json({ error: 'not_found' }, { status: 404 });
    }
    return env.ASSETS.fetch(request);
  },
};
