import { Hono } from 'hono';

interface Env {
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

app.post('/image-to-serch-songs', async (c) => {
  const currentTime = Date.now();
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

  const chatGptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openAiKey}`,
    },
    body: JSON.stringify(
      {
        model: "gpt-4o",
        messages: [
          {
            role: 'user',
            content: [
              {
                type: "text",
                text: "添付した画像に合う、歌詞の無い演奏のみの曲を3曲教えてください。\
                        ただし、見つからない場合は必ず3曲教えなくても大丈夫ですが、最低1曲は必ず教えてください。\
                        また、教える際はjson形式で曲名のみ返してください。\
                        jsonは次の形式にしてください。\
                        \"song_list\" : [\
                          \"song1_name\",\
                          \"song2_name\",\
                          \"song3_name\",\
                        ]\,\
                        \"reason\" : \"これらの曲を選んだ理由。\"\
                      "
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                }
              }
            ],
          }
        ],
      }),
  });

  const chatData: any = await chatGptResponse.json();
  return c.json({ "message": chatData.choices[0].message.content });
});

app.post('/question', async (c) => {
  const currentTime = Date.now();
  const openAiKey = c.env.OPENAI_API_KEY;

  // Check for the last request time to enforce a 10-second cooldown
  if (lastRequestTime && (currentTime - lastRequestTime) < 10000) {
    return c.json({ error: '10秒以内にリクエストが送信されました。しばらくお待ちください。' }, 429);
  }

  // Update last request time
  lastRequestTime = currentTime;

  // Get the query from the request body
  const { query } = await c.req.json();

  // Validate that query is present
  if (!query) {
    return c.json({ error: 'クエリが指定されていません。' }, 400);
  }

  try {
    const chatGptResponse: any = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: 'user',
            content: query,
          }
        ],
      }),
    });

    if (!chatGptResponse.ok) {
      return c.json({ error: 'OpenAI APIリクエストに失敗しました。' }, chatGptResponse.status);
    }

    const chatData: any = await chatGptResponse.json();

    return c.json({ message: chatData.choices[0].message.content });
  } catch (error) {
    return c.json({ error: 'エラーが発生しました。再試行してください。' }, 500);
  }
});

export default app;
