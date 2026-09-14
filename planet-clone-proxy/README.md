# Tiny Planet Soji public proxy

GitHub Pages is static and browser JavaScript cannot reliably set a custom `User-Agent` header. Tiny Planet's public Soji mode therefore uses this tiny serverless proxy.

Visitors supply **their own Soji API key** in the Tiny Planet UI. The browser sends that key only in the request `Authorization` header. The proxy forwards the request to Soji with the established working header set:

```text
Authorization: Bearer <VISITOR_API_KEY>
Content-Type: application/json
User-Agent: starlablood/1.0
```

Upstream:

```text
https://inference.chub.ai/soji/v1/chat/completions
model: soji
```

The proxy does not contain a Soji API key and does not write visitor keys anywhere.

## Vercel deployment

Deploy this `planet-clone-proxy` folder as a Vercel project. After Vercel gives the deployment URL, put that base URL into the `tiny-planet-soji-proxy` meta tag in `planet-clone/index.html`.

Example:

```html
<meta name="tiny-planet-soji-proxy" content="https://YOUR-PROXY.vercel.app" />
```

Then the public GitHub Pages copy offers **Soji API · visitor uses own key**. Users only paste their own Soji key and press Connect; Tiny Planet handles the fixed endpoint, `soji` model, response translation, and the `starlablood/1.0` upstream header.
