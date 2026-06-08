import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Coins, ExternalLink, Hash, Trophy } from 'lucide-react';
import { DetailsDrawer } from '../shared/DetailsDrawer';
import { StatusBadge } from '../shared/StatusBadge';
import { CopyButton } from '../shared/CopyButton';
import { UserAvatar } from '../shared/UserAvatar';
import { JsonViewer } from '../shared/JsonViewer';
import { RoomBoardPreview } from '../shared/RoomBoardPreview';
import { RoomTimeline } from './RoomTimeline';
import { cn } from '../../utils/cn';
import { formatAbsoluteTime, formatRelativeTime } from '../../utils/relativeTime';
import { formatNumber } from '../../utils/formatters';
import { resolveRoomGuestAvatar, resolveRoomHostAvatar, shortUid } from '../../utils/avatar';
import { archiveRoomIfTerminal } from '../../services/roomArchives';
import type { ArenaRoom } from '../../types/room';
import type { AppUser } from '../../types/user';

interface RoomDetailsDrawerProps {
  open: boolean;
  room: ArenaRoom | null;
  usersById?: Map<string, AppUser>;
  onClose: () => void;
}

export function RoomDetailsDrawer({ open, room, usersById, onClose }: RoomDetailsDrawerProps) {
  const archivedKeysRef = useRef<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    if (!open || !room) return;
    if (!room.isTerminal || room.isArchived) return;
    const key = room.matchId || room.roomCode;
    if (!key || archivedKeysRef.current.has(key)) return;
    archivedKeysRef.current.add(key);
    void archiveRoomIfTerminal(room);
  }, [open, room]);

  if (!room) {
    return (
      <DetailsDrawer open={open} onClose={onClose} title="Room" subtitle="—">
        <p className="text-sm text-gray-500">No room selected.</p>
      </DetailsDrawer>
    );
  }

  const host = resolveRoomHostAvatar(room, usersById);
  const guest = resolveRoomGuestAvatar(room, usersById);
  const turnUid = room.turnUid;
  const winnerUid = room.roomWinnerUid ?? room.winnerUid;
  const boardDim =
    room.boardSize ??
    (Array.isArray(room.board)
      ? room.board.length === 9
        ? 3
        : room.board.length === 16
          ? 4
          : room.board.length === 25
            ? 5
            : undefined
      : undefined);

  const openProfile = (uid?: string) => {
    if (!uid) return;
    onClose();
    navigate(`/users?uid=${encodeURIComponent(uid)}`);
  };

  return (
    <DetailsDrawer
      open={open}
      onClose={onClose}
      width="xl"
      title={`Room #${room.roomCode}`}
      subtitle={
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={room.status} />
          {room.isArchived && (
            <span className="rounded-full border border-gray-500/30 bg-gray-500/10 px-2 py-0.5 text-[10px] font-semibold text-gray-400">
              Archived snapshot
            </span>
          )}
          {room.createdAt && (
            <span className="text-[11px] text-gray-500">
              Created {formatRelativeTime(room.createdAt)}
            </span>
          )}
        </div>
      }
      headerExtras={
        <CopyButton value={room.roomCode} label="room code" size="sm" stopPropagation={false} />
      }
    >
      <div className="space-y-6">
        {/* Players panel */}
        <section className="rounded-2xl border border-glass-border bg-glass-bg p-4">
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
            <PlayerPanel
              avatar={host}
              uid={room.hostUid}
              side={room.xUid === room.hostUid ? 'X' : room.oUid === room.hostUid ? 'O' : undefined}
              label="Host"
              isTurn={turnUid != null && turnUid === room.hostUid}
              isWinner={winnerUid != null && winnerUid === room.hostUid}
              onOpenProfile={() => openProfile(room.hostUid)}
            />
            <div className="flex items-center justify-center">
              <span className="font-orbitron text-2xl font-black tracking-[0.3em] text-xo-cyan/50">
                VS
              </span>
            </div>
            {room.hasGuest ? (
              <PlayerPanel
                avatar={guest}
                uid={room.guestUid}
                side={
                  room.xUid === room.guestUid ? 'X' : room.oUid === room.guestUid ? 'O' : undefined
                }
                label="Guest"
                align="end"
                isTurn={turnUid != null && turnUid === room.guestUid}
                isWinner={winnerUid != null && winnerUid === room.guestUid}
                onOpenProfile={() => openProfile(room.guestUid)}
              />
            ) : (
              <div className="flex items-center justify-end gap-3 rounded-xl border border-dashed border-glass-border p-4 text-sm text-gray-500">
                Waiting for opponent
              </div>
            )}
          </div>
        </section>

        {/* Bet & payout */}
        {room.betEnabled && (
          <Section title="Bet & Payout" icon={<Coins size={14} className="text-xo-cyan" />}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Pill label="Bet amount" value={formatNumber(room.betAmount ?? 0)} accent="cyan" />
              <Pill
                label="Prize pool"
                value={formatNumber(room.prizePool ?? room.potAmount ?? 0)}
                accent="cyan"
              />
              {typeof room.coinsWon === 'number' && (
                <Pill label="Coins won" value={formatNumber(room.coinsWon)} accent="green" />
              )}
              <Pill label="Pay-with-coins" value={room.playWithCoins ? 'Yes' : 'No'} />
              <Pill label="Coins locked" value={room.coinsLocked ? 'Yes' : 'No'} />
              <Pill
                label="Payout applied"
                value={room.payoutApplied ? 'Yes' : 'No'}
                accent={room.payoutApplied ? 'green' : 'gray'}
              />
              <Pill
                label="Prize paid"
                value={room.prizePaid ? 'Yes' : 'No'}
                accent={room.prizePaid ? 'green' : 'gray'}
              />
            </div>
          </Section>
        )}

        {/* Game state */}
        <Section title="Game" icon={<Trophy size={14} className="text-neon-cyan" />}>
          <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
            {Array.isArray(room.board) && room.board.length > 0 ? (
              <RoomBoardPreview
                board={room.board as Array<string | null>}
                boardSize={boardDim}
                winnerLine={room.winnerLine}
                size="md"
              />
            ) : Array.isArray(room.roundMaps) && room.roundMaps.length > 0 ? (
              <RoundMapsStrip roundMaps={room.roundMaps} />
            ) : (
              <div className="rounded-lg border border-dashed border-glass-border px-3 py-2 text-xs text-gray-500">
                Board not available
              </div>
            )}
            <div className="space-y-2 text-xs">
              {boardDim && (
                <KeyValue label="Board" value={`${boardDim} × ${boardDim}`} />
              )}
              {(room.roundsCount ?? Array.isArray(room.rounds) ? (room.rounds as unknown[]).length : 0) > 0 && (
                <KeyValue
                  label="Round"
                  value={`${room.currentRound ?? room.currentRoundIndex ?? 1} / ${
                    room.roundsCount ??
                    (Array.isArray(room.rounds) ? (room.rounds as unknown[]).length : '?')
                  }`}
                />
              )}
              {typeof room.movesCount === 'number' && (
                <KeyValue label="Moves" value={room.movesCount} />
              )}
              {turnUid && (
                <KeyValue
                  label="Current turn"
                  value={
                    <span className="inline-flex items-center gap-2">
                      <span className="font-mono">{shortUid(turnUid)}</span>
                      <CopyButton value={turnUid} label="turn UID" size="xs" stopPropagation={false} />
                    </span>
                  }
                />
              )}
              {room.score && Object.keys(room.score).length > 0 && (
                <KeyValue
                  label="Score"
                  value={
                    <span className="font-mono text-white">
                      {Object.entries(room.score)
                        .map(([uid, val]) => `${shortUid(uid)}=${val}`)
                        .join(' · ')}
                    </span>
                  }
                />
              )}
              {room.result && <KeyValue label="Result" value={room.result} />}
              {room.finalResult && room.finalResult !== room.result && (
                <KeyValue label="Final result" value={room.finalResult} />
              )}
              {room.resultReason &&
                room.resultReason !== room.result &&
                room.resultReason !== room.finalResult && (
                  <KeyValue label="Reason" value={room.resultReason} />
                )}
              {room.loserUid && (
                <KeyValue
                  label="Loser"
                  value={
                    <span className="inline-flex items-center gap-2 text-red-300/90">
                      <span className="font-mono">{shortUid(room.loserUid)}</span>
                      <CopyButton
                        value={room.loserUid}
                        label="loser UID"
                        size="xs"
                        stopPropagation={false}
                      />
                    </span>
                  }
                />
              )}
              {winnerUid && (
                <KeyValue
                  label="Winner"
                  value={
                    <span className="inline-flex items-center gap-2 text-emerald-300">
                      <span className="font-mono">{shortUid(winnerUid)}</span>
                      <CopyButton value={winnerUid} label="winner UID" size="xs" stopPropagation={false} />
                    </span>
                  }
                />
              )}
            </div>
          </div>

          {room.lastMove != null && typeof room.lastMove === 'object' ? (
            <div className="mt-3 rounded-lg border border-glass-border bg-black/30 px-3 py-2 text-[11px] text-gray-400">
              <span className="font-orbitron text-[10px] uppercase tracking-wider text-gray-500">
                Last move
              </span>
              <pre className="mt-1 overflow-auto font-mono text-[10px] text-gray-300">
                {JSON.stringify(room.lastMove, null, 0)}
              </pre>
            </div>
          ) : null}
        </Section>

        {/* Times */}
        <Section title="Timestamps" icon={<Hash size={14} className="text-gray-400" />}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <KeyValue label="Created" value={formatAbsoluteTime(room.createdAt)} />
            <KeyValue label="Updated" value={formatAbsoluteTime(room.updatedAt)} />
            <KeyValue label="Started" value={formatAbsoluteTime(room.startedAt)} />
            <KeyValue label="Finished" value={formatAbsoluteTime(room.finishedAt)} />
            <KeyValue label="Expires" value={formatAbsoluteTime(room.expiresAt)} />
            {room.cancelledAt != null && (
              <KeyValue label="Cancelled" value={formatAbsoluteTime(room.cancelledAt)} />
            )}
            {room.matchId && (
              <KeyValue
                label="Match ID"
                value={
                  <span className="inline-flex items-center gap-2 font-mono">
                    {room.matchId}
                    <CopyButton value={room.matchId} label="match ID" size="xs" stopPropagation={false} />
                  </span>
                }
              />
            )}
          </div>
        </Section>

        {/* Timeline */}
        <Section title="Timeline">
          <RoomTimeline room={room} />
        </Section>

        {/* Raw JSON */}
        <Section title="Raw">
          <JsonViewer data={room} title="Room JSON" />
        </Section>
      </div>
    </DetailsDrawer>
  );
}

interface SectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

function Section({ title, icon, children }: SectionProps) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 font-orbitron text-[10px] font-bold uppercase tracking-wider text-gray-400">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

interface PlayerPanelProps {
  avatar: ReturnType<typeof resolveRoomHostAvatar>;
  uid?: string;
  side?: 'X' | 'O';
  label: string;
  align?: 'start' | 'end';
  isTurn?: boolean;
  isWinner?: boolean;
  onOpenProfile?: () => void;
}

function PlayerPanel({
  avatar,
  uid,
  side,
  label,
  align = 'start',
  isTurn,
  isWinner,
  onOpenProfile,
}: PlayerPanelProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-3 rounded-xl border p-3 transition-colors',
        align === 'end' && 'sm:flex-row-reverse sm:text-end',
        isWinner
          ? 'border-emerald-500/40 bg-emerald-500/5'
          : isTurn
            ? 'border-neon-cyan/40 bg-neon-cyan/5'
            : 'border-glass-border bg-black/30'
      )}
    >
      <UserAvatar
        photoURL={avatar.photoURL ?? null}
        displayName={avatar.name ?? null}
        equippedAvatar={avatar.equippedAvatar ?? null}
        size="xl"
      />
      <div className={cn('min-w-0 flex-1', align === 'end' && 'sm:text-end')}>
        <p className="font-orbitron text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
        <p className="mt-0.5 truncate font-orbitron text-base font-bold text-white">
          {avatar.name ?? '—'}
        </p>
        <div className={cn('mt-1 flex items-center gap-1.5', align === 'end' && 'sm:justify-end')}>
          {side && (
            <span
              className={cn(
                'inline-flex h-5 w-5 items-center justify-center rounded font-mono text-[11px] font-bold',
                side === 'X'
                  ? 'bg-xo-cyan/10 text-xo-cyan'
                  : 'bg-neon-cyan/10 text-neon-cyan'
              )}
            >
              {side}
            </span>
          )}
          {isWinner && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              Winner
            </span>
          )}
          {isTurn && !isWinner && (
            <span className="rounded-full bg-neon-cyan/10 px-2 py-0.5 text-[10px] font-semibold text-neon-cyan">
              Turn
            </span>
          )}
        </div>
        {uid && (
          <div
            className={cn(
              'mt-2 inline-flex items-center gap-1.5 text-[11px] text-gray-400',
              align === 'end' && 'sm:justify-end'
            )}
          >
            <span className="font-mono">{shortUid(uid, 6, 5)}</span>
            <CopyButton value={uid} label={`${label} UID`} size="xs" stopPropagation={false} />
            {onOpenProfile && (
              <button
                type="button"
                onClick={onOpenProfile}
                className="inline-flex items-center gap-1 rounded-md border border-glass-border bg-black/40 px-2 py-0.5 text-[10px] font-semibold text-gray-300 transition-colors hover:border-xo-cyan/40 hover:text-xo-cyan"
              >
                Profile <ExternalLink size={9} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface PillProps {
  label: string;
  value: React.ReactNode;
  accent?: 'cyan' | 'green' | 'gray';
}

function Pill({ label, value, accent }: PillProps) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-black/30 px-3 py-2',
        accent === 'cyan'
          ? 'border-xo-cyan/30'
          : accent === 'green'
            ? 'border-emerald-500/30'
            : 'border-glass-border'
      )}
    >
      <p className="font-orbitron text-[9px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className={cn('mt-0.5 text-sm font-bold', accent === 'cyan' ? 'text-xo-cyan' : 'text-white')}>
        {value}
      </p>
    </div>
  );
}

interface KeyValueProps {
  label: string;
  value: React.ReactNode;
}

function KeyValue({ label, value }: KeyValueProps) {
  return (
    <div className="flex items-center justify-between gap-3 text-[11px]">
      <span className="text-gray-500">{label}</span>
      <span className="truncate text-end text-gray-200">{value}</span>
    </div>
  );
}

function inferBoardSize(len: number): number | undefined {
  if (len === 9) return 3;
  if (len === 16) return 4;
  if (len === 25) return 5;
  return undefined;
}

function extractRoundBoard(entry: unknown): Array<string | null> | null {
  if (!entry) return null;
  if (Array.isArray(entry)) return entry as Array<string | null>;
  if (typeof entry === 'object') {
    const obj = entry as Record<string, unknown>;
    if (Array.isArray(obj.board)) return obj.board as Array<string | null>;
    if (Array.isArray(obj.map)) return obj.map as Array<string | null>;
    if (Array.isArray(obj.cells)) return obj.cells as Array<string | null>;
  }
  return null;
}

interface RoundMapsStripProps {
  roundMaps: unknown[];
}

function RoundMapsStrip({ roundMaps }: RoundMapsStripProps) {
  const boards = roundMaps
    .map((entry, idx) => ({ idx, board: extractRoundBoard(entry) }))
    .filter((x): x is { idx: number; board: Array<string | null> } => x.board != null);

  if (boards.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-glass-border px-3 py-2 text-xs text-gray-500">
        Round maps unavailable
      </div>
    );
  }

  return (
    <div className="flex max-w-full flex-wrap gap-2">
      {boards.map(({ idx, board }) => (
        <div
          key={idx}
          className="flex flex-col items-center gap-1 rounded-lg border border-glass-border bg-black/30 p-2"
        >
          <RoomBoardPreview
            board={board}
            boardSize={inferBoardSize(board.length)}
            size="sm"
          />
          <span className="font-orbitron text-[9px] uppercase tracking-wider text-gray-500">
            Round {idx + 1}
          </span>
        </div>
      ))}
    </div>
  );
}
