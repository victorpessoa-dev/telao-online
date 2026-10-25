const MIN_DURATION_SECONDS = 3;
const DEFAULT_SCHEDULE_SEED = "telao-online";
// A schedule can stay active for days. Resolving cycle N recursively from
// cycle zero eventually exhausts the JavaScript call stack on a public screen.
const MAX_CYCLE_HISTORY = 10_000;

function hash(value) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function seededRandom(seed) {
  let state = hash(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hasSameOrder(left, right) {
  return (
    left.length === right.length &&
    left.every((item, index) => item.id === right[index]?.id)
  );
}

function rotateToDifferentOrder(order, disallowedFirstIds) {
  for (let offset = 1; offset < order.length; offset += 1) {
    const candidate = [...order.slice(offset), ...order.slice(0, offset)];
    if (!disallowedFirstIds.has(candidate[0]?.id)) return candidate;
  }
  return order;
}

/** Resolves the playable duration while enforcing the product minimum. */
export function getScheduledDuration(ad) {
  return Math.max(MIN_DURATION_SECONDS, Number(ad?.duration) || 10);
}

/**
 * Produces a deterministic sponsor order for a schedule cycle.
 * Adjacent cycles avoid repeating the previous end item as the next first item.
 */
export function getCycleOrder(ads, seed, cycleNumber) {
  const canonical = [...ads].sort((left, right) =>
    String(left.id).localeCompare(String(right.id)),
  );
  if (canonical.length < 2) return canonical;

  const normalizedCycle = Math.max(0, Math.floor(Number(cycleNumber) || 0));
  // The boundary rule only depends on the preceding order. Calculate a
  // bounded history iteratively, rather than recursively walking back to the
  // first event cycle. The bounded fallback remains deterministic for every
  // display while keeping long-running events responsive.
  const firstCycle = Math.max(0, normalizedCycle - MAX_CYCLE_HISTORY);
  let previousOrder = null;
  let result = canonical;

  for (let currentCycle = firstCycle; currentCycle <= normalizedCycle; currentCycle += 1) {
    let ordered = [...canonical];
    const random = seededRandom(`${seed}:${currentCycle}`);
    for (let index = ordered.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [ordered[index], ordered[swapIndex]] = [
        ordered[swapIndex],
        ordered[index],
      ];
    }

    if (previousOrder) {
      // Compare against the actual prior cycle, including its own boundary
      // adjustment. This makes the result deterministic on every screen and
      // prevents both an adjacent duplicate and a repeated full sequence.
      const previousFirst = previousOrder[0]?.id;
      const previousLast = previousOrder.at(-1)?.id;
      const disallowedFirstIds = new Set(
        [previousFirst, previousLast].filter(Boolean),
      );
      if (disallowedFirstIds.has(ordered[0]?.id)) {
        const replacementIndex = ordered.findIndex(
          (ad) => !disallowedFirstIds.has(ad.id),
        );
        if (replacementIndex > 0) {
          [ordered[0], ordered[replacementIndex]] = [
            ordered[replacementIndex],
            ordered[0],
          ];
        }
      }

      if (ordered.length > 2 && hasSameOrder(ordered, previousOrder)) {
        ordered = rotateToDifferentOrder(ordered, disallowedFirstIds);
      }
    }

    previousOrder = ordered;
    result = ordered;
  }

  return result;
}

/** Calculates the sponsor and elapsed offset that should be playing right now. */
export function getSchedulePosition(ads, schedule, now = Date.now()) {
  if (!ads.length) return { cycle: 0, index: 0, offsetSeconds: 0, order: [] };
  const cycleDuration = ads.reduce(
    (total, ad) => total + getScheduledDuration(ad),
    0,
  );
  const startsAt = new Date(schedule?.startsAt || schedule?.starts_at || now).getTime();
  const elapsedSeconds = Math.max(0, (now - startsAt) / 1000);
  const cycle = Math.floor(elapsedSeconds / cycleDuration);
  const cycleOffset = elapsedSeconds - cycle * cycleDuration;
  const order = getCycleOrder(
    ads,
    schedule?.seed || DEFAULT_SCHEDULE_SEED,
    cycle,
  );
  let elapsed = 0;
  const index = order.findIndex((ad) => {
    elapsed += getScheduledDuration(ad);
    return cycleOffset < elapsed;
  });
  return {
    cycle,
    index: index < 0 ? 0 : index,
    offsetSeconds: cycleOffset,
    order,
  };
}

/** Returns a guarded delay until the current sponsor should change. */
export function millisecondsUntilScheduleChange(ads, schedule, now = Date.now()) {
  const position = getSchedulePosition(ads, schedule, now);
  const elapsedBeforeCurrent = position.order
    .slice(0, position.index)
    .reduce((total, ad) => total + getScheduledDuration(ad), 0);
  const currentDuration = getScheduledDuration(position.order[position.index]);
  return Math.max(250, Math.ceil((elapsedBeforeCurrent + currentDuration - position.offsetSeconds) * 1000));
}

/** Expands one deterministic cycle into timestamped entries for the grade view. */
export function getScheduledCycle(ads, schedule, cycleNumber) {
  const order = getCycleOrder(
    ads,
    schedule?.seed || DEFAULT_SCHEDULE_SEED,
    cycleNumber,
  );
  const cycleDurationSeconds = order.reduce(
    (total, ad) => total + getScheduledDuration(ad),
    0,
  );
  const startsAt = new Date(schedule?.startsAt || schedule?.starts_at).getTime();
  const cycleStartsAt = startsAt + cycleNumber * cycleDurationSeconds * 1000;
  let offsetSeconds = 0;
  const entries = order.map((ad, index) => {
    const durationSeconds = getScheduledDuration(ad);
    const startsAt = cycleStartsAt + offsetSeconds * 1000;
    offsetSeconds += durationSeconds;
    return {
      ad,
      position: index,
      durationSeconds,
      startsAt,
      endsAt: cycleStartsAt + offsetSeconds * 1000,
    };
  });
  return {
    cycle: cycleNumber,
    startsAt: cycleStartsAt,
    endsAt: cycleStartsAt + cycleDurationSeconds * 1000,
    durationSeconds: cycleDurationSeconds,
    entries,
  };
}
