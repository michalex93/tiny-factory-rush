import type { SimSnapshot } from './sim.js';

/**
 * Minimal DOM HUD — low text, high legibility for the checkpoint.
 * Not final XR UI.
 */
export class FactoryHud {
  private root: HTMLDivElement;
  private cashEl: HTMLDivElement;
  private statusEl: HTMLDivElement;
  private gradeEl: HTMLDivElement;
  private hintEl: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'factory-hud';
    Object.assign(this.root.style, {
      position: 'absolute',
      left: '12px',
      top: '12px',
      zIndex: '20',
      fontFamily: 'ui-sans-serif, system-ui, Segoe UI, sans-serif',
      color: '#f4f1ea',
      textShadow: '0 1px 2px rgba(0,0,0,0.85)',
      pointerEvents: 'none',
      maxWidth: '280px',
    } as CSSStyleDeclaration);

    const title = document.createElement('div');
    title.textContent = 'TINY FACTORY RUSH XR';
    Object.assign(title.style, {
      fontSize: '13px',
      letterSpacing: '0.08em',
      fontWeight: '700',
      opacity: '0.9',
      marginBottom: '6px',
    } as CSSStyleDeclaration);

    this.cashEl = document.createElement('div');
    this.statusEl = document.createElement('div');
    this.gradeEl = document.createElement('div');
    this.hintEl = document.createElement('div');
    Object.assign(this.cashEl.style, { fontSize: '22px', fontWeight: '700' });
    Object.assign(this.statusEl.style, { fontSize: '14px', marginTop: '4px' });
    Object.assign(this.gradeEl.style, {
      fontSize: '28px',
      fontWeight: '800',
      marginTop: '8px',
      color: '#f0c75e',
    });
    Object.assign(this.hintEl.style, {
      fontSize: '12px',
      marginTop: '8px',
      opacity: '0.85',
      lineHeight: '1.35',
    });

    this.root.append(title, this.cashEl, this.statusEl, this.gradeEl, this.hintEl);
    parent.style.position = parent.style.position || 'relative';
    parent.appendChild(this.root);
  }

  update(snap: SimSnapshot, hint: string): void {
    this.cashEl.textContent = `CASH ${Math.floor(snap.cash)}`;
    const time = Math.ceil(snap.remaining);
    const jam = snap.jamActive ? ' · JAM' : '';
    const boost = snap.boosted ? ' · FLOW RESTORED' : '';
    if (snap.phase === 'ended' && snap.grade) {
      this.statusEl.textContent = `SHIFT COMPLETE · OUT ${snap.delivered}${boost}`;
      this.gradeEl.textContent = `GRADE ${snap.grade}`;
      this.hintEl.textContent = 'RUN AGAIN — press R';
    } else {
      this.statusEl.textContent = `SHIFT ${time}s · OUT ${snap.delivered}${jam}${boost}`;
      this.gradeEl.textContent = '';
      this.hintEl.textContent = hint;
    }
  }

  dispose(): void {
    this.root.remove();
  }
}
