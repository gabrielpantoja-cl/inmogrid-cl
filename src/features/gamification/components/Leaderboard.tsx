'use client';

import Image from 'next/image';

interface LeaderboardEntry {
  userId: string;
  totalPoints: number;
  rank: number;
  fullName: string | null;
  username: string;
  avatarUrl: string | null;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

const rankStyle = (rank: number) => {
  if (rank === 1) return 'text-yellow-600 font-bold';
  if (rank === 2) return 'text-gray-500 font-bold';
  if (rank === 3) return 'text-amber-700 font-bold';
  return 'text-gray-400';
};

export function Leaderboard({ entries }: LeaderboardProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-8">
        El leaderboard est&aacute; vac&iacute;o. S&eacute; el primero en ganar puntos.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">#</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Usuario</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Puntos</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.userId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
              <td className={`px-4 py-3 text-sm ${rankStyle(entry.rank)}`}>
                {entry.rank}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {entry.avatarUrl ? (
                    <Image
                      src={entry.avatarUrl}
                      alt={entry.username}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {(entry.fullName ?? entry.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {entry.fullName ?? entry.username}
                    </div>
                    <div className="text-xs text-gray-500">@{entry.username}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                {entry.totalPoints.toLocaleString('es-CL')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
