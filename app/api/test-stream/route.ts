import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  let controllerClosed = false;
  
  const stream = new ReadableStream({
    async start(controller) {
      const safeEnqueue = (data: string) => {
        if (!controllerClosed) {
          try {
            controller.enqueue(encoder.encode(data));
          } catch (error) {
            console.error('Test Stream Enqueue error:', error);
          }
        }
      };
      
      const safeClose = () => {
        if (!controllerClosed) {
          controllerClosed = true;
          try {
            controller.close();
          } catch (error) {
            console.error('Test Stream Close error:', error);
          }
        }
      };
      
      try {
        // 发送初始化信号
        safeEnqueue(`data: {"type": "init", "content": ""}\n\n`);
        
        // 模拟流式内容
        const testContent = [
          "这是", "一个", "测试", "的", "流式", "传输", "内容",
          "每个", "词语", "都会", "逐步", "显示", "出来"
        ];
        
        for (let i = 0; i < testContent.length; i++) {
          if (controllerClosed) break;
          
          await new Promise(resolve => setTimeout(resolve, 200)); // 延迟200ms
          const content = testContent[i] + (i < testContent.length - 1 ? "" : "。");
          safeEnqueue(`data: ${JSON.stringify({ content })}\n\n`);
        }
        
        // 发送完成信号
        safeEnqueue('data: [DONE]\n\n');
        
      } catch (error) {
        console.error('Test Stream error:', error);
        safeEnqueue(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      } finally {
        safeClose();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}