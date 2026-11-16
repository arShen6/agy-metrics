# Contributing

Compatibility fixes, translations and installation improvements are welcome. Keep pull requests focused and describe the problem, resulting behavior, validation, and tested app/OS versions.

- Run `npm test`. For UI changes, also use `npm run demo` and provide evidence from the actual client.
- Never commit conversation databases, message text, account identifiers, credentials or private local paths.
- Label streaming and end-to-end speeds separately. Preserve unknown values; do not estimate tokens from text length.
- Keep upgrades, uninstall and failure rollback working. Installation changes must preserve the user's active tasks.
- For another client, open an issue first to discuss an independent adapter. Include verifiable data sources, timing definitions, conversation isolation and actual client screenshots. Fixture tests alone do not establish support.
