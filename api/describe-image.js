// describe-image.js
import { GoogleGenerativeAI } from '@google/generative-ai'
import express from 'express'
import {
  fetchTrustedImage,
  ImageRequestError,
  validateImageRequest,
} from '../shared/secureImageFetch.js'

const app = express()

// 這裡限制的是前端送進 API 的 JSON request body，不是圖片檔案本身。
// request body 只包含最多 2,000 字的 prompt 與 5 個圖片網址，100 KB 已足夠；
// 圖片會由伺服器另外向 Supabase Storage 下載，並在下載時套用每張 5 MB 的獨立限制。
// 可讓 Express 在進入 Gemini 流程前先拒絕異常大的請求，避免記憶體被濫用。
app.use(express.json({ limit: '100kb' }))

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

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
    return res.status(500).json({ code: 'GEMINI_FAILURE', error: 'Something went wrong' })
  }
})

// Vercel 伺服器less 函數不需要 app.listen()
// 相反地，我們需要匯出這個 Express 應用程式

export default app
