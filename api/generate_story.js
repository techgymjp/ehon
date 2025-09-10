export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { characterDescription, userRequest } = req.body;

  if (!characterDescription || !userRequest) {
    return res.status(400).json({ error: 'キャラクター設定とリクエストが必要です' });
  }

  // フォールバック用のストーリー生成関数
  function createFallbackStory(characterDescription, userRequest) {
    return {
      title: "赤ちゃんの大冒険",
      pages: [
        {
          pageNumber: 1,
          text: "可愛い赤ちゃんが今日も元気いっぱいです。",
          imagePrompt: `A cute baby character based on: ${characterDescription}. Happy and energetic, children's book illustration style.`
        },
        {
          pageNumber: 2,
          text: "赤ちゃんはお外に出て、素敵な冒険を始めました。",
          imagePrompt: `A cute baby character based on: ${characterDescription}. Walking outside, starting an adventure, children's book illustration style.`
        },
        {
          pageNumber: 3,
          text: "途中で優しい動物たちに出会いました。",
          imagePrompt: `A cute baby character based on: ${characterDescription}. Meeting friendly animals, warm and gentle scene, children's book illustration style.`
        },
        {
          pageNumber: 4,
          text: "みんなで一緒に楽しく遊びました。",
          imagePrompt: `A cute baby character based on: ${characterDescription}. Playing with animal friends, joyful scene, children's book illustration style.`
        },
        {
          pageNumber: 5,
          text: "たくさん遊んだ後は、みんなでお昼寝の時間です。",
          imagePrompt: `A cute baby character based on: ${characterDescription}. Nap time with animal friends, peaceful and cozy scene, children's book illustration style.`
        },
        {
          pageNumber: 6,
          text: "今日も楽しい一日でした。また明日も冒険しようね！",
          imagePrompt: `A cute baby character based on: ${characterDescription}. Happy ending, waving goodbye, warm sunset, children's book illustration style.`
        }
      ]
    };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "あなたは子供向け絵本の作家です。必ず指定されたJSON形式でレスポンスを返してください。JSON形式以外の文章は一切含めないでください。"
          },
          {
            role: "user",
            content: `以下のキャラクター設定の赤ちゃんが主人公の絵本を作成してください。

キャラクター設定: ${characterDescription}

ユーザーリクエスト: ${userRequest}

必ず以下のJSON形式のみで6ページの絵本を作成してください。他の文章は一切含めないでください：

{
  "title": "絵本のタイトル",
  "pages": [
    {
      "pageNumber": 1,
      "text": "このページの文章",
      "imagePrompt": "このページの画像生成用の英語プロンプト（キャラクターの特徴を含む）"
    },
    {
      "pageNumber": 2,
      "text": "このページの文章",
      "imagePrompt": "このページの画像生成用の英語プロンプト（キャラクターの特徴を含む）"
    },
    {
      "pageNumber": 3,
      "text": "このページの文章", 
      "imagePrompt": "このページの画像生成用の英語プロンプト（キャラクターの特徴を含む）"
    },
    {
      "pageNumber": 4,
      "text": "このページの文章",
      "imagePrompt": "このページの画像生成用の英語プロンプト（キャラクターの特徴を含む）"
    },
    {
      "pageNumber": 5,
      "text": "このページの文章",
      "imagePrompt": "このページの画像生成用の英語プロンプト（キャラクターの特徴を含む）"
    },
    {
      "pageNumber": 6,
      "text": "このページの文章",
      "imagePrompt": "このページの画像生成用の英語プロンプト（キャラクターの特徴を含む）"
    }
  ]
}

条件：
- 各ページは子供向けの優しい内容
- 文章は読みやすく、温かみのある内容
- 画像プロンプトは英語で、キャラクターの特徴を正確に含める
- 一貫したストーリーライン`
          }
        ],
        max_tokens: 2500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      console.error('OpenAI API Error:', response.status);
      // APIエラーの場合はフォールバックストーリーを返す
      const fallbackStory = createFallbackStory(characterDescription, userRequest);
      return res.status(200).json({ story: fallbackStory });
    }

    const data = await response.json();
    const storyText = data.choices[0].message.content.trim();
    
    console.log('APIからのレスポンス:', storyText);
    
    // JSONの前後にあるかもしれない余分な文字を削除
    let cleanedStoryText = storyText;
    const jsonStart = cleanedStoryText.indexOf('{');
    const jsonEnd = cleanedStoryText.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanedStoryText = cleanedStoryText.substring(jsonStart, jsonEnd + 1);
    }
    
    try {
      const parsedStory = JSON.parse(cleanedStoryText);
      
      // データ構造の検証
      if (!parsedStory.title || !parsedStory.pages || !Array.isArray(parsedStory.pages)) {
        throw new Error('不正なストーリー構造');
      }
      
      res.status(200).json({ story: parsedStory });
    } catch (parseError) {
      console.error('JSON解析エラー:', parseError);
      console.error('解析しようとしたテキスト:', cleanedStoryText);
      
      // JSON解析に失敗した場合はフォールバックストーリーを返す
      const fallbackStory = createFallbackStory(characterDescription, userRequest);
      res.status(200).json({ story: fallbackStory });
    }

  } catch (error) {
    console.error('Error generating story:', error);
    
    // エラーが発生した場合もフォールバックストーリーを返す
    const fallbackStory = createFallbackStory(characterDescription, userRequest);
    res.status(200).json({ story: fallbackStory });
  }
}