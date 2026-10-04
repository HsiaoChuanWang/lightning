import { supabase } from '@/lib/supabaseClient'
import { toRound } from '@/mappers/roundMapper'
import { useRoundStore } from '@/stores/round'
import type { RoundRecord } from '@/types/database'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { onBeforeUnmount, onMounted } from 'vue'

interface UseOpponentRoundRealtimeOptions {
  matchId: string
  opponentId: string
  round: number
}

interface RoundRealtimeRecord extends RoundRecord {
  match_id: string
  user_id: string
}

export function useOpponentRoundRealtime({
  matchId,
  opponentId,
  round,
}: UseOpponentRoundRealtimeOptions) {
  const roundStore = useRoundStore()
  let roundChannel: RealtimeChannel | null = null

  /** 監聽目前 Match 的 rounds UPDATE，並只接受目前對手及回合的資料。 */
  function subscribeToOpponentRound() {
    roundChannel = supabase
      .channel(`opponent-round-${matchId}-${opponentId}-${round}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rounds',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const record = payload.new as RoundRealtimeRecord
          const belongsToCurrentRound =
            record.match_id === matchId && record.user_id === opponentId && record.round === round

          if (!belongsToCurrentRound) return
          roundStore.setOpponentRoundData(toRound(record))
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
