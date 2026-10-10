import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'
import express from 'express'
import {
  fetchTrustedImage,
  ImageRequestError,
  validateImageRequest,
} from '../shared/secureImageFetch.js'

// 本機開發優先讀取不會提交至 Git 的 .env.local，若其中沒有設定才讀取 .env；
// 讓安全下載模組可以取得目前專案的 Supabase URL 與 Gemini API key。
dotenv.config({ path: ['.env.local', '.env'] })

const app = express()
const port = 3000

// 限制前端送進 API 的 JSON request body，不是圖片檔案本身。
// request body 只包含最多 2,000 字的 prompt 與 5 個圖片網址，100 KB 已足夠；
// 圖片會由伺服器另外向 Supabase Storage 下載，並在下載時套用每張 5 MB 的獨立限制。
// 讓 Express 在進入 Gemini 流程前先拒絕異常大的請求，避免記憶體被濫用。
app.use(express.json({ limit: '100kb' }))

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

// 供本機工具與 API smoke test 確認伺服器已啟動，不呼叫任何外部服務。
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.post('/api/describe-image', async (req, res) => {
  const { prompt, imageList } = req.body

  try {
    // 在呼叫 Gemini 或下載圖片前，先確認 prompt 長度、圖片數量及每個網址欄位的基本格式，
    // 避免無效或刻意放大的輸入繼續消耗 Gemini 額度與伺服器資源。
    validateImageRequest(prompt, imageList)

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
    // 轉換前會確認網址來自目前專案的 Supabase、DNS 沒有指向私人網路，
    // 並檢查下載逾時、重新導向、HTTP 狀態、圖片格式及實際檔案大小。
    for (const imageUrl of imageList) {
      const image = await fetchTrustedImage(imageUrl)

      contents.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data,
        },
      })
    }

    const result = await model.generateContent(contents)
    const responseText = result.response.text()
    let descriptions

    // 防止 Gemini 傳入非 JSON 的內容。
    try {
      descriptions = JSON.parse(responseText)
    } catch {
      return res.status(502).json({
        code: 'INVALID_GEMINI_PAYLOAD',
        error: 'Gemini returned invalid JSON',
      })
    }

    // 檢查圖片描述的數量與資料型別。
    if (
      !Array.isArray(descriptions) ||
      descriptions.length !== imageList.length ||
      !descriptions.every((description) => typeof description === 'string')
    ) {
      return res.status(502).json({
        code: 'INVALID_GEMINI_PAYLOAD',
        error: 'Gemini returned invalid image descriptions',
      })
    }

    return res.json({ descriptions })
  } catch (error) {
    // ImageRequestError 代表已預期且可安全公開的驗證錯誤，因此保留對應 HTTP 狀態與訊息；
    // 其他未知錯誤仍統一回傳 500，避免把伺服器或 Gemini 的內部資訊暴露給呼叫端。
    if (error instanceof ImageRequestError) {
      return res.status(error.statusCode).json({ error: error.message })
    }

    console.error('Gemini API Error:', error)
    return res
      .status(500)
      .json({ code: 'GEMINI_FAILURE', error: 'Describe-image Server Error' })
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
    const vectorValues1 = batchResult.embeddings?.[0]?.values
    const vectorValues2 = batchResult.embeddings?.[1]?.values

    // 檢查 Gemini 是否回傳兩組向量。
    if (!Array.isArray(vectorValues1) || !Array.isArray(vectorValues2)) {
      return res.status(502).json({
        code: 'INVALID_GEMINI_PAYLOAD',
        error: 'Embedding service returned invalid data',
      })
    }

    // 回傳向量數值
    return res.status(200).json({
      vector1: vectorValues1,
      vector2: vectorValues2,
    })
  } catch (error) {
    console.error('Embedding API Error:', error)
    return res.status(500).json({ code: 'GEMINI_FAILURE', error: 'Vectors Server Error' })
  }
})

// 啟動伺服器
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
  console.log(`圖片分析 API: http://localhost:${port}/api/describe-image`)
  console.log(`向量獲取 API: http://localhost:${port}/api/vectors`)
})
