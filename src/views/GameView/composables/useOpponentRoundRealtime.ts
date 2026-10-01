import { supabase } from '@/lib/supabaseClient'
import { toRound } from '@/mappers/roundMapper'
import { useRoundStore } from '@/stores/round'
import type { RoundRecord } from '@/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { onBeforeUnmount, onMounted } from 'vue'

export function useOpponentRoundRealtime(opponentId: string) {
  const roundStore = useRoundStore()
  let roundChannel: RealtimeChannel | null = null

  /** 建立 rounds UPDATE 監聽，接收指定對手最新的答案、分數與提交時間。 */
  function subscribeToOpponentRound() {
    roundChannel = supabase
      .channel('opponent-round-listener')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rounds',
          filter: `user_id=eq.${opponentId}`,
        },
        (payload) => {
          roundStore.updateOpponentCurrentRoundData(toRound(payload.new as RoundRecord))
        },
      )
      .subscribe()
  }

  /** 移除 rounds Realtime channel，避免離開作答頁後繼續接收更新。 */
  function removeOpponentRoundSubscription() {
    if (!roundChannel) return
    supabase.removeChannel(roundChannel)
    roundChannel = null
  }

  onMounted(subscribeToOpponentRound)
  onBeforeUnmount(removeOpponentRoundSubscription)
}
