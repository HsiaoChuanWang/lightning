import { REMATCH_RESULT_DELAY_MS } from '@/config/timing'
import { useDisposableTimers } from '@/composables/useDisposableTimers'
import { supabase } from '@/lib/supabaseClient'
import { toMatch } from '@/mappers/matchMapper'
import { toRevengeInfo } from '@/mappers/revengeMapper'
import { findMatchById } from '@/services/matchService'
import { useGlobalStore } from '@/stores/global'
import { useMatchStore } from '@/stores/match'
import { useRevengeStore } from '@/stores/revenge'
import type { RevengeRecord } from '@/types/database'
import { allowNextNavigationOnce, safePush } from '@/composables/usePageGuard'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { onBeforeUnmount, onMounted } from 'vue'

export function useRevengeRealtime(matchId: string | string[]) {
  const globalStore = useGlobalStore()
  const matchStore = useMatchStore()
  const revengeStore = useRevengeStore()
  const { scheduleTimeout } = useDisposableTimers()
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
            scheduleTimeout(async () => {
              // matched 只會在新 Match 建立成功後發布；導頁前先把該 Match 寫入 Store，
              // 避免全域流程同步器仍依照上一場 game_result 將其中一方導回結果頁。
              const rematch = await findMatchById(response.revenge_id)
              if (!rematch) return

              matchStore.setMatchData(toMatch(rematch))
              globalStore.setIsPlayAgainModalOpen(false)
              safePush(`/start-challenge/${response.revenge_id}`)
            }, REMATCH_RESULT_DELAY_MS)
          }

          if (response.status === 'rejected' || response.status === 'canceled') {
            scheduleTimeout(() => {
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
