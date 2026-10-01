import { supabase } from '@/lib/supabaseClient'
import type { MatchStatus, OpponentType } from '@/stores/match'
import type { MatchRecord } from '@/types/database'

interface CreateMatchParams {
  matchId: string
  playerOneId: string
  playerTwoId: string
  opponentType: OpponentType
  quizSetId: number
}

/** 確認是否有已經配對等待對戰的回合；沒有符合資料時回傳 null。 */
export async function findMatchedMatch(userId: string): Promise<MatchRecord | null> {
  const { data, error } = await supabase
    .from('matches')
    .select('match_id, player_one_id, player_two_id, opponent_type, quiz_set_id')
    .or(`player_one_id.eq.${userId},player_two_id.eq.${userId}`)
    .eq('status', 'matched')
    .maybeSingle()

  if (error) throw error
  return data
}

/** 建立一筆新的對戰資料，初始狀態固定為 matched。 */
export async function insertMatch({
  matchId,
  playerOneId,
  playerTwoId,
  opponentType,
  quizSetId,
}: CreateMatchParams): Promise<void> {
  const { error } = await supabase.from('matches').insert([
    {
      match_id: matchId,
      player_one_id: playerOneId,
      player_two_id: playerTwoId,
      opponent_type: opponentType,
      quiz_set_id: quizSetId,
      is_player_one_complete: false,
      is_player_two_complete: false,
      status: 'matched',
      created_at: new Date().toISOString(),
    },
  ])

  if (error) {
    throw new Error(`[建立對戰] 寫入 matches 失敗：${error.message}`)
  }
}

/** 確認沒有正在進行中的對戰 */
export async function findInProgressMatch(userId: string): Promise<MatchRecord | null> {
  const { data, error } = await supabase
    .from('matches')
    .select('match_id, player_one_id, player_two_id, opponent_type, quiz_set_id')
    .or(`player_one_id.eq.${userId},player_two_id.eq.${userId}`)
    .eq('status', 'in_progress')
    .maybeSingle()

  if (error) throw new Error('[findInProgressMatch] 搜尋對戰失敗：' + error.message)
  return data
}

/** 目前設計為不會再回到進行中的對戰，再次登入，會將對戰標記為 abandoned */
export async function abandonMatch(matchId: string, isPlayerOne: boolean): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .update({
      is_player_one_complete: !isPlayerOne,
      is_player_two_complete: isPlayerOne,
      status: 'abandoned',
    })
    .eq('match_id', matchId)

  if (error) throw new Error('[abandonMatch] 更新對戰失敗：' + error.message)
}

/** 查詢使用者正在進行的對戰；若存在，依玩家位置將該對戰標記為 abandoned。 */
export async function abandonInProgressMatch(userId: string): Promise<boolean> {
  const existingMatch = await findInProgressMatch(userId)

  if (!existingMatch) return false

  await abandonMatch(existingMatch.match_id, existingMatch.player_one_id === userId)
  return true
}

export async function updateMatchStatus(matchId: string | string[], status: MatchStatus) {
  const { error } = await supabase.from('matches').update({ status }).eq('match_id', matchId)
  if (error) throw new Error('[updateMatchStatus] 更新對戰狀態失敗：' + error.message)
}

export async function isMatchAbandoned(
  matchId: string | string[],
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('matches')
    .select('match_id')
    .eq('match_id', matchId)
    .or(`player_one_id.eq.${userId},player_two_id.eq.${userId}`)
    .eq('status', 'abandoned')
    .maybeSingle()

  if (error) throw new Error('[isMatchAbandoned] 搜尋對戰失敗：' + error.message)
  return Boolean(data)
}

interface CompleteMatchParams {
  matchId: string
  winnerId: string | null
  isPlayerOne: boolean
  status: Extract<MatchStatus, 'completed' | 'abandoned'>
}

/** 完成對戰，更新對戰 status */
export async function completeMatch({
  matchId,
  winnerId,
  isPlayerOne,
  status,
}: CompleteMatchParams): Promise<void> {
  const completionField = isPlayerOne
    ? { is_player_one_complete: true }
    : { is_player_two_complete: true }
  const { error } = await supabase
    .from('matches')
    .update({ winner_id: winnerId, status, ...completionField })
    .eq('match_id', matchId)

  if (error) throw new Error('[completeMatch] 更新比賽結果失敗：' + error.message)
}
