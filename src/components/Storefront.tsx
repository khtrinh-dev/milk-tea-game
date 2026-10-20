import type { ShopTheme } from '../game/types';

// Mặt tiền quán mì cay vẽ bằng SVG: mái hiên sọc theo tông màu quán + biển hiệu mang tên quán.
// Màu lấy từ biến CSS --theme-* nên đổi data-theme là đổi màu.
export function Storefront({ name, theme }: { name: string; theme: ShopTheme }) {
  const stripes = Array.from({ length: 9 }, (_, i) => i);
  return (
    <div className="storefront" data-theme={theme}>
      <svg viewBox="0 0 300 210" role="img" aria-label={`Mặt tiền quán ${name}`}>
        {/* tường */}
        <rect x="20" y="40" width="260" height="165" rx="6" fill="var(--theme-wall)" stroke="var(--outline)" strokeWidth="4" />
        {/* biển hiệu */}
        <rect x="40" y="10" width="220" height="44" rx="12" fill="var(--theme-dark)" stroke="var(--outline)" strokeWidth="4" />
        <text x="150" y="40" textAnchor="middle" className="storefront-name">
          {name || 'Tên quán'}
        </text>
        {/* mái hiên sọc */}
        <g>
          {stripes.map((i) => (
            <path
              key={i}
              d={`M${24 + i * 28.4} 62 h28.4 v26 a14.2 14.2 0 0 1 -28.4 0 z`}
              fill={i % 2 ? 'var(--theme-light)' : 'var(--theme-main)'}
              stroke="var(--outline)"
              strokeWidth="3"
            />
          ))}
        </g>
        {/* cửa kính */}
        <rect x="40" y="112" width="70" height="93" rx="6" fill="#bfe6f2" stroke="var(--outline)" strokeWidth="4" />
        <rect x="48" y="122" width="54" height="16" rx="4" fill="#fff" stroke="var(--outline)" strokeWidth="2.5" />
        <text x="75" y="134" textAnchor="middle" className="storefront-open">OPEN</text>
        <circle cx="100" cy="165" r="4" fill="var(--outline)" />
        {/* cửa sổ với hai tô mì cay bốc khói */}
        <rect x="130" y="112" width="130" height="64" rx="6" fill="#fdecea" stroke="var(--outline)" strokeWidth="4" />
        {[165, 225].map((cx) => (
          <g key={cx}>
            <path d={`M${cx - 6} 132 q-3 -4 0 -8 t0 -8 M${cx + 6} 132 q-3 -4 0 -8 t0 -8`} stroke="#9e9e9e" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d={`M${cx - 22} 146 Q${cx - 20} 170 ${cx} 171 Q${cx + 20} 170 ${cx + 22} 146 Z`} fill="#1d1d1d" stroke="var(--outline)" strokeWidth="2.5" />
            <path d={`M${cx - 19} 156 Q${cx} 162 ${cx + 19} 156`} stroke="#e53935" strokeWidth="2.5" fill="none" />
            <ellipse cx={cx} cy={146} rx={22} ry={6} fill="#c8261c" stroke="var(--outline)" strokeWidth="2.5" />
            <path d={`M${cx - 14} 145 q3.5 -3 7 0 t7 0 t7 0 t7 0`} stroke="#f3c64f" strokeWidth="2" fill="none" />
          </g>
        ))}
        {/* dây ớt treo */}
        <path d="M268 60 L268 108" stroke="var(--outline)" strokeWidth="2" />
        {[72, 86, 100].map((y) => (
          <path key={y} d={`M268 ${y} q8 2 6 12 q-6 -2 -6 -12 z`} fill="#e53935" stroke="var(--outline)" strokeWidth="1.5" />
        ))}
        {/* bậu cửa sổ + chậu cây */}
        <rect x="126" y="176" width="138" height="8" rx="3" fill="var(--theme-dark)" stroke="var(--outline)" strokeWidth="3" />
        <path d="M232 205 l4 -18 h20 l4 18 z" fill="#d9774a" stroke="var(--outline)" strokeWidth="3" />
        <circle cx="240" cy="182" r="9" fill="#6fb35a" stroke="var(--outline)" strokeWidth="3" />
        <circle cx="252" cy="178" r="10" fill="#7cc466" stroke="var(--outline)" strokeWidth="3" />
      </svg>
    </div>
  );
}
