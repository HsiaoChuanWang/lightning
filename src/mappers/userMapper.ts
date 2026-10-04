import type { UserRecord } from '@/types/database'
import type { OpponentInfo, UserInfo } from '@/stores/user'

export function toUserInfo(record: UserRecord): UserInfo {
  return {
    userId: record.user_id,
    userName: record.user_name,
    avatarUrl: record.avatar_url,
    winCount: record.win_count,
    lossCount: record.loss_count,
    totalMatches: record.total_matches,
  }
}

export function toOpponentInfo(record: UserRecord): OpponentInfo {
  return {
    opponentId: record.user_id,
    opponentName: record.user_name,
    opponentAvatarUrl: record.avatar_url,
    winCount: record.win_count,
    lossCount: record.loss_count,
    totalMatches: record.total_matches,
  }
}
