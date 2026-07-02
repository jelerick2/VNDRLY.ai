import pg from "pg";

export async function hasListenNotifySupport(
  url: string | undefined = process.env.LISTEN_NOTIFY_DATABASE_URL ??
    process.env.DATABASE_URL,
): Promise<boolean> {
  if (!url) return false;
  if (url.includes("test:test@localhost")) return false;

  const channel = `vndrly_probe_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const listener = new pg.Client({ connectionString: url });
  const publisher = new pg.Client({ connectionString: url });
  try {
    await listener.connect();
    await publisher.connect();
    const seen = new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 2_000);
      listener.on("notification", (msg) => {
        if (msg.channel === channel && msg.payload === "ok") {
          clearTimeout(timer);
          resolve(true);
        }
      });
    });
    await listener.query(`LISTEN ${channel}`);
    await publisher.query(`NOTIFY ${channel}, 'ok'`);
    return await seen;
  } catch {
    return false;
  } finally {
    await listener.end().catch(() => undefined);
    await publisher.end().catch(() => undefined);
  }
}
