import { Coin } from "../atoms/Coin";
import { Icon, Mark } from "../atoms/Icon";

export interface PlayerChipProps {
  name: string;
  coins: number;
  /** Full description for screen readers, already translated. */
  label: string;
  me?: boolean;
  current?: boolean;
  leader?: boolean;
  near?: boolean;
  blessed?: boolean;
  muted?: boolean;
  unhidden?: boolean;
  answered?: boolean;
  away?: boolean;
  picked?: boolean;
  from?: boolean;
  off?: boolean;
  /** Makes the chip a button for target picking (W33). */
  onPick?: () => void;
}

function frameOf({ me, current, picked, from }: PlayerChipProps) {
  if (from) return "border-[3px] border-sr-false bg-sr-false-deep";
  if (picked) return "border-[3px] border-sr-true bg-sr-true-deep";
  if (current) return "border-[3px] border-sr-lantern bg-sr-stall";
  if (me) return "border-2 border-sr-me bg-sr-raised";
  return "border-2 border-sr-line bg-sr-panel";
}

/** W31: one player on the strip. */
export function PlayerChip(props: PlayerChipProps) {
  const { name, coins, label, me, leader, near, blessed, muted, unhidden, answered, away, off, onPick } = props;
  const className = `relative flex h-[58px] w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl ${frameOf(props)} ${off ? "opacity-40" : ""}`;
  const body = (
    <>
      <span className={`absolute top-1.5 left-1.5 size-2 rounded-full ${away ? "border-2 border-sr-coin" : "bg-sr-online"}`} />
      <span className="absolute top-0.5 right-1 flex gap-px">
        {leader && <Mark name="crown" />}
        {blessed && <Mark name="shield" />}
        {muted && (
          <span className="text-sr-false">
            <Icon name="lock" size={14} strokeWidth={2.6} />
          </span>
        )}
        {unhidden && (
          <span className="text-sr-lantern">
            <Icon name="eye" size={15} strokeWidth={2.4} />
          </span>
        )}
        {answered && (
          <span className="text-sr-online">
            <Icon name="check" size={15} strokeWidth={3} />
          </span>
        )}
      </span>
      <span className={`max-w-full truncate px-1.5 text-[13px] font-bold ${me ? "text-sr-glow" : "text-sr-text"}`}>{name}</span>
      <span className={`flex items-center gap-[3px] font-display text-xl leading-none font-bold ${near ? "text-sr-false" : "text-sr-text"}`}>
        <Coin />
        {coins}
      </span>
    </>
  );
  if (onPick) {
    return (
      <button type="button" aria-label={label} aria-pressed={props.picked || props.from} disabled={off} onClick={onPick} className={className}>
        {body}
      </button>
    );
  }
  return (
    <div aria-label={label} role="img" className={className}>
      {body}
    </div>
  );
}
