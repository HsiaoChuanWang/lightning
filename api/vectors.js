import { GoogleGenerativeAI } from '@google/generative-ai'
import cors from 'cors'
import express from 'express'

const app = express()

app.use(cors())
app.use(express.json({ limit: '20mb' }))

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// 健康檢查
app.get('/', (req, res) => {
  res.status(200).send('Vectors API is running!')
})

// 取得兩段文字的向量：只回 vector1 / vector2
app.post('/api/vectors', async (req, res) => {
  const { text1, text2 } = req.body || {}

  if (!text1 || !text2) {
    return res.status(400).json({ error: '缺少 text1 或 text2' })
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'embedding-001' })

    const { embeddings } = await model.batchEmbedContents({
      requests: [
        { content: { parts: [{ text: String(text1) }] } },
        { content: { parts: [{ text: String(text2) }] } },
      ],
    })

    const vector1 = embeddings?.[0]?.values
    const vector2 = embeddings?.[1]?.values

    // 檢查 Gemini 是否回傳兩組向量。
    if (!Array.isArray(vector1) || !Array.isArray(vector2)) {
      return res.status(502).json({
        code: 'INVALID_GEMINI_PAYLOAD',
        error: 'Embedding service returned invalid data',
      })
    }

    // 只回向量，不做任何相似度計算
    return res.status(200).json({ vector1, vector2 })
  } catch (err) {
    console.error('Embedding API Error:', err)
    return res.status(500).json({ code: 'GEMINI_FAILURE', error: 'Internal Server Error' })
  }
})

export default app
