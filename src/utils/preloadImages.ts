/**
 * 在圖片出現在畫面前先由瀏覽器完成下載，讓後續 img 元素可以直接使用瀏覽器快取。
 * 單張圖片失敗時仍等待其他圖片結束，避免一張失效圖片讓遊戲流程永久停住。
 */
export async function preloadImages(imageUrls: string[]): Promise<void> {
  await Promise.allSettled(
    imageUrls.map(
      (imageUrl) =>
        new Promise<string>((resolve, reject) => {
          const image = new Image()

          image.onload = () => resolve(imageUrl)
          image.onerror = () => reject(imageUrl)
          image.src = imageUrl
        }),
    ),
  )
}
