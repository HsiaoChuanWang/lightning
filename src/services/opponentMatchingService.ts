import { AI_MATCH_DELAY_MS, MATCH_SEARCH_TIMEOUT_MS } from '@/config/timing'
import { supabase } from '@/lib/supabaseClient'
import { toHumanMatch } from '@/mappers/matchMapper'
import type { Match } from '@/stores/match'
import type { MatchUsersRecord } from '@/types/database'
import { sleep } from '@/utils/helpers'
import { v4 as uuidv4 } from 'uuid'

export interface PhantomCandidate {
  player_one_id: string
  quiz_set_id: number
  match_id: string
}

// 已在配對池中時不重複新增
export async function enterMatchingPool(userId: string): Promise<void> {
  const { data, error: selectError } = await supabase
    .from('matching_pool')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (selectError) throw new Error('[enterMatchingPool] 查詢失敗：' + selectError.message)
  if (data) return

  const { error } = await supabase.from('matching_pool').insert([{ user_id: userId }])
  if (error) throw new Error('[enterMatchingPool] 寫入失敗：' + error.message)
}

/** 從配對池移除一位或多位使用者。 */
export async function removeFromMatchingPool(userIds: string[]): Promise<void> {
  const query = supabase.from('matching_pool').delete()
  const { error } =
    userIds.length === 1
      ? await query.eq('user_id', userIds[0])
      : await query.in('user_id', userIds)

  if (error) throw new Error('[removeFromMatchingPool] 刪除失敗：' + error.message)
}

/**
 * 真人配對
 * 避免多位玩家同時配對時選到相同對手
 * 成功時回傳轉換後的 Match，尚未找到對手時回傳 null。
 */
export async function matchHuman(userId: string, quizSetId: number): Promise<Match | null> {
  const { data, error } = await supabase.rpc('match_users', {
    my_id: userId,
    quiz_set_id: quizSetId,
  })

  if (error) throw new Error('[matchHuman] RPC 錯誤：' + error.message)
  if (!data?.length) return null
  return toHumanMatch(data[0] as MatchUsersRecord)
}

export async function hasMatchedHuman(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('matches')
    .select('match_id')
    .or(`player_one_id.eq.${userId},player_two_id.eq.${userId}`)
    .eq('opponent_type', 'human')
    .eq('status', 'matched')
    .limit(1)

  if (error) throw new Error('[hasMatchedHuman] 查詢失敗：' + error.message)
  return data.length > 0
}

// 幻影配對
export async function findPhantomCandidate(userId: string): Promise<PhantomCandidate | null> {
  const { data: playedMatches, error: playedError } = await supabase
    .from('matches')
    .select('match_id')
    .or(`player_one_id.eq.${userId},player_two_id.eq.${userId}`)

  if (playedError) {
    throw new Error('[findPhantomCandidate] 查詢歷史對戰失敗：' + playedError.message)
  }

  const playedMatchIds = playedMatches.map((match) => match.match_id).filter(Boolean)
  let query = supabase
    .from('matches')
    .select('player_one_id, quiz_set_id, match_id')
    .eq('is_player_one_complete', true)
    .neq('player_one_id', userId)

  if (playedMatchIds.length === 1) query = query.neq('match_id', playedMatchIds[0])
  if (playedMatchIds.length > 1) {
    query = query.not('match_id', 'in', `(${playedMatchIds.join(',')})`)
  }

  const { data, error } = await query.limit(1)
  if (error) throw new Error('[findPhantomCandidate] 選擇 Phantom 失敗：' + error.message)
  return data?.[0] ?? null
}

// AI 對手配對
export async function createAiOpponent(timeout = MATCH_SEARCH_TIMEOUT_MS): Promise<string> {
  await sleep(Math.min(AI_MATCH_DELAY_MS, timeout))
  return uuidv4()
}
