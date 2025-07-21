import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// 구조화된 프롬프트 생성을 위한 헬퍼 함수
async function generateStructuredPrompt(userPrompt: string, type: 'generation' | 'modification' | 'combination', baseImage?: string, baseImages?: string[]): Promise<string> {
  try {
    let systemPrompt = '';
    
    if (type === 'generation') {
      systemPrompt = `###지시사항
아래 정보들을 기반으로 이미지 생성 프롬프트를 기입하십시오.

###작성지침
1. 전체 구조
 - 결과는 순수 JSON(UTF-8) 만 출력합니다.
 - JSON 외의 문장·설명·주석은 절대 출력하지 마십시오.
 - 최상위 키는 **imagePrompt**만 존재합니다.

2. 작성 규칙
 - 가장 먼저 **주제나 장면**을 명확히 서술하십시오. (예: "우주를 여행하는 고양이")
 - **스타일이나 화풍**을 구체적으로 지정하십시오. (예: "지브리 스타일", "고흐 풍 유화")
 - **구도나 시점** 정보를 포함하십시오. (예: "로우 앵글", "탑뷰", "풀바디 샷" 등)
 - **조명, 색감, 배경** 요소를 한 문장으로 요약하십시오. (예: "따뜻한 노을빛 조명, 파스텔톤, 눈 덮인 마을")
 - **디테일 수준 및 재질감**을 설명하십시오. (예: "하이퍼리얼한 8K 질감", "매끄러운 금속 표면")
 - **감정·분위기·스토리성**이 드러나는 형용사를 포함하십시오. (예: "몽환적이고 평화로운", "긴장감 도는 디스토피아")
 - **제외하고 싶은 요소**는 부정 프롬프트로 따로 적으십시오. (예: "노 워터마크, 노 왜곡")
 - 모든 요소는 쉼표(,)로 구분된 간결한 명사구로 구성하십시오.
 - 우선순위가 높은 핵심 요소는 문장 앞에 배치하십시오.

###출력형태
{
  "imagePrompt": "<imageprompt>"
}

###기존 프롬프트
${userPrompt}`;
    } else if (type === 'modification') {
      systemPrompt = `###지시사항
아래 정보들을 기반으로 이미지 생성 프롬프트를 기입하십시오.

###작성지침
1. 전체 구조
 - 결과는 순수 JSON(UTF-8) 만 출력합니다.
 - JSON 외의 문장·설명·주석은 절대 출력하지 마십시오.
 - 최상위 키는 **imagePrompt**만 존재합니다.

2. 작성 규칙
 - 가장 먼저 **주제나 장면**을 명확히 서술하십시오. (예: "우주를 여행하는 고양이")
 - **스타일이나 화풍**을 구체적으로 지정하십시오. (예: "지브리 스타일", "고흐 풍 유화")
 - **구도나 시점** 정보를 포함하십시오. (예: "로우 앵글", "탑뷰", "풀바디 샷" 등)
 - **조명, 색감, 배경** 요소를 한 문장으로 요약하십시오. (예: "따뜻한 노을빛 조명, 파스텔톤, 눈 덮인 마을")
 - **디테일 수준 및 재질감**을 설명하십시오. (예: "하이퍼리얼한 8K 질감", "매끄러운 금속 표면")
 - **감정·분위기·스토리성**이 드러나는 형용사를 포함하십시오. (예: "몽환적이고 평화로운", "긴장감 도는 디스토피아")
 - **제외하고 싶은 요소**는 부정 프롬프트로 따로 적으십시오. (예: "노 워터마크, 노 왜곡")
 - 모든 요소는 쉼표(,)로 구분된 간결한 명사구로 구성하십시오.
 - 우선순위가 높은 핵심 요소는 문장 앞에 배치하십시오.

###출력형태
{
  "imagePrompt": "<imageprompt>"
}

###업로드 이미지
{{이미지}}

###변경 요청
${userPrompt}`;
    } else if (type === 'combination') {
      const imageCount = baseImages?.length || 0;
      const imagePlaceholders = Array.from({length: imageCount}, (_, i) => `{{업로드 이미지${i + 1}}}`).join('\n');
      
      systemPrompt = `###지시사항
아래 정보들을 기반으로 이미지 생성 프롬프트를 기입하십시오.

###작성지침
1. 전체 구조
 - 결과는 순수 JSON(UTF-8) 만 출력합니다.
 - JSON 외의 문장·설명·주석은 절대 출력하지 마십시오.
 - 최상위 키는 **imagePrompt**만 존재합니다.

2. 작성 규칙
 - 가장 먼저 **주제나 장면**을 명확히 서술하십시오. (예: "우주를 여행하는 고양이")
 - **스타일이나 화풍**을 구체적으로 지정하십시오. (예: "지브리 스타일", "고흐 풍 유화")
 - **구도나 시점** 정보를 포함하십시오. (예: "로우 앵글", "탑뷰", "풀바디 샷" 등)
 - **조명, 색감, 배경** 요소를 한 문장으로 요약하십시오. (예: "따뜻한 노을빛 조명, 파스텔톤, 눈 덮인 마을")
 - **디테일 수준 및 재질감**을 설명하십시오. (예: "하이퍼리얼한 8K 질감", "매끄러운 금속 표면")
 - **감정·분위기·스토리성**이 드러나는 형용사를 포함하십시오. (예: "몽환적이고 평화로운", "긴장감 도는 디스토피아")
 - **제외하고 싶은 요소**는 부정 프롬프트로 따로 적으십시오. (예: "노 워터마크, 노 왜곡")
 - 모든 요소는 쉼표(,)로 구분된 간결한 명사구로 구성하십시오.
 - 우선순위가 높은 핵심 요소는 문장 앞에 배치하십시오.

###출력형태
{
  "imagePrompt": "<imageprompt>"
}

###업로드 이미지 목록
${imagePlaceholders}

###결합 요청
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
      // 이미지 결합의 경우 모든 이미지를 포함
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

    // 최신 GPT-4 모델 사용 (gpt-4-vision-preview 대신)
    const response = await openai.chat.completions.create({
      model: "gpt-4o",  // 최신 모델 사용
      messages: messages as any,
      max_tokens: 800,
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        return parsed.imagePrompt || userPrompt;
      } catch (parseError) {
        console.error('JSON 파싱 실패:', parseError);
        return userPrompt;
      }
    }
    
    return userPrompt;
  } catch (error) {
    console.error('구조화된 프롬프트 생성 실패:', error);
    return userPrompt;
  }
}

// 이미지 합성을 위한 헬퍼 함수 (gpt-4.1 API 사용)
async function combineImages(base64Images: string[], prompt: string): Promise<string> {
  try {
    // 먼저 구조화된 프롬프트 생성
    const enhancedPrompt = await generateStructuredPrompt(
      `Create a composite image combining elements from ${base64Images.length} different source images. ${prompt}`, 
      'combination',
      undefined, // baseImage는 여기서는 사용되지 않음
      base64Images
    );

    // gpt-4.1 API로 이미지 결합
    const imageInputs = base64Images.map((base64) => ({
      type: "input_image" as const,
      image_url: `data:image/jpeg;base64,${base64}`,
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

    if (imageGenerationCalls.length > 0) {
      return imageGenerationCalls[0].result;
    }
  } catch (error) {
    console.error('gpt-4.1 API 실패, gpt-4.1-mini로 재시도:', error);
    
    // gpt-4.1이 실패하면 gpt-4.1-mini로 재시도
    try {
      const enhancedPrompt = await generateStructuredPrompt(
        `Create a composite image combining elements from ${base64Images.length} different source images. ${prompt}`, 
        'combination',
        undefined, // baseImage는 여기서는 사용되지 않음
        base64Images
      );

      const imageInputs = base64Images.map((base64) => ({
        type: "input_image" as const,
        image_url: `data:image/jpeg;base64,${base64}`,
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
        return imageGenerationCalls[0].result;
      }
    } catch (miniError) {
      console.error('gpt-4.1-mini도 실패, DALL-E 3로 대체:', miniError);
      
      // 모든 새로운 API가 실패하면 DALL-E 3로 대체
      const fallbackPrompt = await generateStructuredPrompt(
        `Create a composite image combining elements from ${base64Images.length} different source images. ${prompt}`, 
        'combination',
        undefined, // baseImage는 여기서는 사용되지 않음
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
        throw new Error('이미지 결합에 실패했습니다.');
      }

      return result.data[0].b64_json;
    }
  }

  throw new Error('이미지 결합에 실패했습니다.');
}

// 이미지 변경을 위한 헬퍼 함수 (gpt-4.1 API 사용)
async function modifyImage(base64Image: string, prompt: string): Promise<string> {
  try {
    // 구조화된 프롬프트 생성 (이미지 포함)
    const enhancedPrompt = await generateStructuredPrompt(prompt, 'modification', base64Image);

    // gpt-4.1 API로 이미지 변경
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
      return imageGenerationCalls[0].result;
    }
  } catch (error) {
    console.error('gpt-4.1 API 실패, gpt-4.1-mini로 재시도:', error);
    
    try {
      // gpt-4.1-mini로 재시도
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
        return imageGenerationCalls[0].result;
      }
    } catch (miniError) {
      console.error('gpt-4.1-mini도 실패, DALL-E 3로 대체:', miniError);
      
      // 모든 새로운 API가 실패하면 DALL-E 3로 대체
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
        throw new Error('이미지 변경에 실패했습니다.');
      }

      return result.data[0].b64_json;
    }
  }

  throw new Error('이미지 변경에 실패했습니다.');
}

export async function POST(req: NextRequest) {
  try {
    const { type, prompt, images } = await req.json()

    if (!prompt) {
      return NextResponse.json(
        { error: '텍스트 설명이 필요합니다.' },
        { status: 400 }
      )
    }

    switch (type) {
      case '이미지 생성':
        try {
          // gpt-4.1 API로 이미지 생성
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
              image: imageGenerationCalls[0].result,
              type: type
            });
          }
        } catch (newApiError) {
          console.error('gpt-4.1 실패, gpt-4.1-mini로 재시도:', newApiError);
          
          try {
            // gpt-4.1-mini로 재시도
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
                image: imageGenerationCalls[0].result,
                type: type
              });
            }
          } catch (miniError) {
            console.error('gpt-4.1-mini도 실패, DALL-E 3로 대체:', miniError);
          }
        }

        // 모든 새로운 API가 실패하면 DALL-E 3로 대체
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
          throw new Error('이미지 생성에 실패했습니다.');
        }
        
        return NextResponse.json({
          success: true,
          image: result.data[0].b64_json,
          type: type
        });

      case '이미지 변경':
        // gpt-4.1 API를 우선으로 한 이미지 변경
        if (!images || images.length === 0) {
          return NextResponse.json(
            { error: '편집할 이미지가 필요합니다.' },
            { status: 400 }
          );
        }

        const modifiedImageBase64 = await modifyImage(images[0], prompt);
        
        return NextResponse.json({
          success: true,
          image: modifiedImageBase64,
          type: type
        });

      case '이미지 결합':
        // gpt-4.1 API를 우선으로 한 이미지 결합
        if (!images || images.length < 2) {
          return NextResponse.json(
            { error: '결합할 이미지가 최소 2개 필요합니다.' },
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
          { error: '지원하지 않는 생성 방식입니다.' },
          { status: 400 }
        );
    }

  } catch (error: any) {
    console.error('이미지 생성 오류:', error);
    
    // API 키 관련 에러 처리
    if (error?.status === 401) {
      return NextResponse.json(
        { 
          error: 'OpenAI API 키가 설정되지 않았거나 유효하지 않습니다.',
          details: 'OPENAI_API_KEY 환경변수를 확인해주세요.'
        },
        { status: 401 }
      );
    }

    // 할당량 초과 에러 처리
    if (error?.status === 429) {
      return NextResponse.json(
        { 
          error: 'API 사용량이 초과되었습니다.',
          details: '잠시 후 다시 시도해주세요.'
        },
        { status: 429 }
      );
    }

    // 모델을 찾을 수 없는 경우
    if (error?.status === 404 || error?.message?.includes('model')) {
      return NextResponse.json(
        { 
          error: '요청된 AI 모델을 사용할 수 없습니다.',
          details: '기본 모델로 처리합니다.'
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        error: error?.message || '이미지 생성 중 오류가 발생했습니다.',
        details: error?.response?.data?.error?.message || error?.message
      },
      { status: 500 }
    );
  }
} 