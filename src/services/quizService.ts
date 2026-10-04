import { supabase } from '@/lib/supabaseClient'
import { toQuiz } from '@/mappers/quizMapper'
import type { Quiz } from '@/stores/quiz'

export async function findQuizzesBySetId(quizSetId: number): Promise<Quiz[]> {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('quiz_set_id', quizSetId)
    .order('order', { ascending: true })

  if (error) throw new Error('[findQuizzesBySetId] 載入題目失敗：' + error.message)
  return data.map(toQuiz)
}
