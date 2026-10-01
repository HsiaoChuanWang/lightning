import { GoogleGenerativeAI } from '@google/generative-ai'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'

dotenv.config()

const app = express()
const port = 3000

app.use(cors())
app.use(express.json({ limit: '20mb' })) // 避免 PayloadTooLargeError

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

app.post('/api/describe-image', async (req, res) => {
  const { prompt, imageList } = req.body

  if (!prompt || !Array.isArray(imageList) || imageList.length === 0) {
    return res.status(400).json({ error: '缺少 prompt 或 imageList' })
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-lite',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'ARRAY',
          items: {
            type: 'STRING',
          },
        },
      },
    })

    // 建立 contents 陣列，先放文字 prompt
    const contents = [{ text: prompt }]

    // 每張圖片都轉成 inlineData
    for (const imgUrl of imageList) {
      const response = await fetch(imgUrl)
      const imageArrayBuffer = await response.arrayBuffer()
      const base64ImageData = Buffer.from(imageArrayBuffer).toString('base64')

      contents.push({
        inlineData: {
          mimeType: 'image/jpeg', // 或 'image/png'
          data: base64ImageData,
        },
      })
    }

    const result = await model.generateContent(contents)
    const text = result.response.text()

    res.json({ text })
  } catch (err) {
    console.error('Gemini API Error:', err)
    res.status(500).json({ error: 'Describe-image Server Error' })
  }
})

/**
 * 文字向量獲取功能
 * 此 API 接收兩個文字，並使用 embedding-001 模型將其轉換為向量。
 * 現在使用 batchEmbedContents 將多個請求合併為單一 API 呼叫。
 */
app.post('/api/vectors', async (req, res) => {
  const { text1, text2 } = req.body

  if (!text1 || !text2) {
    return res.status(400).json({ error: '缺少 text1 或 text2' })
  }

  try {
    // 獲取嵌入模型
    const embeddingModel = genAI.getGenerativeModel({ model: 'embedding-001' })

    // **這是新的改動：使用 batchEmbedContents**
    // 這樣可以將兩個內容的嵌入任務打包成一個 API 請求
    const batchResult = await embeddingModel.batchEmbedContents({
      requests: [
        { content: { parts: [{ text: text1 }] } },
        { content: { parts: [{ text: text2 }] } },
      ],
    })

    // 從批次回應中提取向量數值
    const vectorValues1 = batchResult.embeddings[0].values
    const vectorValues2 = batchResult.embeddings[1].values

    // 回傳向量數值
    return res.status(200).json({
      vector1: vectorValues1,
      vector2: vectorValues2,
    })
  } catch (err) {
    console.error('Embedding API Error:', err)
    return res.status(500).json({ error: 'Vectors Server Error' })
  }
})

// 啟動伺服器
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
  console.log(`圖片分析 API: http://localhost:${port}/api/describe-image`)
  console.log(`向量獲取 API: http://localhost:${port}/api/vectors`)
})
