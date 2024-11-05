import { Hono } from 'hono';

interface Env {
  GOOGLE_CLOUD_VISION_API_KEY: string;
  OPENAI_API_KEY: string;
}

const app = new Hono<{ Bindings: Env }>();

let lastRequestTime: number | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

app.post('/describe-image', async (c) => {
  const currentTime = Date.now();
  const googleApiKey = c.env.GOOGLE_CLOUD_VISION_API_KEY;
  const openAiKey = c.env.OPENAI_API_KEY;

  // Check for the last request time
  if (lastRequestTime && (currentTime - lastRequestTime) < 10000) {
    return c.json({ error: '10秒以内にリクエストが送信されました。しばらくお待ちください。' }, 429);
  }

  // Update last request time
  lastRequestTime = currentTime;

  const formData = await c.req.parseBody();
  const file = formData.file as Blob;

  if (!file) {
    return c.json({ error: '画像ファイルが見つかりません' }, 400);
  }

  const arrayBuffer = await file.arrayBuffer();
  const imageBase64 = arrayBufferToBase64(arrayBuffer);

  const visionResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [
        {
          image: { content: imageBase64 },
          features: [{ type: 'LABEL_DETECTION' }, { type: 'TEXT_DETECTION' }],
        },
      ],
    }),
  });

  const visionData = await visionResponse.json();
  console.log('Google Vision API response:', visionData);

  if (!visionResponse.ok) {
    return c.json({ error: 'Google Vision API リクエストが失敗しました', details: visionData }, visionResponse.status);
  }

  if (!visionData.responses || !visionData.responses.length) {
    return c.json({ error: 'Google Vision API から有効なレスポンスが返されませんでした', details: visionData }, 500);
  }

  const description = visionData.responses[0]?.labelAnnotations?.map((label: any) => label.description).join(', ') || 'No description available';
  console.log('Image description:', description);

  const chatGptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openAiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: 'user', content: `「${description}」に合う歌詞の無い曲を3曲教えてください。json形式で曲名のみ返してください。` }],
    }),
  });

  const chatData: any = await chatGptResponse.json();
  return c.json({ "message": chatData.choices[0].message.content });
});

export default app;
