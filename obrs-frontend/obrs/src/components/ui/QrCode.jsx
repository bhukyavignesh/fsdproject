import { seededRandom } from '../../utils/random';

/** Visual QR placeholder derived from the PNR. Swap for `qrcode.react` in production. */
export default function QrCode({ value, size = 132 }) {
  const n = 25;
  const rand = seededRandom(value);
  const cell = size / n;
  const isFinder = (x, y) => [[0, 0], [n - 7, 0], [0, n - 7]].some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
  const finder = (fx, fy) => (
    <g key={`${fx}-${fy}`}>
      <rect x={fx * cell} y={fy * cell} width={7 * cell} height={7 * cell} fill="#0f172a" />
      <rect x={(fx + 1) * cell} y={(fy + 1) * cell} width={5 * cell} height={5 * cell} fill="#fff" />
      <rect x={(fx + 2) * cell} y={(fy + 2) * cell} width={3 * cell} height={3 * cell} fill="#0f172a" />
    </g>
  );
  const cells = [];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!isFinder(x, y) && rand() > 0.52) cells.push(<rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill="#0f172a" />);
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`QR code for ticket ${value}`} className="rounded-lg bg-white">
      {cells}
      {finder(0, 0)}{finder(n - 7, 0)}{finder(0, n - 7)}
    </svg>
  );
}
