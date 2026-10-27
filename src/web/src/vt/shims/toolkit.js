// @reduxjs/toolkit stand-in: the vendored components only use nanoid (menu divider keys).
let n = 0;
export const nanoid = () => `vt${(n += 1).toString(36)}${Math.random().toString(36).slice(2, 8)}`;
