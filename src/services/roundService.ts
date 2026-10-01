import { supabase } from '@/lib/supabaseClient'
import { toRound } from '@/mappers/roundMapper'
import type { Round } from '@/stores/round'
import { v4 as uuidv4 } from 'uuid'

interface CreateRoundParams {
  matchId: string | string[]
  userId: string
  quizSetId: number
  quizId: string | undefined
  round: number
}

interface UpdateRoundSubmissionParams {
  matchId: string | string[]
  roundId: string
  round: number
  input: string
  score: number
  bonus: number
  timeTakenMs: number
  submittedAt: string
}

export async function createRound({
  matchId,
  userId,
  quizSetId,
  quizId,
  round,
}: CreateRoundParams): Promise<Round> {
  const roundId = uuidv4()
  const createdAt = new Date().toISOString()
  const record = {
    round_id: roundId,
    match_id: matchId,
    user_id: userId,
    quiz_set_id: quizSetId,
    quiz_id: quizId,
    round,
    input: '',
    score: 0,
    bonus: 0,
    time_taken_ms: 0,
    submitted_at: null,
    created_at: createdAt,
  }

  const { error } = await supabase.from('rounds').insert([record])
  if (error) throw new Error('[createRound] 新增回合失敗：' + error.message)

  return toRound(record)
}

/** 確認每個回合開始時，對方是否還在線 */
export async function findRound(
  matchId: string | string[],
  userId: string,
  round: number,
): Promise<Round | null> {
  const { data, error } = await supabase
    .from('rounds')
    .select('*')
    .eq('match_id', matchId)
    .eq('round', round)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error('[findRound] 讀取回合失敗：' + error.message)
  return data ? toRound(data) : null
}

/** 載入 Phantom 對手過去一整場遊戲的所有回合資料*/
export async function findRounds(matchId: string, userId: string): Promise<Round[]> {
  const { data, error } = await supabase
    .from('rounds')
    .select('*')
    .eq('match_id', matchId)
    .eq('user_id', userId)
    .order('round', { ascending: true })

  if (error) throw new Error('[findRounds] 讀取回合列表失敗：' + error.message)
  return data.map(toRound)
}

export async function updateRoundSubmission({
  matchId,
  roundId,
  round,
  input,
  score,
  bonus,
  timeTakenMs,
  submittedAt,
}: UpdateRoundSubmissionParams): Promise<void> {
  const { error } = await supabase
    .from('rounds')
    .update({
      input,
      score,
      bonus,
      time_taken_ms: timeTakenMs,
      submitted_at: submittedAt,
    })
    .eq('match_id', matchId)
    .eq('round_id', roundId)
    .eq('round', round)

  if (error) throw new Error('[updateRoundSubmission] 更新回合失敗：' + error.message)
}
