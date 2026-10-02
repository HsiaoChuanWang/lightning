import type { MatchPhase, MatchStatus, OpponentType } from '@/stores/match'
import type { RevengeStatus } from '@/stores/revenge'

export interface MatchRecord {
  match_id: string
  player_one_id: string
  player_two_id: string
  opponent_type: OpponentType
  quiz_set_id: number
  status: MatchStatus
  current_round: number
  phase: MatchPhase
  phase_started_at: string
  phase_deadline_at: string
  flow_completed_at: string | null
  winner_id: string | null
}

export interface MatchUsersRecord {
  match_id: string
  player_one_id: string
  player_two_id: string
  returned_quiz_set_id: number
}

export interface RoundRecord {
  round_id: string
  round: number
  input: string
  score: number
  bonus: number
  time_taken_ms: number
  submitted_at: string | null
  created_at: string
}

export interface UserRecord {
  user_id: string
  user_name: string
  avatar_url: string
  win_count: number
  loss_count: number
  total_matches: number
}

export interface QuizRecord {
  quiz_id: string
  quiz_set_id: number
  order: number
  image_url: string
  answer: string
  prepared_ai_answer: string
}

export interface RevengeRecord {
  revenge_id: string
  from_user_id: string
  to_user_id: string
  match_id: string
  status: RevengeStatus
  created_at: string
}
