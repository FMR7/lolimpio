# LOLIMPIO

LOLIMPIO is an Express website with a SQLite-backed contact form. The server listens on port `3000` and serves static files from `public/`, or from the generated `dist/` directory when a production build exists.

## Requirements

- Node.js 20 or later and npm
- Gmail credentials for sending contact-form notifications

Install dependencies from the project root:

```sh
npm ci
```

Create a `.env` file in the project root:

```dotenv
EMAIL_USER=your-sending-address@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_TO=the-address-that-receives-messages@example.com
```

Use a Gmail app password for `EMAIL_PASS`. Keep `.env` and its values private; `.env` is excluded from Git.

## Development

On a fresh checkout, install dependencies and start the server:

```sh
npm ci
node index.js
```

Open <http://localhost:3000>. The server serves source files from `public/` unless `dist/` exists. To test a production build locally, run `npm run build` and restart the server; it will then serve the built files. Rebuild after editing source assets while `dist/` exists.

The app creates `db.sqlite` in the current working directory on startup. Run the server from the project root so the database is created there.

## Production Deployment

Build on the deployment host or in CI from the project root. The build tools are development dependencies, so include them for the build stage:

```sh
npm ci --include=dev
npm run build
```

The build writes optimized files to `dist/`, preserving the source tree under `public/`. It minifies the HTML and inline JavaScript, removes unused rules from the app stylesheet, and emits only the Font Awesome glyph rules used by this page. Bootstrap remains a minified CDN dependency. Express compresses eligible responses when the client supports gzip.

For a single-server deployment, configure the production `.env`, then remove build-only dependencies and start the app:

```sh
npm prune --omit=dev
node index.js
```

Keep the Node process running with your hosting platform's service manager or process manager. The app listens on `0.0.0.0:3000`; expose it through a TLS-enabled reverse proxy or your hosting provider's web service configuration.

Persist and back up `db.sqlite` across deployments. Do not place the database on ephemeral storage if contact submissions must be retained. Deploy the `.env` values through the host's secret/environment-variable configuration rather than committing them.

The production page still requests Bootstrap assets from jsDelivr and Font Awesome font files from cdnjs, so the browser needs access to those CDNs.

## Available Commands

- `npm run build` creates or refreshes the optimized `dist/` output.
- `npm start` builds the output and starts the Express server. It requires the development build dependencies to be installed.
- `node index.js` starts the server without building; it serves `dist/` if present and otherwise serves `public/`.

There is currently no automated test suite configured in `package.json`.