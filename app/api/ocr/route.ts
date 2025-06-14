import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const base64Image = body.image;
    
    if (!base64Image) {
      return NextResponse.json(
        { success: false, message: '未提供图片数据' },
        { status: 400 }
      );
    }

    // 从base64中提取实际的图片数据
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // 使用免费的OCR API服务（OCR.space）
    const formDataForOCR = new FormData();
    formDataForOCR.append('base64Image', `data:image/png;base64,${base64Data}`);
    formDataForOCR.append('language', 'chs'); // 简体中文
    formDataForOCR.append('isOverlayRequired', 'false');
    formDataForOCR.append('detectOrientation', 'true');
    formDataForOCR.append('scale', 'true');
    formDataForOCR.append('OCREngine', '2'); // 使用引擎2，对中文支持更好
    
    // 调用OCR.space API
    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': process.env.OCR_SPACE_API_KEY || 'K87316415888957', // 免费的API Key
      },
      body: formDataForOCR,
    });
    
    if (!ocrResponse.ok) {
      throw new Error(`OCR API请求失败: ${ocrResponse.status}`);
    }
    
    const ocrResult = await ocrResponse.json();
    
    if (ocrResult.IsErroredOnProcessing) {
      throw new Error(ocrResult.ErrorMessage || 'OCR处理失败');
    }
    
    // 提取识别的文字
    const extractedText = ocrResult.ParsedResults?.[0]?.ParsedText || '';
    
    // 清理和格式化文字
    const cleanedText = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    return NextResponse.json({
      success: true,
      text: cleanedText,
      confidence: ocrResult.ParsedResults?.[0]?.TextOverlay?.Lines?.[0]?.Words?.[0]?.Confidence || 0
    });
    
  } catch (error) {
    console.error('OCR处理错误:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'OCR处理失败'
      },
      { status: 500 }
    );
  }
}