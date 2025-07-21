import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// 구조?�된 ?�롬?�트 ?�성???�한 ?�퍼 ?�수
async function generateStructuredPrompt(userPrompt: string, type: 'generation' | 'modification' | 'combination', baseImage?: string, baseImages?: string[]): Promise<string> {
  try {
    // ?��?지 변�?결합 모드?�서??먼�? ?��?지�?분석
    let imageAnalysis = '';
    
    if (type === 'modification' && baseImage) {
      // ?�일 ?��?지 분석 (?��?지 변�?
      imageAnalysis = await analyzeImageForModification(baseImage);
    } else if (type === 'combination' && baseImages && baseImages.length > 0) {
      // ?�중 ?��?지 분석 (?��?지 결합)
      imageAnalysis = await analyzeImagesForCombination(baseImages);
    }

    let systemPrompt = '';
    
    if (type === 'generation') {
      systemPrompt = `###지?�사??
?�래 ?�보?�을 기반?�로 ?��?지 ?�성 ?�롬?�트�?기입?�십?�오.

###?�성지�?
1. ?�체 구조
 - 결과???�수 JSON(UTF-8) �?출력?�니??
 - JSON ?�의 문장·?�명·주석?� ?��? 출력?��? 마십?�오.
 - 최상???�는 **imagePrompt**�?존재?�니??

2. ?�성 규칙
 - 가??먼�? **주제???�면**??명확???�술?�십?�오. (?? "?�주�??�행?�는 고양??)
 - **?��??�이???�풍**??구체?�으�?지?�하??��?? (?? "지브리 ?��???, "고흐 ???�화")
 - **구도???�점** ?�보�??�함?�십?�오. (?? "로우 ?��?", "?�뷰", "?�바디 ?? ??
 - **조명, ?�감, 배경** ?�소�???문장?�로 ?�약?�십?�오. (?? "?�뜻???�을�?조명, ?�스?�톤, ????�� 마을")
 - **?�테???��? �??�질�?*???�명?�십?�오. (?? "?�이?�리?�한 8K 질감", "매끄?�운 금속 ?�면")
 - **감정·분위기·스?�리??*???�러?�는 ?�용?��? ?�함?�십?�오. (?? "몽환?�이�??�화로운", "긴장�??�는 ?�스?�피??)
 - **?�외?�고 ?��? ?�소**??부???�롬?�트�??�로 ?�으??��?? (?? "???�터마크, ???�곡")
 - 모든 ?�소???�표(,)�?구분??간결??명사구로 구성?�십?�오.
 - ?�선?�위가 ?��? ?�심 ?�소??문장 ?�에 배치?�십?�오.

###출력?�태
{
  "imagePrompt": "<imageprompt>"
}

###기존 ?�롬?�트
${userPrompt}`;
    } else if (type === 'modification') {
      systemPrompt = `###지?�사??
?�로?�된 ?��?지�?분석??결과?� ?�용?�의 변�??�청??바탕?�로 ?�교???��?지 변�??�롬?�트�??�성?�십?�오.

###?��?지 분석 결과
${imageAnalysis}

###?�성지�?
1. ?�체 구조
 - 결과???�수 JSON(UTF-8) �?출력?�니??
 - JSON ?�의 문장·?�명·주석?� ?��? 출력?��? 마십?�오.
 - 최상???�는 **imagePrompt**�?존재?�니??

2. ?�성 규칙
 - **?��????�소**: ?��?지 분석 결과?�서 변�??�청�?관???�는 모든 ?�소?�을 명시?�으�?보존?�도�?지??
 - **변경할 ?�소**: ?�용?��? ?�청??변�??�항�?구체?�으�??�용
 - **구조 보존**: 기존 ?��?지???�체?�인 구도, 비율, ?�이?�웃?� 최�????��?
 - **?�연?�러???�합**: 변경된 부분이 기존 ?�소?�과 ?�연?�럽�??�우?��??�록 처리
 - ?�롬?�트??"기존 ?��?지?�서 [?��????�소???� 그�?�??��??�면?? [변경할 ?�소]�?[변�??�용]?�로 ?�정" ?�태�?구성

###출력?�태
{
  "imagePrompt": "<imageprompt>"
}

###변�??�청
${userPrompt}`;
    } else if (type === 'combination') {
      const imageCount = baseImages?.length || 0;
      systemPrompt = `###지?�사??
?�로?�된 ${imageCount}�??��?지?�을 분석??결과?� ?�용?�의 ?�성 ?�청??바탕?�로 ?�연?�러???��?지 결합 ?�롬?�트�??�성?�십?�오.

###?��?지 분석 결과
${imageAnalysis}

###?�성지�?
1. ?�체 구조
 - 결과???�수 JSON(UTF-8) �?출력?�니??
 - JSON ?�의 문장·?�명·주석?� ?��? 출력?��? 마십?�오.
 - 최상???�는 **imagePrompt**�?존재?�니??

2. ?�성 규칙
 - **�??��?지???�심 ?�소**: 분석 결과?�서 �??��?지???�징?�인 ?�소?�을 추출
 - **?�성 방식**: ?�용???�청???�라 ?�떤 ?�소�??�떻�?결합?��? 명시
 - **조화로운 ?�합**: ?�로 ?�른 ?��?지???�소?�이 ?�연?�럽�??�우?��????�면 구성
 - **?��????�일**: 최종 ?��?지???��????��??�과 분위�??�정
 - ?�롬?�트??"?��?지1??[?�소], ?��?지2??[?�소]�?[?�성 방식]?�로 결합?�여 [최종 ?�면] ?�성" ?�태�?구성

###출력?�태
{
  "imagePrompt": "<imageprompt>"
}

###결합 ?�청
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
      // ?��?지 결합??경우 모든 ?��?지�??�함
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

    // 최신 GPT-4 모델 ?�용 (gpt-4-vision-preview ?�??
    const response = await openai.chat.completions.create({
      model: "gpt-4o",  // 최신 모델 ?�용
      messages: messages as any,
      max_tokens: 800,
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (content) {
      try {
        // 코드 블록 ?�거 �?JSON ?�싱
        let cleanContent = content.trim();
        
        // ```json?�로 ?�작?�고 ```�??�나??경우 ?�거
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        const parsed = JSON.parse(cleanContent);
        return parsed.imagePrompt || userPrompt;
      } catch (parseError) {
        console.error('JSON ?�싱 ?�패:', parseError);
        console.error('?�본 ?�답:', content);
        return userPrompt;
      }
    }
    
    return userPrompt;
  } catch (error) {
    console.error('구조?�된 ?�롬?�트 ?�성 ?�패:', error);
    return userPrompt;
  }
}

// ?�일 ?��?지 분석 ?�수 (?��?지 변경용)
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
              text: `???��?지�??�세??분석?�여 ?�음 ?�보�??�공?�주?�요:

1. **주요 객체/?�물**: ?��?지???�심???�는 ?�?�들
2. **배경 ?�경**: 배경??종류, ?�정, 분위�?
3. **?�상 ?�레??*: 주요 ?�상?�과 ?�조
4. **조명�?그림??*: 빛의 방향, 강도, 분위�?
5. **구도?� ?�점**: 카메???��?, ?�레?�밍
6. **?��??�과 질감**: ?�트 ?��??? ?�질�?
7. **?��? ?�소**: ?�세?�리, ?�식, 기�? ?�징

분석 결과�??�연?�러??문장?�로 ?�성?�주?�요.`
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

    return response.choices[0].message.content || "?��?지 분석???�패?�습?�다.";
  } catch (error) {
    console.error('?��?지 분석 ?�패:', error);
    return "?��?지 분석???�패?�습?�다.";
  }
}

// ?�중 ?��?지 분석 ?�수 (?��?지 결합??
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
              text: `${base64Images.length}개의 ?��?지�?분석?�여 각각???�징???�리?�주?�요:

�??��?지마다 ?�음 ?�보�??�공?�주?�요:
1. **주요 객체/?�물**: ?��?지???�심 ?�소
2. **배경�??�경**: ?�정�?분위�?
3. **?�상�??��???*: ?�조?� ?�트 ?��???
4. **?�성 가?�한 ?�소**: ?�른 ?��?지?� 결합?????�는 부�?
5. **?�니?�한 ?�징**: ???��?지만의 ?�특???�소

결과??"?��?지 1: [분석?�용], ?��?지 2: [분석?�용]..." ?�태�??�리?�주?�요.`
            },
            ...imageContent
          ]
        }
      ],
      max_tokens: 800,
      temperature: 0.3
    });

    return response.choices[0].message.content || "?��?지 분석???�패?�습?�다.";
  } catch (error) {
    console.error('?��?지 분석 ?�패:', error);
    return "?��?지 분석???�패?�습?�다.";
  }
}

// ?��?지 ?�성???�한 ?�퍼 ?�수 (gpt-4.1 API ?�용)
async function combineImages(base64Images: string[], prompt: string): Promise<string> {
  try {
    // 구조?�된 ?�롬?�트 ?�성 (?�제로는 ?�본 ?�롬?�트 반환)
    const enhancedPrompt = await generateStructuredPrompt(
      prompt, 
      'combination',
      undefined,
      base64Images
    );

    // gpt-4.1 API�??��?지 결합
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
    console.error('gpt-4.1 API ?�패, gpt-4.1-mini�??�시??', error);
    
    // gpt-4.1???�패?�면 gpt-4.1-mini�??�시??
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
      console.error('gpt-4.1-mini???�패, DALL-E 3�??��?', miniError);
      
      // 모든 ?�로??API가 ?�패?�면 DALL-E 3�??��?
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
        throw new Error('?��?지 결합???�패?�습?�다.');
      }

      return result.data[0].b64_json;
    }
  }

  throw new Error('?��?지 결합???�패?�습?�다.');
}

// ?��?지 변경을 ?�한 ?�퍼 ?�수 (gpt-4.1 API ?�용)
async function modifyImage(base64Image: string, prompt: string): Promise<string> {
  try {
    // 구조?�된 ?�롬?�트 ?�성 (?�제로는 ?�본 ?�롬?�트 반환)
    const enhancedPrompt = await generateStructuredPrompt(prompt, 'modification', base64Image);

    // gpt-4.1 API�??��?지 변�?
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
    console.error('gpt-4.1 API ?�패, gpt-4.1-mini�??�시??', error);
    
    try {
      // gpt-4.1-mini�??�시??
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
      console.error('gpt-4.1-mini???�패, DALL-E 3�??��?', miniError);
      
      // 모든 ?�로??API가 ?�패?�면 DALL-E 3�??��?
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
        throw new Error('?��?지 변경에 ?�패?�습?�다.');
      }

      return result.data[0].b64_json;
    }
  }

  throw new Error('?��?지 변경에 ?�패?�습?�다.');
}

export async function POST(req: NextRequest) {
  try {
    const { type, prompt, images } = await req.json()

    if (!prompt) {
      return NextResponse.json(
        { error: '?�스???�명???�요?�니??' },
        { status: 400 }
      )
    }

    switch (type) {
      case '?��?지 ?�성':
        try {
          // gpt-4.1 API�??��?지 ?�성
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
          console.error('gpt-4.1 ?�패, gpt-4.1-mini�??�시??', newApiError);
          
          try {
            // gpt-4.1-mini�??�시??
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
            console.error('gpt-4.1-mini???�패, DALL-E 3�??��?', miniError);
          }
        }

        // 모든 ?�로??API가 ?�패?�면 DALL-E 3�??��?
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
          throw new Error('?��?지 ?�성???�패?�습?�다.');
        }
        
        return NextResponse.json({
          success: true,
          image: result.data[0].b64_json,
          type: type
        });

      case '?��?지 변�?:
        if (!images || images.length === 0) {
          return NextResponse.json(
            { error: '?�집???��?지가 ?�요?�니??' },
            { status: 400 }
          );
        }

        const modifiedImageBase64 = await modifyImage(images[0], prompt);
        
        return NextResponse.json({
          success: true,
          image: modifiedImageBase64,
          type: type
        });

      case '?��?지 결합':
        if (!images || images.length < 2) {
          return NextResponse.json(
            { error: '결합???��?지가 최소 2�??�요?�니??' },
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
          { error: '지?�하지 ?�는 ?�성 방식?�니??' },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('?��?지 ?�성 ?�류:', error);
    
    // API ??관???�러 처리
    if (error?.status === 401) {
      return NextResponse.json(
        { 
          error: 'OpenAI API ?��? ?�정?��? ?�았거나 ?�효?��? ?�습?�다.',
          details: 'OPENAI_API_KEY ?�경변?��? ?�인?�주?�요.'
        },
        { status: 401 }
      );
    }

    // ?�당??초과 ?�러 처리
    if (error?.status === 429) {
      return NextResponse.json(
        { 
          error: 'API ?�용?�이 초과?�었?�니??',
          details: '?�시 ???�시 ?�도?�주?�요.'
        },
        { status: 429 }
      );
    }

    // 콘텐�??�책 ?�반 처리
    if (error?.status === 400 && error?.code === 'content_policy_violation') {
      return NextResponse.json(
        { 
          error: '?�청??콘텐�??�책???�반?�니??',
          details: '???�전?�고 ?�절???�용?�로 ?�시 ?�도?�주?�요.'
        },
        { status: 400 }
      );
    }

    // 조직 검�??�요 (gpt-image-1 모델)
    if (error?.status === 403 && error?.message?.includes('organization must be verified')) {
      return NextResponse.json(
        { 
          error: '?�당 모델 ?�용???�해?�는 조직 검증이 ?�요?�니??',
          details: 'OpenAI ?�랫?�에??조직??검증해주세??'
        },
        { status: 403 }
      );
    }

    // 모델??찾을 ???�는 경우
    if (error?.status === 404 || error?.message?.includes('model')) {
      return NextResponse.json(
        { 
          error: '?�청??AI 모델???�용?????�습?�다.',
          details: '기본 모델�?처리?�니??'
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        error: error?.message || '?��?지 ?�성 �??�류가 발생?�습?�다.',
        details: error?.response?.data?.error?.message || error?.message
      },
      { status: 500 }
    );
  }
} 
