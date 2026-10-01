import { REMATCH_RESULT_DELAY_MS } from '@/config/timing'
import { supabase } from '@/lib/supabaseClient'
import { toRevengeInfo } from '@/mappers/revengeMapper'
import { useGlobalStore } from '@/stores/global'
import { useRevengeStore } from '@/stores/revenge'
import type { RevengeRecord } from '@/types/database'
import { allowNextNavigationOnce, safePush } from '@/composables/usePageGuard'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { onBeforeUnmount, onMounted } from 'vue'

export function useRevengeRealtime(matchId: string | string[]) {
  const globalStore = useGlobalStore()
  const revengeStore = useRevengeStore()
  let insertRevengeChannel: RealtimeChannel | null = null
  let updateRevengeChannel: RealtimeChannel | null = null

  /** 監聽對手新建立的 pending 再戰邀請，收到後開啟 Play Again Modal。 */
  function subscribeToRevengeInsert() {
    insertRevengeChannel = supabase
      .channel('insert-revenge-listener')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'revenge_requests',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const response = payload.new

          if (response.status === 'pending') {
            revengeStore.setRevengeInfo(toRevengeInfo(response as RevengeRecord))
            globalStore.setIsPlayAgainModalOpen(true)
          }
        },
      )
      .subscribe()
  }

  // 監聽再戰邀請狀態：matched 時進入新對戰；rejected 或 canceled 時關閉視窗並回首頁。
  function subscribeToRevengeUpdate() {
    updateRevengeChannel = supabase
      .channel('update-revenge-listener')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'revenge_requests',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const response = payload.new
          revengeStore.setRevengeInfo(toRevengeInfo(response as RevengeRecord))

          if (response.status === 'pending') {
            globalStore.setIsPlayAgainModalOpen(true)
          }

          if (response.status === 'matched') {
            setTimeout(() => {
              allowNextNavigationOnce()
              safePush(`/start-challenge/${response.revenge_id}`)
              globalStore.setIsPlayAgainModalOpen(false)
            }, REMATCH_RESULT_DELAY_MS)
          }

          if (response.status === 'rejected' || response.status === 'canceled') {
            setTimeout(() => {
              globalStore.setIsPlayAgainModalOpen(false)
              allowNextNavigationOnce()
              safePush(`/`)
            }, REMATCH_RESULT_DELAY_MS)
          }
        },
      )
      .subscribe()
  }

  /** 離開結果頁時移除兩個再戰 channel，避免重複處理後續狀態。 */
  function removeRevengeSubscriptions() {
    if (insertRevengeChannel) supabase.removeChannel(insertRevengeChannel)
    if (updateRevengeChannel) supabase.removeChannel(updateRevengeChannel)
    insertRevengeChannel = null
    updateRevengeChannel = null
  }

  onMounted(subscribeToRevengeInsert)
  onMounted(subscribeToRevengeUpdate)
  onBeforeUnmount(removeRevengeSubscriptions)
}
