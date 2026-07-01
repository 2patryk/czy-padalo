// Forces every request through Angular's SSR server instead of letting
// Vercel's filesystem routing serve the static index.html shell for
// dynamic routes — see https://github.com/angular/angular-cli/issues/30736.
export default async function handler(req, res) {
  const { reqHandler } = await import('../dist/czypadalo/server/server.mjs');
  return reqHandler(req, res);
}
