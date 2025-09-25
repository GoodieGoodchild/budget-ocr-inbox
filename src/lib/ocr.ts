import Tesseract from 'tesseract.js'

export async function ocrImage(file: File): Promise<string> {
  const { data } = await Tesseract.recognize(file, 'eng', {
    //tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/-. :RZARbalnceviPOSpurchaseeftfromto',
    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/-. ,:RZARbalnceviPOSpurchaseeftfromto',
  } as any)
  return data.text
}