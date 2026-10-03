import { supabase } from '@/lib/supabaseClient'
import type { RevengeStatus } from '@/stores/revenge'
import type { RevengeRecord } from '@/types/database'

/** 讀取目前再戰邀請，供五秒回覆期限結束時確認它是否仍為 pending。 */
export async function findRevengeRequest(
  matchId: string | string[],
): Promise<RevengeRecord | null> {
  const { data, error } = await supabase
    .from('revenge_requests')
    .select('*')
    .eq('match_id', matchId)
    .maybeSingle()

  if (error) throw new Error('[findRevengeRequest] 查詢再戰邀請失敗：' + error.message)
  return data
}

export async function updateRevengeStatus(
  matchId: string | string[],
  status: RevengeStatus,
): Promise<void> {
  const { error } = await supabase
    .from('revenge_requests')
    .update({ status })
    .eq('match_id', matchId)

  if (error) throw new Error('[updateRevengeStatus] 更新再戰狀態失敗：' + error.message)
}

interface SendRevengeRequestParams {
  matchId: string | string[]
  fromUserId: string
  toUserId: string
}

export async function sendRevengeRequest({
  matchId,
  fromUserId,
  toUserId,
}: SendRevengeRequestParams): Promise<RevengeRecord | null> {
  const { error } = await supabase.from('revenge_requests').insert({
    from_user_id: fromUserId,
    to_user_id: toUserId,
    match_id: matchId,
    status: 'pending',
  })

  if (!error) return null
  if (error.code !== '23505') throw error

  const { data: existing, error: selectError } = await supabase
    .from('revenge_requests')
    .select('*')
    .eq('match_id', matchId)
    .maybeSingle()

  if (selectError) throw selectError
  if (!existing || existing.status !== 'pending') return null

  // 同一場比賽已經有 pending 邀請，代表雙方同時按下 Play again；
  // 只回傳既有邀請，由呼叫端先建立新 Match，再把邀請更新為 matched。
  return existing
}
