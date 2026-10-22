import { getSponsorLogQueuePrefix } from "@/lib/services/sponsor-local-metrics";

const LOG_BATCH_SIZE = 100;

function readQueue(storage, key) {
  try {
    const value = JSON.parse(storage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function groupByDisplaySession(logs) {
  return logs.reduce((groups, log) => {
    const key = [
      log.displaySessionId || "",
      log.displayToken || "",
      log.displayClientId || "",
    ].join(":");
    const group = groups.get(key) || [];
    group.push(log);
    groups.set(key, group);
    return groups;
  }, new Map());
}

async function submitBatch(request, batch) {
  const response = await request("/api/anunciantes/logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ logs: batch }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || Number(payload.processed) < 1) {
    throw new Error(payload.error || "O banco não confirmou a última exibição");
  }
}

// Used before revoking an official display session. Each queue can contain
// entries from older sessions, so submit credentials in separate batches.
export async function flushPendingSponsorLogs({
  storage,
  churchId,
  request = fetch,
}) {
  if (!storage || !churchId) return 0;

  const prefix = getSponsorLogQueuePrefix(churchId);
  const keys = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(prefix)) keys.push(key);
  }

  let confirmed = 0;
  for (const key of keys) {
    const groups = groupByDisplaySession(readQueue(storage, key));
    const groupedLogs = [...groups.values()];

    for (let groupIndex = 0; groupIndex < groupedLogs.length; groupIndex += 1) {
      const group = groupedLogs[groupIndex];
      let groupPending = group;
      try {
        while (groupPending.length) {
          const batch = groupPending.slice(0, LOG_BATCH_SIZE);
          await submitBatch(request, batch);
          confirmed += batch.length;
          groupPending = groupPending.slice(batch.length);
        }
      } catch (error) {
        // Preserve the failed batch and every group that has not yet been
        // attempted. Confirmed groups are deliberately removed.
        const remaining = [
          ...groupPending,
          ...groupedLogs.slice(groupIndex + 1).flat(),
        ];
        storage.setItem(key, JSON.stringify(remaining));
        throw error;
      }
    }

    storage.removeItem(key);
  }

  return confirmed;
}
