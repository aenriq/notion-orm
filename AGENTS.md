# Typing Philosophy (Non-Negotiable)

- Derive types from canonical surrounding contracts whenever possible (Notion SDK types, existing config maps, and local type registries).
- Do not hardcode string unions for domain keys when a source-of-truth map/type already exists.
- Prefer enforcement maps with `satisfies Record<...>` so adding a new property forces an explicit decision for every behavior surface.
- Never use `as` to bypass type mismatches in core logic. Fix the type relationship or add a narrow runtime guard.
- `null`/`undefined` are valid in strong typing when they are part of a discriminated union or schema contract.
- Avoid isolated `unknown` usage (e.g. `object: unknown`) when an existing local or upstream type can be bridged in.
- If `unknown` appears at an API boundary, narrow it immediately and convert to contract-linked types; do not propagate it through core logic.
- Be proactive about building bridges across the type system instead of introducing disconnected placeholder types.
- Registry patterns should be exhaustive and type-linked to source unions so new properties cause compile-time failures until handled.
