import type { PlayerId, RoomPlayer } from "@playhub/game-contract";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Event, Move, Role, View } from "../../logic/types";
import { claimable, eventLines, screenOf, stripOf } from "../model/board";
import { effectiveRole, emptyPick, isComplete, needOf, powerOf, tap, type Pick } from "../model/pick";
import { CardBack, CardFace } from "../molecules/Cards";
import { ChallengePanel, ClaimedPanel, LookPanel, PowerPanel } from "../organisms/ClaimPanels";
import { PlayerStrip, type Picking } from "../organisms/PlayerStrip";
import { EventBanner, FinalCards, MagicRing, RevealScreen, ShownScreen, WaitingPanel } from "../organisms/Screens";
import { GuideSheet, LogSheet } from "../organisms/Sheets";
import { TopBar } from "../organisms/TopBar";
import { ClaimPanel, MemorizePanel, PeekPanel, SwapPanel, TurnMenu } from "../organisms/TurnPanels";
import { useLineText } from "../organisms/useLineText";

const SEND_TIMEOUT_MS = 3000;
const BANNER_MS = 3500;
const RING_MS = 2600;

interface Props {
  view: View;
  me: PlayerId;
  players: readonly RoomPlayer[];
  send: (move: Move) => void;
  online: boolean;
}

const isMagic = (e: Event) => e.kind === "power" && !e.skipped && (e.as ?? e.role) === "magician";

export function PlayPage({ view, me, players, send, online }: Props) {
  const { t } = useTranslation("salab-rang");
  const [sheet, setSheet] = useState<"log" | "guide" | null>(null);
  const [mode, setMode] = useState<"menu" | "swap" | "claim">("menu");
  const [swapTarget, setSwapTarget] = useState<PlayerId | null>(null);
  const [real, setReal] = useState(true);
  const [claimRole, setClaimRole] = useState<Role | null>(null);
  const [pick, setPick] = useState<Pick | null>(null);
  const [holding, setHolding] = useState(false);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const [banner, setBanner] = useState<string[] | null>(null);
  const [ring, setRing] = useState<string | null>(null);
  const seenLog = useRef(view.log.length);

  const nameOf = (id: PlayerId) => (id === me ? t("you") : (players.find((p) => p.id === id)?.name ?? "?"));
  const roleName = (role: Role) => t(`role.${role}.name`);
  const lineText = useLineText(nameOf);

  const turnKey = `${view.phase}:${view.current}:${view.actor}`;
  const stage = `${turnKey}:${view.log.length}:${view.answered.length}:${view.myAnswer}:${view.hidden.length}`;
  const busy = !online || sentAt === stage;

  useEffect(() => {
    setMode("menu");
    setSwapTarget(null);
    setReal(true);
    setClaimRole(null);
    setPick(null);
    setHolding(false);
  }, [turnKey]);

  useEffect(() => {
    if (sentAt === null) return;
    const timer = setTimeout(() => setSentAt(null), SEND_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [sentAt]);

  // Newly logged public events greet the next player; waiting screens list them already.
  useEffect(() => {
    const fresh = view.log.slice(seenLog.current);
    seenLog.current = view.log.length;
    if (fresh.length === 0) return;
    setBanner(eventLines(fresh).reverse().map(lineText));
    const magic = fresh.find(isMagic);
    if (magic?.kind === "power") setRing(magic.player);
    const timer = setTimeout(() => setBanner(null), BANNER_MS);
    const ringTimer = setTimeout(() => setRing(null), RING_MS);
    return () => {
      clearTimeout(timer);
      clearTimeout(ringTimer);
    };
    // lineText changes every render; the log length is what matters.
  }, [view.log.length]);

  const act = (move: Move) => {
    send(move);
    setSentAt(stage);
  };

  const screen = screenOf(view, me);
  const seated = view.order.includes(me);
  const claim = view.claim;
  const chips = stripOf(view, me, players);
  const activePick = pick ?? (screen.kind === "power" ? emptyPick(screen.role) : null);

  let picking: Picking | undefined;
  if (screen.kind === "turn" && mode === "swap") {
    picking = { picked: swapTarget ? [swapTarget] : [], off: view.order.filter((p) => p === me || view.blessed.includes(p)), onPick: setSwapTarget };
  } else if (screen.kind === "power" && activePick) {
    const role = effectiveRole(activePick);
    const need = role ? needOf(role) : "none";
    if (need !== "none") {
      picking = {
        picked: need === "fromTo" ? activePick.targets.slice(1) : activePick.targets,
        from: need === "fromTo" ? activePick.targets[0] : undefined,
        off: [me],
        onPick: (p) => p !== me && setPick(tap(activePick, p)),
      };
    }
  }

  const status = (): string => {
    const who = (id: PlayerId | null | undefined) => (id ? nameOf(id) : "");
    switch (view.phase) {
      case "memorize":
        return seated && view.hidden.includes(me) ? t("memorize.waiting") : t("waiting.memorize");
      case "turn":
        return t("waiting.choose", { name: who(view.current) });
      case "peek":
        return t("waiting.peek", { name: who(view.current) });
      case "challenge":
        return t("waiting.challenge", { name: who(claim?.player), role: claim ? roleName(claim.role) : "" });
      case "reveal":
        return t("waiting.reveal", { name: who(claim?.player), role: claim ? roleName(claim.role) : "" });
      case "power":
        return t("waiting.power", { name: who(view.actor), role: claim ? roleName(claim.role) : "" });
      case "secret":
        return t("waiting.secret", { name: who(view.actor) });
      case "shown":
        return t("waiting.shown", { name: who(view.actor) });
      case "massage":
        return t("waiting.massage", { name: who(view.actor) });
      default:
        return "";
    }
  };

  const myRole = view.cards[me];
  const back = seated ? <CardBack label={t("card.down")} /> : null;
  let card: ReactNode = back;
  let caption: string | null = seated ? t("card.down") : null;
  let panel: ReactNode = null;
  let hideCardOnPhone = false;

  switch (screen.kind) {
    case "memorize":
      if (!screen.hidden && myRole) {
        card = <CardFace role={myRole} name={roleName(myRole)} caption={t("card.yours")} detail={t(`role.${myRole}.power`)} label={roleName(myRole)} />;
        caption = null;
        panel = <MemorizePanel left={view.order.length - view.hidden.length} onHide={() => act({ type: "hide" })} disabled={busy} />;
      } else {
        panel = <WaitingPanel status={status()} latest={[]} />;
      }
      break;
    case "turn":
      if (mode === "swap") {
        panel = (
          <SwapPanel
            target={swapTarget}
            real={real}
            nameOf={nameOf}
            onReal={setReal}
            onBack={() => setMode("menu")}
            onConfirm={() => swapTarget && act({ type: "swap", target: swapTarget, real })}
            disabled={busy}
          />
        );
      } else if (mode === "claim") {
        hideCardOnPhone = true;
        panel = (
          <ClaimPanel
            deck={view.deck}
            role={claimRole}
            onRole={setClaimRole}
            onBack={() => setMode("menu")}
            onConfirm={() => claimRole && claimable(view).includes(claimRole) && act({ type: "claim", role: claimRole })}
            disabled={busy}
          />
        );
      } else {
        panel = (
          <TurnMenu
            muted={view.muted.includes(me)}
            onSwap={() => setMode("swap")}
            onPeek={() => act({ type: "peek" })}
            onClaim={() => setMode("claim")}
            disabled={busy}
          />
        );
      }
      break;
    case "peek":
      if (holding && screen.role) {
        card = <CardFace role={screen.role} name={roleName(screen.role)} caption={t("card.now")} detail={t(`role.${screen.role}.power`)} label={roleName(screen.role)} />;
        caption = null;
      }
      panel = <PeekPanel onHold={setHolding} onDone={() => act({ type: "done" })} disabled={busy} />;
      break;
    case "challenge":
      hideCardOnPhone = true;
      panel = claim && (
        <ChallengePanel
          claimer={nameOf(claim.player)}
          role={claim.role}
          answered={view.answered.length}
          total={view.order.length - 1}
          myAnswer={view.myAnswer}
          onAnswer={(challenge) => act({ type: "respond", challenge })}
          disabled={busy}
        />
      );
      break;
    case "claimed":
      hideCardOnPhone = true;
      panel = claim && <ClaimedPanel role={claim.role} answered={view.answered.length} total={view.order.length - 1} />;
      break;
    case "power":
      hideCardOnPhone = true;
      panel = activePick && (
        <PowerPanel
          role={screen.role}
          deck={view.deck}
          pick={activePick}
          nameOf={nameOf}
          onChannel={(as) => setPick(emptyPick("medium", as))}
          onUse={() => {
            const power = powerOf(activePick);
            if (power) act({ type: "power", power });
          }}
          onSkip={() => act({ type: "done" })}
          complete={isComplete(activePick)}
          disabled={busy}
        />
      );
      break;
    case "secret": {
      const looked = Object.entries(view.cards);
      card = (
        <div className="flex flex-wrap items-center justify-center gap-3.5">
          {looked.map(([id, role]) =>
            holding ? (
              <CardFace key={id} role={role} name={roleName(role)} caption={t("card.is", { name: nameOf(id) })} label={`${nameOf(id)} ${roleName(role)}`} size="sm" tone="true" />
            ) : (
              <div key={id} className="flex flex-col items-center gap-2">
                <CardBack label={nameOf(id)} size="sm" tone="true" />
                <span className="font-display text-lg font-bold">{nameOf(id)}</span>
              </div>
            ),
          )}
        </div>
      );
      caption = null;
      const found = [...view.log].reverse().find((e) => e.kind === "power");
      panel = (
        <LookPanel
          title={t("secret.title")}
          note={found?.kind === "power" && found.found ? t("secret.found") : undefined}
          onHold={setHolding}
          onDone={() => act({ type: "done" })}
          doneLabel={t("secret.done")}
          disabled={busy}
        />
      );
      break;
    }
    case "massage":
      if (holding && screen.role) {
        card = <CardFace role={screen.role} name={roleName(screen.role)} caption={t("card.now")} detail={t(`role.${screen.role}.power`)} label={roleName(screen.role)} tone="true" />;
        caption = null;
      }
      panel = <LookPanel title={t("massage.title")} onHold={setHolding} onDone={() => act({ type: "done" })} doneLabel={t("massage.done")} disabled={busy} />;
      break;
    case "waiting": {
      const shown = Object.entries(view.cards);
      if (view.phase === "reveal" && claim && shown.length > 0) {
        card = (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {shown.map(([id, role]) => (
              <CardFace key={id} role={role} name={roleName(role)} caption={t("card.is", { name: nameOf(id) })} label={`${nameOf(id)} ${roleName(role)}`} size="sm" tone={role === claim.role ? "true" : "false"} />
            ))}
          </div>
        );
        caption = null;
      } else if (view.phase === "shown" && shown[0]) {
        const [id, role] = shown[0];
        card = <CardFace role={role} name={roleName(role)} caption={t("card.is", { name: nameOf(id) })} label={`${nameOf(id)} ${roleName(role)}`} size="md" />;
        caption = null;
      }
      panel = <WaitingPanel status={status()} latest={eventLines(view.log).slice(0, 3).map(lineText)} />;
      break;
    }
    default:
      break;
  }

  const full = (() => {
    if (screen.kind === "revealed" && claim) {
      const ownerHere = view.actor !== null && view.cards[view.actor] === claim.role;
      return (
        <RevealScreen
          role={screen.role}
          claimed={claim.role}
          owner={screen.owner}
          me={nameOf(me)}
          title={t("reveal.title", { role: roleName(claim.role) })}
          action={screen.acting ? { label: screen.owner ? t("reveal.use", { role: roleName(claim.role) }) : t("reveal.end"), onClick: () => act({ type: "continue" }), disabled: busy } : undefined}
          waitText={view.actor ? t(ownerHere ? "reveal.waitOwner" : "reveal.waitClaimer", { name: nameOf(view.actor) }) : undefined}
        />
      );
    }
    if (screen.kind === "shown") return <ShownScreen role={screen.role} me={nameOf(me)} onDone={() => act({ type: "continue" })} disabled={busy} />;
    return null;
  })();

  const finished = screen.kind === "finished";
  const rows = [...view.order]
    .map((id) => ({ id, role: view.cards[id] ?? null, coins: view.coins[id] ?? 0 }))
    .sort((a, b) => b.coins - a.coins);

  return (
    <main className="relative flex h-full flex-col gap-4 overflow-hidden bg-sr-night px-6 pt-6 pb-6 font-body text-sr-text tall:gap-3 tall:p-4">
      <TopBar
        round={view.phase === "memorize" || finished ? undefined : view.round}
        rounds={view.rounds}
        goal={view.goal}
        onHistory={() => setSheet("log")}
        onGuide={() => setSheet("guide")}
      />
      <PlayerStrip chips={chips} nameOf={nameOf} picking={picking} />
      {finished ? (
        <FinalCards rows={rows} nameOf={nameOf} />
      ) : (
        <div className="grid min-h-0 grow grid-cols-2 gap-6 tall:flex tall:flex-col tall:gap-3">
          <section className={`flex min-h-0 flex-col items-center justify-center gap-2.5 rounded-3xl bg-sr-shade/40 tall:grow tall:bg-transparent ${hideCardOnPhone ? "tall:hidden" : ""}`}>
            {card}
            {caption && <span className="text-[15px] text-sr-muted">{caption}</span>}
          </section>
          <section className={`flex min-h-0 flex-col ${hideCardOnPhone ? "tall:grow" : ""}`}>{panel}</section>
        </div>
      )}
      {full}
      {ring && <MagicRing players={view.order} blessed={view.blessed} nameOf={nameOf} caster={nameOf(ring)} />}
      {banner && screen.kind === "turn" && mode === "menu" && <EventBanner lines={banner} />}
      {sheet === "log" && <LogSheet log={view.log} nameOf={nameOf} onClose={() => setSheet(null)} />}
      {sheet === "guide" && <GuideSheet deck={view.deck} onClose={() => setSheet(null)} />}
    </main>
  );
}
