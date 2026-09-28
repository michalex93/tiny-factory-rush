/**
 * Player-facing copy layer.
 *
 * The simulation/campaign systems speak engineering (OUTPUT, WIP, THROUGHPUT,
 * MARGIN, M1…). Players on a web portal don't. Everything shown on screen is
 * passed through `friendly()` so the systems (and their tests) keep their
 * precise vocabulary while the UI reads like a casual game.
 */

export const MACHINE_LABELS = ['Cutter', 'Assembler', 'Packer'] as const;

const RULES: Array<[RegExp, string]> = [
  // Decision prompts first (they contain words replaced below)
  [/CHOOSE: Throughput \(Speed\) or Margin \(Value\)/g, 'PICK ONE: Faster machines or Pricier products'],
  [/Choose THROUGHPUT \(Speed\) or MARGIN \(Value\) — then buy it/g, 'Pick a plan: FASTER or WORTH MORE — then buy it'],
  [/Buy your pick: Speed/g, 'Buy your pick: FASTER'],
  [/Buy your pick: Value/g, 'Buy your pick: WORTH MORE'],
  [/DECISION · Throughput vs Margin/g, 'PICK A PLAN'],
  [/STRATEGIC CHOICE — pick a path, then BUY it/g, 'PICK A PLAN — then buy it'],
  // Machines
  [/\bM1\b/g, MACHINE_LABELS[0]],
  [/\bM2\b/g, MACHINE_LABELS[1]],
  [/\bM3\b/g, MACHINE_LABELS[2]],
  [/Machine 1\b/g, MACHINE_LABELS[0]],
  [/Machine 2\b/g, MACHINE_LABELS[1]],
  [/Machine 3\b/g, MACHINE_LABELS[2]],
  // Metrics
  [/LINE INCOME\/MIN/g, 'Income/min'],
  [/LINE INCOME/g, 'Income'],
  [/\bINCOME\b/g, 'Income'],
  [/\bOUTPUT\b/g, 'Output'],
  [/\bWIP\b/g, 'Pile-up'],
  [/THROUGHPUT/g, 'SPEED'],
  [/Throughput/g, 'Speed'],
  [/\bMARGIN\b/g, 'VALUE'],
  [/\bMargin\b/g, 'Value'],
  [/FLOW PLAN/g, 'SPEED PLAN'],
  [/CLEAR THE FLOW/g, 'KEEP IT MOVING'],
  [/PROVE THE VALUE/g, 'SHOW THE PROFIT'],
  [/FLOW RESTART/g, 'SPEED RESTART'],
  [/BOTTLENECK/g, 'SLOWEST MACHINE'],
  [/[Bb]ottleneck/g, 'Slowest machine'],
  [/\bBN\b/g, 'Slowest'],
  [/queue/g, 'pile'],
  [/Queue/g, 'Pile'],
  // Campaign wording
  [/^BRANCH: /g, 'CHALLENGE: '],
  [/^BALANCE: /g, 'COMBO: '],
  [/SMARTPHONE EXPANSION FUND — allocate income to build the next line/g, 'Save up to build a PHONE line!'],
  [/NEXT CATEGORY — SMARTPHONES — Expansion Fund/g, 'NEXT: Build a Smartphone line'],
  [/Expansion Fund/g, 'Phone Fund'],
  [/EXPANSION FUND/g, 'PHONE FUND'],
  [/BALANCED/g, 'STEADY'],
  [/Balanced/g, 'Steady'],
  [/SELECT FUNDING ABOVE/g, 'PICK A SAVING PLAN'],
  [/\bNv\./g, 'Lv'],
  [/upgrades accelerate lifetime earned; cash spend does not reset it/g, 'spending never slows it down!'],
  [/Optimization chain complete — keep tuning the line/g, 'Great work! Keep improving your factory'],
  [/optimize from your Shift 1 snapshot/g, 'beat your last shift'],
  // Stray Spanish
  [/PRODUCCIÓN/g, 'PRODUCTION'],
  [/Desbloquear…/g, 'Unlock…'],
  [/Todo desbloqueado/g, 'All unlocked!'],
  [/gana \$/g, 'earn $'],
  [/MEJORAS/g, 'UPGRADES'],
];

export function friendly(text: string): string {
  let out = text;
  for (const [re, rep] of RULES) out = out.replace(re, rep);
  return out;
}
