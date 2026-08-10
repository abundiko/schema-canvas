import { createServerFn } from "@tanstack/react-start";
import { useStorage } from "nitro/storage";

import type { Diagram } from "#/types/diagram";

const SHARE_ID_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function createShareId(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let id = "";
  for (const b of bytes) id += SHARE_ID_ALPHABET[b % SHARE_ID_ALPHABET.length];
  return id;
}

export const createShareLink = createServerFn({ method: "POST" })
  .validator((diagram: Diagram) => diagram)
  .handler(async ({ data }) => {
    const id = createShareId();
    await useStorage("share").setItem(id, data);
    return { id };
  });

export const getShareLink = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data }) => {
    return await useStorage<Diagram>("share").getItem(data);
  });
