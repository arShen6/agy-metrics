# Compatibility and provenance

This is an independent implementation inspired by the metrics display in
[Anarcadia/chuanban-antigravity-theme-patch](https://github.com/Anarcadia/chuanban-antigravity-theme-patch),
reference commit `6a263b50cb575b22059f4429a9ba9625c0c540df` (inspected 2026-11-16).
That snapshot did not include a LICENSE file. No upstream runtime, theme,
daemon, installer, fonts, images, or translation dictionaries are included.
The MIT license applies to this repository's original implementation.

## Observed Antigravity 2.32.1 storage format

The SQLite database is opened read-only, with query-only mode. Only the
`gen_metadata(idx, data)` table is queried; chat message bodies are not queried.
The protobuf field mappings below are compatibility observations, not a public
or stable Google API.

| Field path | Meaning |
| --- | --- |
| 1 → 4 → 2 | Uncached input tokens |
| 1 → 4 → 3 | Output tokens |
| 1 → 4 → 5 | Cached input tokens |
| 1 → 4 → 9 | Thinking tokens |
| 1 → 4 → 10 | Response/tool tokens |
| 1 → 9 → 10 → 4 | Reported context capacity |
| 1 → 11 | Wait/first-token Duration (1 = seconds, 2 = nanoseconds) |
| 1 → 12 | Stream Duration (1 = seconds, 2 = nanoseconds) |

Missing durations are unknown, not zero. Unknown uint64 fields are tolerated
without coercing them into unsafe JavaScript numbers. Invalid blobs are skipped
and reported. Context usage equals uncached input plus cached input for the
latest valid generation. The capacity comes from that generation, unless
explicitly overridden. No capacity means no percentage is invented.

Streaming throughput equals output tokens divided by the stream duration.
Very short flushes or implausible rates use output divided by total wait +
stream duration instead, labeled Hold/end-to-end. This is a heuristic: the
tooltip exposes the selected definition. It is not a network speed meter or
per-token wall-clock instrument. Persisted data may arrive after generation.
From v0.2.1 the strip and tooltip share one decimal place for the selected speed.
The tooltip repeats that value, separately labels the end-to-end rate, and shows
wait + output = total duration. k/M counters in the strip remain compact versions
of the exact integer counters in the tooltip.

The reader uses a bounded eight-conversation cache keyed by database and WAL
inode, size, mtime and ctime. A changed database is read in one SQLite read
transaction. It recomputes all generation metadata for correctness under
tail rewrites and edits; this is O(N) on change, not an O(1) promise.

## UI integration

CDP discovery uses loopback only. WebSocket URLs must match the discovered
port and exact loopback host. Only page targets are considered; a composer
element `antigravity.agentSidePanelInputBox` must be present before injection.
The current conversation is derived from `/c/<uuid>`, `cascadeId` query, or a
selected sidebar conversation outside the home route.

A Shadow DOM component scopes styling. There are no theme replacements,
history-method monkey patches, message edits, network interception, app-bundle
writes or outbound metric uploads. The optional macOS installer registers a
user-owned LaunchAgent for automatic startup. Graceful shutdown removes
the widget and the page-load injection script. After a forced process kill,
reload the application window to clear any remaining runtime widget.

v0.1 supports local conversation DBs. Remote sessions need an explicitly
mounted directory; automatic WSL/SSH discovery and child-agent aggregation are
not included. The protocol and selectors can change in future app versions.
