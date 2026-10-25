// tiny classnames helper (avoids an extra dep)
export function clsxLite(...parts) {
  return parts
    .flat(Infinity)
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
