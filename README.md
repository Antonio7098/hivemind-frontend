# Hivemind Frontend

React + TypeScript + Vite UI for the local Hivemind API.

## Development

```bash
npm install
npm run dev
```

By default the app targets `http://127.0.0.1:8787`. Override that with:

```bash
VITE_HIVEMIND_API_BASE_URL=http://127.0.0.1:8787 npm run dev
```

## Chat UI notes

- The Chat page supports persisted sessions, live SSE updates, reconnect, and cursor-based resync.
- Actor ID and access token are configured in the Chat page and persisted in local browser storage.
- Browser SSE connections send `actor` and `access_token` as query parameters because `EventSource` cannot attach custom auth headers.
- When the backend is started with `hivemind serve --chat-api-token <token>`, enter that token in the Chat page before opening protected sessions.

## Validation

```bash
npm run lint
npm run build
```

