export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { photoBase64, userRequest } = req.body;

    if (!photoBase64 || !userRequest) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // OpenAI API呼び出し
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `あなたは子供向け絵本作家です。ユーザーがアップロードした人物写真を分析し、その人をモデルにしたキャラクターを作成して、ユーザーのリクエストに基づいた絵本のストーリーを作成してください。

以下のJSON形式で回答してください：
{
  "title": "絵本のタイトル",
  "characterDescription": "写真の人物を基にしたキャラクターの詳細な描写（年齢、外見、服装など）",
  "pages": [
    {
      "text": "このページの文章（子供にも分かりやすい日本語で）",
      "imagePrompt": "このページの絵を生成するための英語プロンプト（キャラクターの描写を含む）"
    }
  ]
}

・絵本は3-5ページ程度にしてください
・各ページの文章は50-100文字程度にしてください
・子供が理解しやすい内容にしてください
・imagePromptは詳細で、一貫したキャラクター描写を含めてください`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `この写真の人物を主人公にして、「${userRequest}」という内容の絵本を作ってください。`
              },
              {
                type: "image_url",
                image_url: {
                  url: photoBase64
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // JSONをパース
    let storyData;
    try {
      // コードブロックがある場合は除去
      const jsonString = content.replace(/```json\n?|\n?```/g, '').trim();
      storyData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('ストーリーの解析に失敗しました');
    }

    // データ検証
    if (!storyData.title || !storyData.pages || !Array.isArray(storyData.pages)) {
      throw new Error('無効なストーリー形式です');
    }

    res.status(200).json(storyData);

  } catch (error) {
    console.error('Error generating story:', error);
    res.status(500).json({ 
      error: 'ストーリー生成に失敗しました',
      details: error.message 
    });
  }
}