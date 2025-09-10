export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, characterDescription } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    // プロンプトを組み合わせて完全な画像生成用プロンプトを作成
    const fullPrompt = `${prompt}. Character: ${characterDescription}. Style: children's book illustration, warm colors, friendly atmosphere, digital art, high quality`;

    // OpenAI DALL-E API呼び出し
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: fullPrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "vivid"
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      throw new Error('画像が生成されませんでした');
    }

    res.status(200).json({
      imageUrl: data.data[0].url
    });

  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ 
      error: '画像生成に失敗しました',
      details: error.message 
    });
  }
}