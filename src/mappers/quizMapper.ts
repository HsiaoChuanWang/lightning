import type { QuizRecord } from '@/types/database'
import type { Quiz } from '@/stores/quiz'

export function toQuiz(record: QuizRecord): Quiz {
  return {
    quizId: record.quiz_id,
    quizSetId: record.quiz_set_id,
    order: record.order,
    imageUrl: record.image_url,
    answer: record.answer,
    preparedAiAnswer: record.prepared_ai_answer,
  }
}
