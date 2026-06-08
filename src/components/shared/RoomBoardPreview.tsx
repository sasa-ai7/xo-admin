import { cn } from '../../utils/cn';

interface RoomBoardPreviewProps {
  board?: Array<string | null> | null;
  boardSize?: number;
  winnerLine?: number[];
  /** sm = card thumbnail, md = drawer preview, lg = focus view. */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function inferSize(boardLength: number, boardSize?: number): number | null {
  if (boardSize && boardSize >= 3 && boardSize <= 5 && boardLength === boardSize * boardSize) {
    return boardSize;
  }
  if (boardLength === 9) return 3;
  if (boardLength === 16) return 4;
  if (boardLength === 25) return 5;
  return null;
}

const cellPx: Record<NonNullable<RoomBoardPreviewProps['size']>, number> = {
  sm: 22,
  md: 36,
  lg: 56,
};

const cellGap: Record<NonNullable<RoomBoardPreviewProps['size']>, number> = {
  sm: 2,
  md: 4,
  lg: 6,
};

const fontSize: Record<NonNullable<RoomBoardPreviewProps['size']>, string> = {
  sm: 'text-[10px]',
  md: 'text-base',
  lg: 'text-2xl',
};

export function RoomBoardPreview({
  board,
  boardSize,
  winnerLine,
  size = 'md',
  className,
}: RoomBoardPreviewProps) {
  if (!board || board.length === 0) return null;

  const dim = inferSize(board.length, boardSize);
  if (!dim) return null;

  const winSet = new Set(winnerLine ?? []);
  const cellPxSize = cellPx[size];
  const gapPx = cellGap[size];

  return (
    <div
      className={cn('inline-grid', className)}
      style={{
        gridTemplateColumns: `repeat(${dim}, ${cellPxSize}px)`,
        gap: `${gapPx}px`,
      }}
      aria-label={`${dim} by ${dim} board preview`}
    >
      {board.slice(0, dim * dim).map((rawCell, i) => {
        const cell = (rawCell ?? '').toString().trim().toUpperCase();
        const symbol = cell === 'X' || cell === 'O' ? cell : '';
        const isWin = winSet.has(i);
        return (
          <div
            key={i}
            className={cn(
              'flex items-center justify-center rounded border font-mono font-bold',
              fontSize[size],
              isWin
                ? 'border-xo-cyan/60 bg-xo-cyan/10 shadow-[0_0_10px_rgba(85,214,255,0.25)]'
                : 'border-glass-border bg-black/40',
              symbol === 'X' && (isWin ? 'text-xo-cyan' : 'text-xo-cyan/90'),
              symbol === 'O' && (isWin ? 'text-neon-cyan' : 'text-neon-cyan/90'),
              !symbol && 'text-gray-700'
            )}
            style={{ width: cellPxSize, height: cellPxSize }}
          >
            {symbol || '·'}
          </div>
        );
      })}
    </div>
  );
}
