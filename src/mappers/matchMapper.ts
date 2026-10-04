import type { MatchRecord, MatchUsersRecord } from '@/types/database'
import type { Match } from '@/stores/match'

export function toMatch(record: MatchRecord): Match {
  return {
    matchId: record.match_id,
    playerOneId: record.player_one_id,
    playerTwoId: record.player_two_id,
    opponentType: record.opponent_type,
    quizSetId: record.quiz_set_id,
    isComplete: record.status === 'completed' || record.status === 'abandoned',
    status: record.status,
    currentRound: record.current_round,
    phase: record.phase,
    phaseStartedAt: record.phase_started_at,
    phaseDeadlineAt: record.phase_deadline_at,
    flowCompletedAt: record.flow_completed_at,
  }
}

export function toHumanMatch(record: MatchUsersRecord): Match {
  return {
    matchId: record.match_id,
    playerOneId: record.player_one_id,
    playerTwoId: record.player_two_id,
    opponentType: 'human',
    quizSetId: record.returned_quiz_set_id,
    isComplete: false,
    status: 'matched',
    currentRound: 1,
    phase: 'entry_banner',
    phaseStartedAt: '',
    phaseDeadlineAt: '',
    flowCompletedAt: null,
  }
}
