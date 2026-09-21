import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getDb() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

export async function getMediaBucket() {
  const { env } = await getCloudflareContext({ async: true });
  return env.MEDIA;
}
