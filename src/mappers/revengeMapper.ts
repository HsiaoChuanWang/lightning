import type { RevengeRecord } from '@/types/database'
import type { RevengeInfo } from '@/stores/revenge'

export function toRevengeInfo(record: RevengeRecord): RevengeInfo {
  return {
    revengeId: record.revenge_id,
    fromUserId: record.from_user_id,
    toUserId: record.to_user_id,
    matchId: record.match_id,
    status: record.status,
    createdAt: record.created_at,
  }
}
