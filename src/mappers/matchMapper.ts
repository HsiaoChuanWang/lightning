import type { MatchRecord, MatchUsersRecord } from '@/types/database'
import type { Match } from '@/stores/match'

export function toMatch(record: MatchRecord): Match {
  return {
    matchId: record.match_id,
    playerOneId: record.player_one_id,
    playerTwoId: record.player_two_id,
    opponentType: record.opponent_type,
    quizSetId: record.quiz_set_id,
    isComplete: false,
    status: 'matched',
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
  }
}
