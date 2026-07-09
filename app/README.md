# React + TypeScript + Vite

## Image Candidate Sources

The Review screen can search modern image candidates from Pexels and Pixabay.
Paste keys directly into the in-app Image Sources panel, or build with:

```sh
VITE_PEXELS_API_KEY=... VITE_PIXABAY_API_KEY=... npm run build -- --base=/toddler-language-atlas/
```

Approved replacements are stored in the exported review manifest. To make them
durable bundled assets, run:

```sh
npm run apply-asset-review -- path/to/manifest.json
```

## Shared Database Sync

The app can sync learner progress, active assets, review approvals, and image
source settings through Supabase. Run `supabase/app_state.sql` in a Supabase SQL
editor, then either paste the URL/key into the in-app Database Sync panel or
build with:

```sh
VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... VITE_SUPABASE_NAMESPACE=default npm run build -- --base=/toddler-language-atlas/
```

The schema uses public read/write policies because this private prototype does
not have user auth yet.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
