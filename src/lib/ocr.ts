import { createWorker, OEM, type Worker as TesseractWorker } from 'tesseract.js'

// jsdelivr 같은 외부 CDN에서 코어·언어 데이터를 받아오는 tesseract.js 기본 동작은 이 앱이
// 배포되는 일부 네트워크 환경에서 막혀 있을 수 있어, worker·wasm 코어·학습 데이터를
// public/tesseract에 직접 담아 같은 오리진에서 서빙한다.
let workerPromise: Promise<TesseractWorker> | null = null

function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker('kor+eng', OEM.LSTM_ONLY, {
      workerPath: './tesseract/worker.min.js',
      corePath: './tesseract/core',
      langPath: './tesseract/lang',
    }).catch((err) => {
      workerPromise = null
      throw err
    })
  }
  return workerPromise
}

/** 캡처 이미지에서 상호명·주소로 보일 만한 텍스트를 인식한다(한국어+영어 OCR) */
export async function recognizeImageText(file: File): Promise<string> {
  const worker = await getWorker()
  const { data } = await worker.recognize(file)
  return data.text
}
