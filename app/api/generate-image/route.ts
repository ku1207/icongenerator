import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// êµ¬ì¡°?”ëœ ?„ë¡¬?„íŠ¸ ?ì„±???„í•œ ?¬í¼ ?¨ìˆ˜
async function generateStructuredPrompt(userPrompt: string, type: 'generation' | 'modification' | 'combination', baseImage?: string, baseImages?: string[]): Promise<string> {
  try {
    // ?´ë?ì§€ ë³€ê²?ê²°í•© ëª¨ë“œ?ì„œ??ë¨¼ì? ?´ë?ì§€ë¥?ë¶„ì„
    let imageAnalysis = '';
    
    if (type === 'modification' && baseImage) {
      // ?¨ì¼ ?´ë?ì§€ ë¶„ì„ (?´ë?ì§€ ë³€ê²?
      imageAnalysis = await analyzeImageForModification(baseImage);
    } else if (type === 'combination' && baseImages && baseImages.length > 0) {
      // ?¤ì¤‘ ?´ë?ì§€ ë¶„ì„ (?´ë?ì§€ ê²°í•©)
      imageAnalysis = await analyzeImagesForCombination(baseImages);
    }

    let systemPrompt = '';
    
    if (type === 'generation') {
      systemPrompt = `###ì§€?œì‚¬??
?„ë˜ ?•ë³´?¤ì„ ê¸°ë°˜?¼ë¡œ ?´ë?ì§€ ?ì„± ?„ë¡¬?„íŠ¸ë¥?ê¸°ì…?˜ì‹­?œì˜¤.

###?‘ì„±ì§€ì¹?
1. ?„ì²´ êµ¬ì¡°
 - ê²°ê³¼???œìˆ˜ JSON(UTF-8) ë§?ì¶œë ¥?©ë‹ˆ??
 - JSON ?¸ì˜ ë¬¸ì¥Â·?¤ëª…Â·ì£¼ì„?€ ?ˆë? ì¶œë ¥?˜ì? ë§ˆì‹­?œì˜¤.
 - ìµœìƒ???¤ëŠ” **imagePrompt**ë§?ì¡´ì¬?©ë‹ˆ??

2. ?‘ì„± ê·œì¹™
 - ê°€??ë¨¼ì? **ì£¼ì œ???¥ë©´**??ëª…í™•???œìˆ ?˜ì‹­?œì˜¤. (?? "?°ì£¼ë¥??¬í–‰?˜ëŠ” ê³ ì–‘??)
 - **?¤í??¼ì´???”í’**??êµ¬ì²´?ìœ¼ë¡?ì§€?•í•˜??‹œ?? (?? "ì§€ë¸Œë¦¬ ?¤í???, "ê³ í ??? í™”")
 - **êµ¬ë„???œì ** ?•ë³´ë¥??¬í•¨?˜ì‹­?œì˜¤. (?? "ë¡œìš° ?µê?", "?‘ë·°", "?€ë°”ë”” ?? ??
 - **ì¡°ëª…, ?‰ê°, ë°°ê²½** ?”ì†Œë¥???ë¬¸ì¥?¼ë¡œ ?”ì•½?˜ì‹­?œì˜¤. (?? "?°ëœ»???¸ì„ë¹?ì¡°ëª…, ?ŒìŠ¤?”í†¤, ????¸ ë§ˆì„")
 - **?”í…Œ???˜ì? ë°??¬ì§ˆê°?*???¤ëª…?˜ì‹­?œì˜¤. (?? "?˜ì´?¼ë¦¬?¼í•œ 8K ì§ˆê°", "ë§¤ë„?¬ìš´ ê¸ˆì† ?œë©´")
 - **ê°ì •Â·ë¶„ìœ„ê¸°Â·ìŠ¤? ë¦¬??*???œëŸ¬?˜ëŠ” ?•ìš©?¬ë? ?¬í•¨?˜ì‹­?œì˜¤. (?? "ëª½í™˜?ì´ê³??‰í™”ë¡œìš´", "ê¸´ì¥ê°??„ëŠ” ?”ìŠ¤? í”¼??)
 - **?œì™¸?˜ê³  ?¶ì? ?”ì†Œ**??ë¶€???„ë¡¬?„íŠ¸ë¡??°ë¡œ ?ìœ¼??‹œ?? (?? "???Œí„°ë§ˆí¬, ???œê³¡")
 - ëª¨ë“  ?”ì†Œ???¼í‘œ(,)ë¡?êµ¬ë¶„??ê°„ê²°??ëª…ì‚¬êµ¬ë¡œ êµ¬ì„±?˜ì‹­?œì˜¤.
 - ?°ì„ ?œìœ„ê°€ ?’ì? ?µì‹¬ ?”ì†Œ??ë¬¸ì¥ ?ì— ë°°ì¹˜?˜ì‹­?œì˜¤.

###ì¶œë ¥?•íƒœ
{
  "imagePrompt": "<imageprompt>"
}

###ê¸°ì¡´ ?„ë¡¬?„íŠ¸
${userPrompt}`;
    } else if (type === 'modification') {
      systemPrompt = `###ì§€?œì‚¬??
?…ë¡œ?œëœ ?´ë?ì§€ë¥?ë¶„ì„??ê²°ê³¼?€ ?¬ìš©?ì˜ ë³€ê²??”ì²­??ë°”íƒ•?¼ë¡œ ?•êµ???´ë?ì§€ ë³€ê²??„ë¡¬?„íŠ¸ë¥??ì„±?˜ì‹­?œì˜¤.

###?´ë?ì§€ ë¶„ì„ ê²°ê³¼
${imageAnalysis}

###?‘ì„±ì§€ì¹?
1. ?„ì²´ êµ¬ì¡°
 - ê²°ê³¼???œìˆ˜ JSON(UTF-8) ë§?ì¶œë ¥?©ë‹ˆ??
 - JSON ?¸ì˜ ë¬¸ì¥Â·?¤ëª…Â·ì£¼ì„?€ ?ˆë? ì¶œë ¥?˜ì? ë§ˆì‹­?œì˜¤.
 - ìµœìƒ???¤ëŠ” **imagePrompt**ë§?ì¡´ì¬?©ë‹ˆ??

2. ?‘ì„± ê·œì¹™
 - **? ì????”ì†Œ**: ?´ë?ì§€ ë¶„ì„ ê²°ê³¼?ì„œ ë³€ê²??”ì²­ê³?ê´€???†ëŠ” ëª¨ë“  ?”ì†Œ?¤ì„ ëª…ì‹œ?ìœ¼ë¡?ë³´ì¡´?˜ë„ë¡?ì§€??
 - **ë³€ê²½í•  ?”ì†Œ**: ?¬ìš©?ê? ?”ì²­??ë³€ê²??¬í•­ë§?êµ¬ì²´?ìœ¼ë¡??ìš©
 - **êµ¬ì¡° ë³´ì¡´**: ê¸°ì¡´ ?´ë?ì§€???„ì²´?ì¸ êµ¬ë„, ë¹„ìœ¨, ?ˆì´?„ì›ƒ?€ ìµœë???? ì?
 - **?ì—°?¤ëŸ¬???µí•©**: ë³€ê²½ëœ ë¶€ë¶„ì´ ê¸°ì¡´ ?”ì†Œ?¤ê³¼ ?ì—°?¤ëŸ½ê²??´ìš°?¬ì??„ë¡ ì²˜ë¦¬
 - ?„ë¡¬?„íŠ¸??"ê¸°ì¡´ ?´ë?ì§€?ì„œ [? ì????”ì†Œ???€ ê·¸ë?ë¡?? ì??˜ë©´?? [ë³€ê²½í•  ?”ì†Œ]ë§?[ë³€ê²??´ìš©]?¼ë¡œ ?˜ì •" ?•íƒœë¡?êµ¬ì„±

###ì¶œë ¥?•íƒœ
{
  "imagePrompt": "<imageprompt>"
}

###ë³€ê²??”ì²­
${userPrompt}`;
    } else if (type === 'combination') {
      const imageCount = baseImages?.length || 0;
      systemPrompt = `###ì§€?œì‚¬??
?…ë¡œ?œëœ ${imageCount}ê°??´ë?ì§€?¤ì„ ë¶„ì„??ê²°ê³¼?€ ?¬ìš©?ì˜ ?©ì„± ?”ì²­??ë°”íƒ•?¼ë¡œ ?ì—°?¤ëŸ¬???´ë?ì§€ ê²°í•© ?„ë¡¬?„íŠ¸ë¥??ì„±?˜ì‹­?œì˜¤.

###?´ë?ì§€ ë¶„ì„ ê²°ê³¼
${imageAnalysis}

###?‘ì„±ì§€ì¹?
1. ?„ì²´ êµ¬ì¡°
 - ê²°ê³¼???œìˆ˜ JSON(UTF-8) ë§?ì¶œë ¥?©ë‹ˆ??
 - JSON ?¸ì˜ ë¬¸ì¥Â·?¤ëª…Â·ì£¼ì„?€ ?ˆë? ì¶œë ¥?˜ì? ë§ˆì‹­?œì˜¤.
 - ìµœìƒ???¤ëŠ” **imagePrompt**ë§?ì¡´ì¬?©ë‹ˆ??

2. ?‘ì„± ê·œì¹™
 - **ê°??´ë?ì§€???µì‹¬ ?”ì†Œ**: ë¶„ì„ ê²°ê³¼?ì„œ ê°??´ë?ì§€???¹ì§•?ì¸ ?”ì†Œ?¤ì„ ì¶”ì¶œ
 - **?©ì„± ë°©ì‹**: ?¬ìš©???”ì²­???°ë¼ ?´ë–¤ ?”ì†Œë¥??´ë–»ê²?ê²°í•©? ì? ëª…ì‹œ
 - **ì¡°í™”ë¡œìš´ ?µí•©**: ?œë¡œ ?¤ë¥¸ ?´ë?ì§€???”ì†Œ?¤ì´ ?ì—°?¤ëŸ½ê²??´ìš°?¬ì????¥ë©´ êµ¬ì„±
 - **?¤í????µì¼**: ìµœì¢… ?´ë?ì§€???¼ê????¤í??¼ê³¼ ë¶„ìœ„ê¸??¤ì •
 - ?„ë¡¬?„íŠ¸??"?´ë?ì§€1??[?”ì†Œ], ?´ë?ì§€2??[?”ì†Œ]ë¥?[?©ì„± ë°©ì‹]?¼ë¡œ ê²°í•©?˜ì—¬ [ìµœì¢… ?¥ë©´] ?ì„±" ?•íƒœë¡?êµ¬ì„±

###ì¶œë ¥?•íƒœ
{
  "imagePrompt": "<imageprompt>"
}

###ê²°í•© ?”ì²­
${userPrompt}`;
    }

    const messages = [];
    
    if (baseImage && type === 'modification') {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: systemPrompt },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${baseImage}`,
              detail: "high"
            },
          },
        ],
      });
    } else if (baseImages && type === 'combination') {
      // ?´ë?ì§€ ê²°í•©??ê²½ìš° ëª¨ë“  ?´ë?ì§€ë¥??¬í•¨
      const imageContent = baseImages.map(image => ({
        type: "image_url" as const,
        image_url: {
          url: `data:image/jpeg;base64,${image}`,
          detail: "high" as const
        },
      }));
      
      messages.push({
        role: "user",
        content: [
          { type: "text", text: systemPrompt },
          ...imageContent
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: systemPrompt
      });
    }

    // ìµœì‹  GPT-4 ëª¨ë¸ ?¬ìš© (gpt-4-vision-preview ?€??
    const response = await openai.chat.completions.create({
      model: "gpt-4o",  // ìµœì‹  ëª¨ë¸ ?¬ìš©
      messages: messages as any,
      max_tokens: 800,
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (content) {
      try {
        // ì½”ë“œ ë¸”ë¡ ?œê±° ë°?JSON ?Œì‹±
        let cleanContent = content.trim();
        
        // ```json?¼ë¡œ ?œì‘?˜ê³  ```ë¡??ë‚˜??ê²½ìš° ?œê±°
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        const parsed = JSON.parse(cleanContent);
        return parsed.imagePrompt || userPrompt;
      } catch (parseError) {
        console.error('JSON ?Œì‹± ?¤íŒ¨:', parseError);
        console.error('?ë³¸ ?‘ë‹µ:', content);
        return userPrompt;
      }
    }
    
    return userPrompt;
  } catch (error) {
    console.error('êµ¬ì¡°?”ëœ ?„ë¡¬?„íŠ¸ ?ì„± ?¤íŒ¨:', error);
    return userPrompt;
  }
}

// ?¨ì¼ ?´ë?ì§€ ë¶„ì„ ?¨ìˆ˜ (?´ë?ì§€ ë³€ê²½ìš©)
async function analyzeImageForModification(base64Image: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `???´ë?ì§€ë¥??ì„¸??ë¶„ì„?˜ì—¬ ?¤ìŒ ?•ë³´ë¥??œê³µ?´ì£¼?¸ìš”:

1. **ì£¼ìš” ê°ì²´/?¸ë¬¼**: ?´ë?ì§€???µì‹¬???˜ëŠ” ?€?ë“¤
2. **ë°°ê²½ ?˜ê²½**: ë°°ê²½??ì¢…ë¥˜, ?¤ì •, ë¶„ìœ„ê¸?
3. **?‰ìƒ ?”ë ˆ??*: ì£¼ìš” ?‰ìƒ?¤ê³¼ ?‰ì¡°
4. **ì¡°ëª…ê³?ê·¸ë¦¼??*: ë¹›ì˜ ë°©í–¥, ê°•ë„, ë¶„ìœ„ê¸?
5. **êµ¬ë„?€ ?œì **: ì¹´ë©”???µê?, ?„ë ˆ?´ë°
6. **?¤í??¼ê³¼ ì§ˆê°**: ?„íŠ¸ ?¤í??? ?¬ì§ˆê°?
7. **?¸ë? ?”ì†Œ**: ?¡ì„¸?œë¦¬, ?¥ì‹, ê¸°í? ?¹ì§•

ë¶„ì„ ê²°ê³¼ë¥??ì—°?¤ëŸ¬??ë¬¸ì¥?¼ë¡œ ?‘ì„±?´ì£¼?¸ìš”.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 600,
      temperature: 0.3
    });

    return response.choices[0].message.content || "?´ë?ì§€ ë¶„ì„???¤íŒ¨?ˆìŠµ?ˆë‹¤.";
  } catch (error) {
    console.error('?´ë?ì§€ ë¶„ì„ ?¤íŒ¨:', error);
    return "?´ë?ì§€ ë¶„ì„???¤íŒ¨?ˆìŠµ?ˆë‹¤.";
  }
}

// ?¤ì¤‘ ?´ë?ì§€ ë¶„ì„ ?¨ìˆ˜ (?´ë?ì§€ ê²°í•©??
async function analyzeImagesForCombination(base64Images: string[]): Promise<string> {
  try {
    const imageContent = base64Images.map((image, index) => ({
      type: "image_url" as const,
      image_url: {
        url: `data:image/jpeg;base64,${image}`,
        detail: "high" as const
      }
    }));

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `${base64Images.length}ê°œì˜ ?´ë?ì§€ë¥?ë¶„ì„?˜ì—¬ ê°ê°???¹ì§•???•ë¦¬?´ì£¼?¸ìš”:

ê°??´ë?ì§€ë§ˆë‹¤ ?¤ìŒ ?•ë³´ë¥??œê³µ?´ì£¼?¸ìš”:
1. **ì£¼ìš” ê°ì²´/?¸ë¬¼**: ?´ë?ì§€???µì‹¬ ?”ì†Œ
2. **ë°°ê²½ê³??˜ê²½**: ?¤ì •ê³?ë¶„ìœ„ê¸?
3. **?‰ìƒê³??¤í???*: ?‰ì¡°?€ ?„íŠ¸ ?¤í???
4. **?©ì„± ê°€?¥í•œ ?”ì†Œ**: ?¤ë¥¸ ?´ë?ì§€?€ ê²°í•©?????ˆëŠ” ë¶€ë¶?
5. **? ë‹ˆ?¬í•œ ?¹ì§•**: ???´ë?ì§€ë§Œì˜ ?…íŠ¹???”ì†Œ

ê²°ê³¼??"?´ë?ì§€ 1: [ë¶„ì„?´ìš©], ?´ë?ì§€ 2: [ë¶„ì„?´ìš©]..." ?•íƒœë¡??•ë¦¬?´ì£¼?¸ìš”.`
            },
            ...imageContent
          ]
        }
      ],
      max_tokens: 800,
      temperature: 0.3
    });

    return response.choices[0].message.content || "?´ë?ì§€ ë¶„ì„???¤íŒ¨?ˆìŠµ?ˆë‹¤.";
  } catch (error) {
    console.error('?´ë?ì§€ ë¶„ì„ ?¤íŒ¨:', error);
    return "?´ë?ì§€ ë¶„ì„???¤íŒ¨?ˆìŠµ?ˆë‹¤.";
  }
}

// ?´ë?ì§€ ?©ì„±???„í•œ ?¬í¼ ?¨ìˆ˜ (gpt-4.1 API ?¬ìš©)
async function combineImages(base64Images: string[], prompt: string): Promise<string> {
  try {
    // êµ¬ì¡°?”ëœ ?„ë¡¬?„íŠ¸ ?ì„± (?¤ì œë¡œëŠ” ?ë³¸ ?„ë¡¬?„íŠ¸ ë°˜í™˜)
    const enhancedPrompt = await generateStructuredPrompt(
      prompt, 
      'combination',
      undefined,
      base64Images
    );

    // gpt-4.1 APIë¡??´ë?ì§€ ê²°í•©
    const imageInputs = base64Images.map((base64) => ({
      type: "input_image" as const,
      image_url: `data:image/jpeg;base64,${base64}`,
      detail: "high" as const
    }));

    const response = await openai.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: [
            { 
              type: "input_text", 
              text: enhancedPrompt
            },
            ...imageInputs
          ],
        },
      ],
      tools: [{ type: "image_generation" }],
    });

    const imageGenerationCalls = response.output.filter(
      (output) => output.type === "image_generation_call"
    );

    if (imageGenerationCalls.length > 0 && imageGenerationCalls[0].result!) {
      return imageGenerationCalls[0].result!;
    }
  } catch (error) {
    console.error('gpt-4.1 API ?¤íŒ¨, gpt-4.1-minië¡??¬ì‹œ??', error);
    
    // gpt-4.1???¤íŒ¨?˜ë©´ gpt-4.1-minië¡??¬ì‹œ??
    try {
      const enhancedPrompt = await generateStructuredPrompt(
        prompt, 
        'combination',
        undefined,
        base64Images
      );

      const imageInputs = base64Images.map((base64) => ({
        type: "input_image" as const,
        image_url: `data:image/jpeg;base64,${base64}`,
        detail: "high" as const
      }));

      const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              { 
                type: "input_text", 
                text: enhancedPrompt
              },
              ...imageInputs
            ],
          },
        ],
        tools: [{ type: "image_generation" }],
      });

      const imageGenerationCalls = response.output.filter(
        (output) => output.type === "image_generation_call"
      );

      if (imageGenerationCalls.length > 0) {
        return imageGenerationCalls[0].result!;
      }
    } catch (miniError) {
      console.error('gpt-4.1-mini???¤íŒ¨, DALL-E 3ë¡??€ì²?', miniError);
      
      // ëª¨ë“  ?ˆë¡œ??APIê°€ ?¤íŒ¨?˜ë©´ DALL-E 3ë¡??€ì²?
      const fallbackPrompt = await generateStructuredPrompt(
        prompt, 
        'combination',
        undefined,
        base64Images
      );
      
      const result = await openai.images.generate({
        model: 'dall-e-3',
        prompt: fallbackPrompt,
        n: 1,
        response_format: 'b64_json',
        quality: 'hd',
        size: '1024x1024'
      });

      if (!result.data || !result.data[0] || !result.data[0].b64_json) {
        throw new Error('?´ë?ì§€ ê²°í•©???¤íŒ¨?ˆìŠµ?ˆë‹¤.');
      }

      return result.data[0].b64_json;
    }
  }

  throw new Error('?´ë?ì§€ ê²°í•©???¤íŒ¨?ˆìŠµ?ˆë‹¤.');
}

// ?´ë?ì§€ ë³€ê²½ì„ ?„í•œ ?¬í¼ ?¨ìˆ˜ (gpt-4.1 API ?¬ìš©)
async function modifyImage(base64Image: string, prompt: string): Promise<string> {
  try {
    // êµ¬ì¡°?”ëœ ?„ë¡¬?„íŠ¸ ?ì„± (?¤ì œë¡œëŠ” ?ë³¸ ?„ë¡¬?„íŠ¸ ë°˜í™˜)
    const enhancedPrompt = await generateStructuredPrompt(prompt, 'modification', base64Image);

    // gpt-4.1 APIë¡??´ë?ì§€ ë³€ê²?
    const response = await openai.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: enhancedPrompt },
            {
              type: "input_image",
              image_url: `data:image/jpeg;base64,${base64Image}`,
              detail: "high"
            },
          ],
        },
      ],
      tools: [{ type: "image_generation" }],
    });

    const imageGenerationCalls = response.output.filter(
      (output) => output.type === "image_generation_call"
    );

    if (imageGenerationCalls.length > 0) {
      return imageGenerationCalls[0].result!;
    }
  } catch (error) {
    console.error('gpt-4.1 API ?¤íŒ¨, gpt-4.1-minië¡??¬ì‹œ??', error);
    
    try {
      // gpt-4.1-minië¡??¬ì‹œ??
      const enhancedPrompt = await generateStructuredPrompt(prompt, 'modification', base64Image);

      const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: enhancedPrompt },
              {
                type: "input_image",
                image_url: `data:image/jpeg;base64,${base64Image}`,
                detail: "high"
              },
            ],
          },
        ],
        tools: [{ type: "image_generation" }],
      });

      const imageGenerationCalls = response.output.filter(
        (output) => output.type === "image_generation_call"
      );

      if (imageGenerationCalls.length > 0) {
        return imageGenerationCalls[0].result!;
      }
    } catch (miniError) {
      console.error('gpt-4.1-mini???¤íŒ¨, DALL-E 3ë¡??€ì²?', miniError);
      
      // ëª¨ë“  ?ˆë¡œ??APIê°€ ?¤íŒ¨?˜ë©´ DALL-E 3ë¡??€ì²?
      const fallbackPrompt = await generateStructuredPrompt(prompt, 'modification', base64Image);
      
      const result = await openai.images.generate({
        model: 'dall-e-3',
        prompt: fallbackPrompt,
        n: 1,
        response_format: 'b64_json',
        quality: 'hd',
        size: '1024x1024'
      });

      if (!result.data || !result.data[0] || !result.data[0].b64_json) {
        throw new Error('?´ë?ì§€ ë³€ê²½ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.');
      }

      return result.data[0].b64_json;
    }
  }

  throw new Error('?´ë?ì§€ ë³€ê²½ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.');
}

export async function POST(req: NextRequest) {
  try {
    const { type, prompt, images } = await req.json()

    if (!prompt) {
      return NextResponse.json(
        { error: '?ìŠ¤???¤ëª…???„ìš”?©ë‹ˆ??' },
        { status: 400 }
      )
    }

    switch (type) {
      case '?´ë?ì§€ ?ì„±':
        try {
          // gpt-4.1 APIë¡??´ë?ì§€ ?ì„±
          const enhancedPrompt = await generateStructuredPrompt(prompt, 'generation');
          
          const response = await openai.responses.create({
            model: "gpt-4.1",
            input: enhancedPrompt,
            tools: [{ type: "image_generation" }],
          });

          const imageGenerationCalls = response.output.filter(
            (output) => output.type === "image_generation_call"
          );

          if (imageGenerationCalls.length > 0) {
            return NextResponse.json({
              success: true,
              image: imageGenerationCalls[0].result!,
              type: type
            });
          }
        } catch (newApiError) {
          console.error('gpt-4.1 ?¤íŒ¨, gpt-4.1-minië¡??¬ì‹œ??', newApiError);
          
          try {
            // gpt-4.1-minië¡??¬ì‹œ??
            const enhancedPrompt = await generateStructuredPrompt(prompt, 'generation');
            
            const response = await openai.responses.create({
              model: "gpt-4.1-mini",
              input: enhancedPrompt,
              tools: [{ type: "image_generation" }],
            });

            const imageGenerationCalls = response.output.filter(
              (output) => output.type === "image_generation_call"
            );

            if (imageGenerationCalls.length > 0) {
              return NextResponse.json({
                success: true,
                image: imageGenerationCalls[0].result!,
                type: type
              });
            }
          } catch (miniError) {
            console.error('gpt-4.1-mini???¤íŒ¨, DALL-E 3ë¡??€ì²?', miniError);
          }
        }

        // ëª¨ë“  ?ˆë¡œ??APIê°€ ?¤íŒ¨?˜ë©´ DALL-E 3ë¡??€ì²?
        const enhancedPrompt = await generateStructuredPrompt(prompt, 'generation');
        
        const result = await openai.images.generate({
          model: 'dall-e-3',
          prompt: enhancedPrompt,
          n: 1,
          response_format: 'b64_json',
          quality: 'hd',
          size: '1024x1024'
        });
        
        if (!result.data || !result.data[0] || !result.data[0].b64_json) {
          throw new Error('?´ë?ì§€ ?ì„±???¤íŒ¨?ˆìŠµ?ˆë‹¤.');
        }
        
        return NextResponse.json({
          success: true,
          image: result.data[0].b64_json,
          type: type
        });

      case '?´ë?ì§€ ë³€ê²?:
        if (!images || images.length === 0) {
          return NextResponse.json(
            { error: '?¸ì§‘???´ë?ì§€ê°€ ?„ìš”?©ë‹ˆ??' },
            { status: 400 }
          );
        }

        const modifiedImageBase64 = await modifyImage(images[0], prompt);
        
        return NextResponse.json({
          success: true,
          image: modifiedImageBase64,
          type: type
        });

      case '?´ë?ì§€ ê²°í•©':
        if (!images || images.length < 2) {
          return NextResponse.json(
            { error: 'ê²°í•©???´ë?ì§€ê°€ ìµœì†Œ 2ê°??„ìš”?©ë‹ˆ??' },
            { status: 400 }
          );
        }

        const combinedImageBase64 = await combineImages(images, prompt);
        
        return NextResponse.json({
          success: true,
          image: combinedImageBase64,
          type: type
        });

      default:
        return NextResponse.json(
          { error: 'ì§€?í•˜ì§€ ?ŠëŠ” ?ì„± ë°©ì‹?…ë‹ˆ??' },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('?´ë?ì§€ ?ì„± ?¤ë¥˜:', error);
    
    // API ??ê´€???ëŸ¬ ì²˜ë¦¬
    if (error?.status === 401) {
      return NextResponse.json(
        { 
          error: 'OpenAI API ?¤ê? ?¤ì •?˜ì? ?Šì•˜ê±°ë‚˜ ? íš¨?˜ì? ?ŠìŠµ?ˆë‹¤.',
          details: 'OPENAI_API_KEY ?˜ê²½ë³€?˜ë? ?•ì¸?´ì£¼?¸ìš”.'
        },
        { status: 401 }
      );
    }

    // ? ë‹¹??ì´ˆê³¼ ?ëŸ¬ ì²˜ë¦¬
    if (error?.status === 429) {
      return NextResponse.json(
        { 
          error: 'API ?¬ìš©?‰ì´ ì´ˆê³¼?˜ì—ˆ?µë‹ˆ??',
          details: '? ì‹œ ???¤ì‹œ ?œë„?´ì£¼?¸ìš”.'
        },
        { status: 429 }
      );
    }

    // ì½˜í…ì¸??•ì±… ?„ë°˜ ì²˜ë¦¬
    if (error?.status === 400 && error?.code === 'content_policy_violation') {
      return NextResponse.json(
        { 
          error: '?”ì²­??ì½˜í…ì¸??•ì±…???„ë°˜?©ë‹ˆ??',
          details: '???ˆì „?˜ê³  ?ì ˆ???´ìš©?¼ë¡œ ?¤ì‹œ ?œë„?´ì£¼?¸ìš”.'
        },
        { status: 400 }
      );
    }

    // ì¡°ì§ ê²€ì¦??„ìš” (gpt-image-1 ëª¨ë¸)
    if (error?.status === 403 && error?.message?.includes('organization must be verified')) {
      return NextResponse.json(
        { 
          error: '?´ë‹¹ ëª¨ë¸ ?¬ìš©???„í•´?œëŠ” ì¡°ì§ ê²€ì¦ì´ ?„ìš”?©ë‹ˆ??',
          details: 'OpenAI ?Œë«?¼ì—??ì¡°ì§??ê²€ì¦í•´ì£¼ì„¸??'
        },
        { status: 403 }
      );
    }

    // ëª¨ë¸??ì°¾ì„ ???†ëŠ” ê²½ìš°
    if (error?.status === 404 || error?.message?.includes('model')) {
      return NextResponse.json(
        { 
          error: '?”ì²­??AI ëª¨ë¸???¬ìš©?????†ìŠµ?ˆë‹¤.',
          details: 'ê¸°ë³¸ ëª¨ë¸ë¡?ì²˜ë¦¬?©ë‹ˆ??'
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        error: error?.message || '?´ë?ì§€ ?ì„± ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.',
        details: error?.response?.data?.error?.message || error?.message
      },
      { status: 500 }
    );
  }
} 
