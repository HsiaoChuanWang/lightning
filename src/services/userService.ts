import { supabase } from '@/lib/supabaseClient'
import type { UserRecord } from '@/types/database'

interface UpdateUserStatsParams {
  userId: string
  winCount: number
  lossCount: number
  totalMatches: number
}

export async function createUser(userId: string, userName: string): Promise<void> {
  const { error } = await supabase.from('users').insert([
    {
      user_id: userId,
      user_name: userName,
      avatar_url: '',
      win_count: 0,
      loss_count: 0,
      total_matches: 0,
    },
  ])

  if (error) throw new Error('[createUser] 寫入使用者失敗：' + error.message)
}

/** 依使用者 ID 讀取單一使用者，供本機匿名身分登入時驗證資料是否仍存在。 */
export async function findUserById(userId: string): Promise<UserRecord | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error('[findUserById] 載入使用者失敗：' + error.message)
  return data
}

export async function findUsersByIds(userIds: string[]): Promise<UserRecord[]> {
  const { data, error } = await supabase.from('users').select('*').in('user_id', userIds)

  if (error) throw new Error('[findUsersByIds] 載入使用者失敗：' + error.message)
  return data
}

export async function updateUserStats({
  userId,
  winCount,
  lossCount,
  totalMatches,
}: UpdateUserStatsParams): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({
      win_count: winCount,
      loss_count: lossCount,
      total_matches: totalMatches,
    })
    .eq('user_id', userId)

  if (error) throw new Error('[updateUserStats] 更新使用者失敗：' + error.message)
}
