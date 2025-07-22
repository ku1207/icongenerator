import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// 구조화된 프롬프트 생성을 위한 헬퍼 함수
async function generateStructuredPrompt(userPrompt: string, type: 'generation' | 'modification' | 'combination', baseImage?: string, baseImages?: string[]): Promise<string> {
  try {
    // 이미지 변경/결합 모드에서는 먼저 이미지를 분석
    let imageAnalysis = '';
    
    if (type === 'modification' && baseImage) {
      // 단일 이미지 분석 (이미지 변경)
      imageAnalysis = await analyzeImageForModification(baseImage);
    } else if (type === 'combination' && baseImages && baseImages.length > 0) {
      // 다중 이미지 분석 (이미지 결합)
      imageAnalysis = await analyzeImagesForCombination(baseImages);
    }

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
업로드된 이미지를 분석한 결과와 사용자의 변경 요청을 바탕으로 정교한 이미지 변경 프롬프트를 생성하십시오.

###이미지 분석 결과
${imageAnalysis}

###작성지침
1. 전체 구조
 - 결과는 순수 JSON(UTF-8) 만 출력합니다.
 - JSON 외의 문장·설명·주석은 절대 출력하지 마십시오.
 - 최상위 키는 **imagePrompt**만 존재합니다.

2. 작성 규칙
 - **유지할 요소**: 이미지 분석 결과에서 변경 요청과 관련 없는 모든 요소들을 명시적으로 보존하도록 지시
 - **변경할 요소**: 사용자가 요청한 변경 사항만 구체적으로 적용
 - **구조 보존**: 기존 이미지의 전체적인 구도, 비율, 레이아웃은 최대한 유지
 - **자연스러운 통합**: 변경된 부분이 기존 요소들과 자연스럽게 어우러지도록 처리
 - 프롬프트는 "기존 이미지에서 [유지할 요소들]은 그대로 유지하면서, [변경할 요소]만 [변경 내용]으로 수정" 형태로 구성

###출력형태
{
  "imagePrompt": "<imageprompt>"
}

###변경 요청
${userPrompt}`;
    } else if (type === 'combination') {
      const imageCount = baseImages?.length || 0;
      systemPrompt = `###지시사항
업로드된 ${imageCount}개 이미지들을 분석한 결과와 사용자의 합성 요청을 바탕으로 자연스러운 이미지 결합 프롬프트를 생성하십시오.

###이미지 분석 결과
${imageAnalysis}

###작성지침
1. 전체 구조
 - 결과는 순수 JSON(UTF-8) 만 출력합니다.
 - JSON 외의 문장·설명·주석은 절대 출력하지 마십시오.
 - 최상위 키는 **imagePrompt**만 존재합니다.

2. 작성 규칙
 - **각 이미지의 핵심 요소**: 분석 결과에서 각 이미지의 특징적인 요소들을 추출
 - **합성 방식**: 사용자 요청에 따라 어떤 요소를 어떻게 결합할지 명시
 - **조화로운 통합**: 서로 다른 이미지의 요소들이 자연스럽게 어우러지는 장면 구성
 - **스타일 통일**: 최종 이미지의 일관된 스타일과 분위기 설정
 - 프롬프트는 "이미지1의 [요소], 이미지2의 [요소]를 [합성 방식]으로 결합하여 [최종 장면] 생성" 형태로 구성

###출력형태
{
  "imagePrompt": "<imageprompt>"
}

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

    // 최신 GPT-4 모델 사용
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages as any,
      max_tokens: 800,
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (content) {
      try {
        // 코드 블록 제거 및 JSON 파싱
        let cleanContent = content.trim();
        
        // ```json으로 시작하고 ```로 끝나는 경우 제거
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        const parsed = JSON.parse(cleanContent);
        return parsed.imagePrompt || userPrompt;
      } catch (parseError) {
        console.error('JSON 파싱 실패:', parseError);
        console.error('원본 응답:', content);
        return userPrompt;
      }
    }
    
    return userPrompt;
  } catch (error) {
    console.error('구조화된 프롬프트 생성 실패:', error);
    return userPrompt;
  }
}

// 단일 이미지 분석 함수 (이미지 변경용)
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
              text: `이 이미지를 자세히 분석하여 다음 정보를 제공해주세요:

1. **주요 객체/인물**: 이미지의 핵심이 되는 대상들
2. **배경 환경**: 배경의 종류, 설정, 분위기
3. **색상 팔레트**: 주요 색상들과 색조
4. **조명과 그림자**: 빛의 방향, 강도, 분위기
5. **구도와 시점**: 카메라 앵글, 프레이밍
6. **스타일과 질감**: 아트 스타일, 재질감
7. **세부 요소**: 액세서리, 장식, 기타 특징

분석 결과를 자연스러운 문장으로 작성해주세요.`
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

    return response.choices[0].message.content || "이미지 분석에 실패했습니다.";
  } catch (error) {
    console.error('이미지 분석 실패:', error);
    return "이미지 분석에 실패했습니다.";
  }
}

// 다중 이미지 분석 함수 (이미지 결합용)
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
              text: `${base64Images.length}개의 이미지를 분석하여 각각의 특징을 정리해주세요:

각 이미지마다 다음 정보를 제공해주세요:
1. **주요 객체/인물**: 이미지의 핵심 요소
2. **배경과 환경**: 설정과 분위기
3. **색상과 스타일**: 색조와 아트 스타일
4. **합성 가능한 요소**: 다른 이미지와 결합할 수 있는 부분
5. **유니크한 특징**: 이 이미지만의 독특한 요소

결과는 "이미지 1: [분석내용], 이미지 2: [분석내용]..." 형태로 정리해주세요.`
            },
            ...imageContent
          ]
        }
      ],
      max_tokens: 800,
      temperature: 0.3
    });

    return response.choices[0].message.content || "이미지 분석에 실패했습니다.";
  } catch (error) {
    console.error('이미지 분석 실패:', error);
    return "이미지 분석에 실패했습니다.";
  }
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
        // 구조화된 프롬프트 생성
        const enhancedPrompt = await generateStructuredPrompt(prompt, 'generation');
        
        // DALL-E 3를 사용하여 이미지 생성
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
        if (!images || images.length === 0) {
          return NextResponse.json(
            { error: '편집할 이미지가 필요합니다.' },
            { status: 400 }
          );
        }

        // 이미지 변경은 현재 DALL-E 3로만 처리 (업로드된 이미지 기반 프롬프트 생성)
        const modificationPrompt = await generateStructuredPrompt(prompt, 'modification', images[0]);
        
        const modifiedResult = await openai.images.generate({
          model: 'dall-e-3',
          prompt: modificationPrompt,
          n: 1,
          response_format: 'b64_json',
          quality: 'hd',
          size: '1024x1024'
        });
        
        if (!modifiedResult.data || !modifiedResult.data[0] || !modifiedResult.data[0].b64_json) {
          throw new Error('이미지 변경에 실패했습니다.');
        }
        
        return NextResponse.json({
          success: true,
          image: modifiedResult.data[0].b64_json,
          type: type
        });

      case '이미지 결합':
        if (!images || images.length < 2) {
          return NextResponse.json(
            { error: '결합할 이미지가 최소 2개 필요합니다.' },
            { status: 400 }
          );
        }

        // 이미지 결합도 현재 DALL-E 3로만 처리 (업로드된 이미지들 기반 프롬프트 생성)
        const combinationPrompt = await generateStructuredPrompt(prompt, 'combination', undefined, images);
        
        const combinedResult = await openai.images.generate({
          model: 'dall-e-3',
          prompt: combinationPrompt,
          n: 1,
          response_format: 'b64_json',
          quality: 'hd',
          size: '1024x1024'
        });
        
        if (!combinedResult.data || !combinedResult.data[0] || !combinedResult.data[0].b64_json) {
          throw new Error('이미지 결합에 실패했습니다.');
        }
        
        return NextResponse.json({
          success: true,
          image: combinedResult.data[0].b64_json,
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

    // 콘텐츠 정책 위반 처리
    if (error?.status === 400 && error?.code === 'content_policy_violation') {
      return NextResponse.json(
        { 
          error: '요청이 콘텐츠 정책에 위반됩니다.',
          details: '더 안전하고 적절한 내용으로 다시 시도해주세요.'
        },
        { status: 400 }
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