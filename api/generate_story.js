// api/generate-story.js
export default async function handler(req, res) {
  // CORSヘッダーを設定
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64, userComment } = req.body;

    if (!imageBase64 || !userComment) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `この赤ちゃんの写真を見て、この子が主人公となる絵本のストーリーを作ってください。

ユーザーからのリクエスト: ${userComment}

必ず以下の形式でJSONのみを返してください。説明文や追加テキストは一切含めないでください：
{
  "title": "絵本のタイトル",
  "pages": [
    {
      "text": "1ページ目のテキスト",
      "imagePrompt": "このページの挿絵を生成するためのDALL-E用プロンプト（英語）"
    },
    {
      "text": "2ページ目のテキスト", 
      "imagePrompt": "このページの挿絵を生成するためのDALL-E用プロンプト（英語）"
    }
  ]
}

要求事項：
- 5-8ページの絵本を作成
- 赤ちゃんが主人公として活躍するストーリー
- 年齢に適した優しい内容
- 各ページのimagePromptは詳細で、一貫したアートスタイルで指定
- 主人公の外見の特徴を写真から読み取って反映 
- 日本語のテキスト
- 回答は純粋なJSONのみ`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error:', errorText);
      return res.status(response.status).json({ error: `OpenAI API Error: ${errorText}` });
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // JSONの開始と終了を見つけて抽出
    let jsonContent = content.trim();
    
    // もしコードブロックで囲まれている場合は除去
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/```json\s*/, '').replace(/```\s*$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```\s*/, '').replace(/```\s*$/, '');
    }
    
    // JSON以外のテキストを除去
    const jsonStart = jsonContent.indexOf('{');
    const jsonEnd = jsonContent.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonContent = jsonContent.substring(jsonStart, jsonEnd + 1);
    }
    
    try {
      const storyData = JSON.parse(jsonContent);
      res.status(200).json(storyData);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Content to parse:', jsonContent);
      res.status(500).json({ error: `JSONの解析に失敗しました: ${parseError.message}` });
    }

  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: error.message });
  }
}