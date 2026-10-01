import type { RoundRecord } from '@/types/database'
import type { Round } from '@/stores/round'

export function toRound(record: RoundRecord): Round {
  return {
    roundId: record.round_id,
    round: record.round,
    input: record.input,
    score: record.score,
    bonus: record.bonus,
    timeTakenMs: record.time_taken_ms,
    submittedAt: record.submitted_at,
    createdAt: record.created_at,
  }
}
