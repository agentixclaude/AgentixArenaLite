import { ICONS } from '../lib/icons';

export default function Icon({ name, size = 18, color = 'currentColor', weight = 2 }: { name: string; size?: number; color?: string; weight?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name] ?? ICONS.star} />
    </svg>
  );
}
