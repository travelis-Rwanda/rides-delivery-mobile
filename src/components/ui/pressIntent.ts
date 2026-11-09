export type ScrollActivity = {
  version: number;
  dragging: boolean;
  momentum: boolean;
};

type Point = { pageX: number; pageY: number };

// Match a deliberate tap, even inside a large card where the finger can travel
// a long way without leaving the Pressable's bounds.
export function createPressIntent() {
  let start: Point | null = null;
  let scrollVersion = 0;
  let cancelled = false;

  return {
    start(point: Point, scroll?: ScrollActivity) {
      start = { pageX: point.pageX, pageY: point.pageY };
      scrollVersion = scroll?.version ?? 0;
      cancelled = !!(scroll?.dragging || scroll?.momentum);
    },
    move(point: Point) {
      if (
        start &&
        Math.hypot(point.pageX - start.pageX, point.pageY - start.pageY) > 10
      )
        cancelled = true;
    },
    cancel() {
      cancelled = true;
    },
    canActivate(scroll?: ScrollActivity) {
      return (
        !cancelled &&
        !scroll?.dragging &&
        !scroll?.momentum &&
        (!start || scrollVersion === (scroll?.version ?? 0))
      );
    },
    reset() {
      start = null;
      cancelled = false;
    },
  };
}
