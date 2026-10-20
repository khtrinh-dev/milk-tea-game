// Hiệu ứng âm thanh tổng hợp bằng Web Audio – không cần file âm thanh.
// iOS chỉ cho phát âm thanh sau thao tác chạm đầu tiên, nên AudioContext
// được tạo/resume trong `unlockAudio()` gọi từ sự kiện pointerdown.

type SoundName = 'order' | 'coin' | 'wrong' | 'pop' | 'unlock' | 'left';

let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(value: boolean) {
  muted = value;
}

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', gain = 0.15) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ctx.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function playSound(name: SoundName) {
  if (muted || !ctx || ctx.state !== 'running') return;
  switch (name) {
    case 'order':
      tone(880, 0, 0.18);
      tone(1320, 0.12, 0.25);
      break;
    case 'coin':
      tone(988, 0, 0.08, 'square', 0.08);
      tone(1319, 0.07, 0.25, 'square', 0.08);
      break;
    case 'wrong':
      tone(220, 0, 0.25, 'sawtooth', 0.08);
      tone(180, 0.15, 0.3, 'sawtooth', 0.08);
      break;
    case 'left':
      tone(400, 0, 0.2, 'triangle');
      tone(300, 0.18, 0.3, 'triangle');
      break;
    case 'pop':
      tone(600 + Math.random() * 200, 0, 0.06, 'triangle', 0.1);
      break;
    case 'unlock':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.3, 'triangle', 0.12));
      break;
  }
}
