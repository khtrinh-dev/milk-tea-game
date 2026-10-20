import { useState, type FormEvent } from 'react';
import { DEFAULT_SHOP_NAME, SHOP_NAME_MAX, STARTING_MONEY } from '../game/constants';
import { SHOP_NAME_SUGGESTIONS, SHOP_THEMES } from '../game/data/shop';
import { formatVND } from '../game/money';
import type { ShopInfo, ShopTheme } from '../game/types';
import { playSound } from '../hooks/sound';
import { Storefront } from './Storefront';

interface Props {
  ownerName: string | null;
  onCreate: (shop: ShopInfo) => void;
}

export function CreateShopScreen({ ownerName, onCreate }: Props) {
  const [name, setName] = useState(DEFAULT_SHOP_NAME);
  const [theme, setTheme] = useState<ShopTheme>('fire');
  const trimmed = name.trim();

  const randomName = () => {
    const others = SHOP_NAME_SUGGESTIONS.filter((n) => n !== name);
    setName(others[Math.floor(Math.random() * others.length)]);
    playSound('tap');
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!trimmed) return;
    playSound('unlock');
    onCreate({ name: trimmed, theme });
  };

  return (
    <div className="app screen create-screen" data-theme={theme}>
      <form className="create-card panel" onSubmit={submit}>
        <h1 className="ribbon">Mở quán đầu tiên</h1>
        <p className="create-hello">
          {ownerName ? (
            <>
              Chào chủ quán <b>{ownerName}</b>!{' '}
            </>
          ) : null}
          Bạn có <b>{formatVND(STARTING_MONEY)}</b> vốn khởi nghiệp. Đặt tên và chọn phong cách cho quán nhé!
        </p>

        <Storefront name={trimmed} theme={theme} />

        <label className="field-label" htmlFor="shop-name">
          Tên quán
        </label>
        <div className="name-row">
          <input
            id="shop-name"
            className="text-input"
            value={name}
            maxLength={SHOP_NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            enterKeyHint="done"
          />
          <button type="button" className="btn round" onClick={randomName} aria-label="Gợi ý tên quán">
            🎲
          </button>
        </div>

        <span className="field-label">Phong cách</span>
        <div className="theme-picker" role="radiogroup" aria-label="Phong cách quán">
          {SHOP_THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={theme === t.id}
              className={`theme-swatch ${theme === t.id ? 'active' : ''}`}
              data-theme={t.id}
              onClick={() => {
                setTheme(t.id);
                playSound('tap');
              }}
            >
              <span className="swatch-color" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <button type="submit" className="btn primary wide big" disabled={!trimmed}>
          🎉 Khai trương!
        </button>
      </form>
    </div>
  );
}
