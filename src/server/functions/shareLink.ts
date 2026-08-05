import { createServerFn } from "@tanstack/react-start";

/**
 * Server-persisted share links are a stretch goal. In this build, sharing
 * encodes the diagram snapshot into the URL client-side, so this endpoint is
 * kept as a stub for a future persistence layer (TTL records mirroring
 * DrawSQL's "expire after 30 days of inactivity" behavior).
 */
export const createShareLink = createServerFn({ method: "POST" })
  .validator((diagramId: string) => diagramId)
  .handler(async ({ data }) => {
    return {
      id: `stub_${data}`,
      ttlDays: 30,
      note: "Server-persisted share records are not yet wired up.",
    };
  });
