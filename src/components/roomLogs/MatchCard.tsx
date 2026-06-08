import { useState } from 'react';
import { ChevronDown, Users, Clock, Coins, Trophy } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Badge } from '../shared/Badge';
import { useLanguage } from '../../i18n/LanguageContext';
import type { RoomHistory } from '../../types/roomHistory';

function toMs(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Date.parse(value) || 0;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try { return (value as { toDate(): Date }).toDate().getTime(); } catch { return 0; }
  }
  return 0;
}

function formatTs(value: unknown): string {
  const ms = toMs(value);
  if (!ms) return '—';
  return new Date(ms).toLocaleString();
}

function formatDuration(seconds?: number): string {
  if (typeof seconds !== 'number' || seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const resultVariant: Record<string, 'green' | 'red' | 'amber' | 'gray'> = {
  win: 'green',
  loss: 'red',
  draw: 'amber',
};

interface MatchCardProps {
  match: RoomHistory;
}

export function MatchCard({ match }: MatchCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useLanguage();
  const players = match.players ?? [];

  return (
    <div className="border-b border-glass-border last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-glass-hover"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            {match.roomCode && (
              <span className="font-mono text-sm font-semibold text-neon-cyan">
                {match.roomCode}
              </span>
            )}
            <span className="font-mono text-[11px] text-gray-600">
              {match.id.slice(0, 8)}
            </span>
            {match.status && (
              <Badge variant={match.status === 'finished' ? 'cyan' : 'gray'}>
                {match.status}
              </Badge>
            )}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Users size={11} />
              {players.length}
            </span>
            {match.winner && (
              <span className="inline-flex items-center gap-1 text-xo-cyan">
                <Trophy size={11} />
                {players.find((p) => p.uid === match.winner)?.displayName ?? match.winner}
              </span>
            )}
            {typeof match.duration === 'number' && (
              <span className="inline-flex items-center gap-1">
                <Clock size={11} />
                {formatDuration(match.duration)}
              </span>
            )}
            {typeof match.entryFee === 'number' && (
              <span className="inline-flex items-center gap-1">
                <Coins size={11} />
                {match.entryFee}
              </span>
            )}
            <span>{formatTs(match.createdAt)}</span>
          </span>
        </span>
        <ChevronDown
          size={16}
          className={cn(
            'shrink-0 text-gray-500 transition-transform duration-200',
            expanded && 'rotate-180'
          )}
        />
      </button>

      {expanded && (
        <div className="border-t border-glass-border bg-black/20 px-4 py-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
                {t('players')}
              </p>
              {players.length === 0 ? (
                <p className="text-xs text-gray-600">—</p>
              ) : (
                <div className="space-y-1.5">
                  {players.map((p) => (
                    <div key={p.uid} className="flex items-center gap-2 text-xs">
                      {p.side && (
                        <span className={cn(
                          'inline-flex h-5 w-5 items-center justify-center rounded font-bold',
                          p.side === 'X' ? 'bg-xo-cyan/10 text-xo-cyan' : 'bg-neon-cyan/10 text-neon-cyan'
                        )}>
                          {p.side}
                        </span>
                      )}
                      <span className="text-gray-300">
                        {p.displayName || p.email || p.uid}
                      </span>
                      {p.result && (
                        <Badge variant={resultVariant[p.result] ?? 'gray'}>
                          {t(p.result as Parameters<typeof t>[0]) || p.result}
                        </Badge>
                      )}
                      {typeof p.coinsEarned === 'number' && (
                        <span className="inline-flex items-center gap-0.5 text-xo-cyan">
                          <Coins size={10} />
                          {p.coinsEarned > 0 ? `+${p.coinsEarned}` : p.coinsEarned}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 text-xs">
              {match.gameMode && (
                <div>
                  <span className="text-gray-500">{t('gameMode')}: </span>
                  <span className="text-gray-300">{match.gameMode}</span>
                </div>
              )}
              {match.startedAt != null ? (
                <div>
                  <span className="text-gray-500">Started: </span>
                  <span className="text-gray-300">{formatTs(match.startedAt)}</span>
                </div>
              ) : null}
              {match.endedAt != null ? (
                <div>
                  <span className="text-gray-500">Ended: </span>
                  <span className="text-gray-300">{formatTs(match.endedAt)}</span>
                </div>
              ) : null}
              {match.board && (
                <div>
                  <p className="mb-1 text-gray-500">{t('boardState')}:</p>
                  <div className="grid w-fit grid-cols-3 gap-0.5">
                    {match.board.map((cell, i) => (
                      <div
                        key={i}
                        className="flex h-7 w-7 items-center justify-center rounded border border-glass-border bg-black/40 font-mono text-xs font-bold"
                      >
                        <span className={cn(
                          cell === 'X' ? 'text-xo-cyan' : cell === 'O' ? 'text-neon-cyan' : 'text-gray-700'
                        )}>
                          {cell || '·'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
