import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

// 圖片描述 API 的資源上限集中放在這裡，確保 Vercel API 與本機開發伺服器使用相同行為：
// 單次最多 5 張、單張最多 5 MB、下載最多等待 5 秒、prompt 最多 2,000 字，
// 並只接受 Gemini 可處理且本專案會使用的 JPEG、PNG 與 WebP。
const MAX_IMAGE_COUNT = 5
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const IMAGE_FETCH_TIMEOUT_MS = 5000
const MAX_PROMPT_LENGTH = 2000
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export class ImageRequestError extends Error {
  constructor(message, statusCode) {
    super(message)
    this.name = 'ImageRequestError'
    this.statusCode = statusCode
  }
}

// 圖片只能來自目前專案的 Supabase。將 VITE_SUPABASE_URL 正規化成 origin
//（protocol + host + port），後續會用完全相同比對，避免接受名稱相似的惡意網域。
function getSupabaseOrigin() {
  try {
    const supabaseUrl = new URL(process.env.VITE_SUPABASE_URL)
    return supabaseUrl.protocol === 'https:' ? supabaseUrl.origin : null
  } catch {
    return null
  }
}

// 400 Bad Request: 表示傳入的資料格式不正確或缺少必要資料
// 413 Content Too Large: 表示傳入的內容超過 API 設定的容量或數量限制
// 只檢查 JSON 欄位本身，不進行任何網路請求
// 先拒絕空白 or 過長 prompt、空陣列、超過 5 張圖片及非字串網址
// 避免無效資料進入後續 DNS、圖片下載與 Gemini 呼叫流程
export function validateImageRequest(prompt, imageList) {
  if (typeof prompt !== 'string' || !prompt.trim()) {
    throw new ImageRequestError('prompt is required', 400)
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new ImageRequestError(`prompt must not exceed ${MAX_PROMPT_LENGTH} characters`, 413)
  }

  if (!Array.isArray(imageList) || imageList.length === 0) {
    throw new ImageRequestError('imageList must contain at least one image', 400)
  }

  if (imageList.length > MAX_IMAGE_COUNT) {
    throw new ImageRequestError(
      `imageList must not contain more than ${MAX_IMAGE_COUNT} images`,
      413,
    )
  }

  if (imageList.some((imageUrl) => typeof imageUrl !== 'string' || !imageUrl.trim())) {
    throw new ImageRequestError('Every image URL must be a non-empty string', 400)
  }
}

function validateImageUrl(imageUrl) {
  let url

  try {
    url = new URL(imageUrl)
  } catch {
    throw new ImageRequestError('Invalid image URL', 400)
  }

  // 圖片只能使用 HTTPS，避免傳輸內容被竄改；也不接受 user:password@host 形式的網址，
  // 避免混淆實際主機名稱，或不慎把帳密送到外部服務。
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new ImageRequestError('Image URLs must use HTTPS', 400)
  }

  const supabaseOrigin = getSupabaseOrigin()
  if (!supabaseOrigin) {
    throw new ImageRequestError('Supabase image origin is not configured', 500)
  }

  // 網址的 origin 必須與 VITE_SUPABASE_URL 完全一致。
  // 僅允許 https://abc.supabase.co，不允許 https://abc.supabase.co.attacker.example 這類外觀看似相同的網域。
  if (url.origin !== supabaseOrigin) {
    throw new ImageRequestError('Image URL must use the configured Supabase origin', 400)
  }

  return url
}

function isPrivateIpAddress(address) {
  // DNS 可能回傳 IPv4(四組十進位數字，數量有限)、IPv6(十六進位格式，可提供更多地址)，或以 IPv6 形式包裝的 IPv4。
  // 此函式回傳 true 代表該位址不應由公開圖片 API 存取；回傳 false 才視為公開位址。
  const normalizedAddress = address.toLowerCase()

  // ::ffff:192.168.0.1 是「IPv4-mapped IPv6」，真正的目標仍是 192.168.0.1。
  // 移除 ::ffff: 後再次檢查，避免攻擊者只改變表示方式就繞過 IPv4 私人網段判斷。
  if (normalizedAddress.startsWith('::ffff:')) {
    return isPrivateIpAddress(normalizedAddress.slice(7))
  }

  if (isIP(normalizedAddress) === 6) {
    // :: 是 IPv6 的未指定位置，類似 IPv4 的 0.0.0.0，不能作為公開圖片來源。
    const isUnspecifiedAddress = normalizedAddress === '::'

    // ::1 是 IPv6 loopback，類似 IPv4 的 127.0.0.1，代表 API 伺服器自己。
    const isLoopbackAddress = normalizedAddress === '::1'

    // fc00::/7 是 IPv6 unique local address，作用類似 10.x.x.x 或 192.168.x.x 私人網段。
    // 其開頭可能是 fc 或 fd，兩種都必須阻擋。
    const isUniqueLocalAddress =
      normalizedAddress.startsWith('fc') || normalizedAddress.startsWith('fd')

    // fe80::/10 是 IPv6 link-local address，只能在同一個區域網路連線。
    // /10 對應開頭 fe8、fe9、fea、feb，所以使用正規表示式一次判斷。
    const isLinkLocalAddress = /^fe[89ab]/.test(normalizedAddress)

    return isUnspecifiedAddress || isLoopbackAddress || isUniqueLocalAddress || isLinkLocalAddress
  }

  // IPv4 由四段 0～255 的數字組成，例如 192.168.1.10。
  // DNS 若回傳無法解析成四段整數的內容，採取安全預設：直接視為不安全並拒絕。
  const octets = normalizedAddress.split('.').map(Number)
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) return true

  const [firstOctet, secondOctet] = octets

  // 0.0.0.0/8：目前網路或未指定位置，不能作為公開圖片伺服器。
  const isUnspecifiedAddress = firstOctet === 0

  // 10.0.0.0/8：大型私人網段，常見於公司或雲端內部網路。
  const isPrivateClassA = firstOctet === 10

  // 127.0.0.0/8：loopback，代表執行 API 的伺服器自己，例如 127.0.0.1。
  const isLoopbackAddress = firstOctet === 127

  // 100.64.0.0/10：電信商級 NAT（CGNAT）使用的共享位址，不屬於一般公開主機。
  const isCarrierGradeNat = firstOctet === 100 && secondOctet >= 64 && secondOctet <= 127

  // 169.254.0.0/16：link-local 位址；雲端環境也可能在此網段提供內部 metadata。
  const isLinkLocalAddress = firstOctet === 169 && secondOctet === 254

  // 172.16.0.0/12：私人網段，範圍是 172.16.x.x 到 172.31.x.x。
  const isPrivateClassB = firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31

  // 192.168.0.0/16：私人網段，家用路由器與區域網路最常使用。
  const isPrivateClassC = firstOctet === 192 && secondOctet === 168

  // 198.18.0.0/15：網路設備效能測試保留範圍，不應出現在公開圖片來源。
  const isBenchmarkAddress = firstOctet === 198 && (secondOctet === 18 || secondOctet === 19)

  // 224.0.0.0 以上包含 multicast 與其他保留位址，不是一般可公開連線的單一主機。
  const isMulticastOrReservedAddress = firstOctet >= 224

  return (
    isUnspecifiedAddress ||
    isPrivateClassA ||
    isLoopbackAddress ||
    isCarrierGradeNat ||
    isLinkLocalAddress ||
    isPrivateClassB ||
    isPrivateClassC ||
    isBenchmarkAddress ||
    isMulticastOrReservedAddress
  )
}

async function assertPublicHostname(hostname) {
  let resolvedAddresses

  try {
    // lookup() 向 DNS 查詢 hostname 實際對應的 IP，例如把 abc.supabase.co
    // 解析成 [{ address: '104.x.x.x', family: 4 }]；後端最後是連到這些 IP，而不是文字網域。
    // all: true 表示取得該網域的所有 IPv4／IPv6 結果，不只檢查第一個結果。
    // verbatim: true 表示保留 DNS 回傳順序；安全判斷會逐一檢查，因此不依賴排序。
    resolvedAddresses = await lookup(hostname, { all: true, verbatim: true })
  } catch {
    // DNS 查詢失敗可能是網域不存在、DNS 暫時無法使用或網路異常。
    // 此時伺服器不知道真正的連線目標，因此停止下載；502 表示上游圖片來源無法取得。
    throw new ImageRequestError('Unable to resolve image host', 502)
  }

  // 沒有解析結果代表目前沒有可確認且可連線的 IP，不能繼續下載。
  if (resolvedAddresses.length === 0) {
    throw new ImageRequestError('Image host did not resolve to an IP address', 502)
  }

  // 一個網域可能同時解析成多個 IP
  // 只要其中任何一個是本機、私人或保留位址就拒絕，因為實際建立連線時未必會使用第一個 IP，不能只驗證部分結果。
  const resolvesToPrivateAddress = resolvedAddresses.some(({ address }) =>
    isPrivateIpAddress(address),
  )

  // 避免 Supabase 網域設定異常，或 DNS 被利用而指向 API 伺服器的內部網路，
  // 使公開使用者間接要求後端讀取 localhost、路由器或雲端內部服務。
  if (resolvesToPrivateAddress) {
    throw new ImageRequestError('Image URL resolves to a private address', 400)
  }
}

export async function fetchTrustedImage(imageUrl) {
  // 必須先確認 URL 屬於目前的 Supabase 並完成 DNS 檢查，才會開始下載。
  const url = validateImageUrl(imageUrl)
  await assertPublicHostname(url.hostname)
  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort(), IMAGE_FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      // fetch 預設會跟隨 redirect；這裡明確禁止，避免已通過驗證的 Supabase URL
      // 再以 3xx 導向未經 Supabase origin 與 DNS 檢查的內網或第三方主機。
      redirect: 'error',
      signal: abortController.signal,
    })

    if (!response.ok) {
      throw new ImageRequestError('Unable to download image', 502)
    }

    // 不相信副檔名，而是讀取伺服器回傳的 Content-Type；只接受 JPEG、PNG 與 WebP，
    // 避免把 HTML、JSON 或其他非圖片內容轉成 base64 後送進 Gemini。
    const mimeType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
    if (!mimeType || !ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
      throw new ImageRequestError('Unsupported image content type', 415)
    }

    // Content-Length 是下載前可取得的快速檢查；若已宣告超過 5 MB，就不讀取 response body。
    // 但這個 header 可能缺少或不正確，因此下面仍會依實際收到的 bytes 再檢查一次。
    const contentLength = Number(response.headers.get('content-length'))
    if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
      throw new ImageRequestError('Image exceeds the 5 MB size limit', 413)
    }

    if (!response.body) {
      throw new ImageRequestError('Image response has no body', 502)
    }

    // 逐段讀取 response body 並累計實際 bytes；一旦超過 5 MB 就立刻取消串流，
    // 避免使用 arrayBuffer() 一次把未知大小的內容全部載入伺服器記憶體。
    const reader = response.body.getReader()
    const chunks = []
    let totalBytes = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      totalBytes += value.byteLength
      if (totalBytes > MAX_IMAGE_BYTES) {
        await reader.cancel()
        throw new ImageRequestError('Image exceeds the 5 MB size limit', 413)
      }
      chunks.push(Buffer.from(value))
    }

    return {
      data: Buffer.concat(chunks).toString('base64'),
      mimeType,
    }
  } catch (error) {
    if (error instanceof ImageRequestError) throw error
    if (error?.name === 'AbortError') {
      throw new ImageRequestError('Image download timed out', 504)
    }
    throw new ImageRequestError('Unable to download image', 502)
  } finally {
    // 無論下載成功、驗證失敗或逾時都清除計時器，避免 request 結束後仍留下 callback。
    clearTimeout(timeoutId)
  }
}
