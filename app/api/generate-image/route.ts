import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(req: NextRequest) {
  try {
    const { type, prompt, images } = await req.json()

    if (!prompt) {
      return NextResponse.json(
        { error: '텍스트 설명이 필요합니다.' },
        { status: 400 }
      )
    }

    let result

    switch (type) {
      case '이미지 생성':
        // DALL-E 3로 이미지 생성
        result = await openai.images.generate({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          response_format: 'b64_json',
          quality: 'hd',
          size: '1024x1024'
        })
        break

      case '이미지 변경':
        // DALL-E 2로 이미지 편집
        if (!images || images.length === 0) {
          return NextResponse.json(
            { error: '편집할 이미지가 필요합니다.' },
            { status: 400 }
          )
        }

        return NextResponse.json(
          { 
            error: '이미지 변경 기능은 현재 개발 중입니다.',
            info: '조직 검증 완료 후 사용 가능합니다.'
          },
          { status: 501 }
        )

      case '이미지 결합':
        return NextResponse.json(
          { 
            error: '이미지 결합 기능은 현재 개발 중입니다.',
            info: '조직 검증 완료 후 사용 가능합니다.'
          },
          { status: 501 }
        )

      default:
        return NextResponse.json(
          { error: '지원하지 않는 생성 방식입니다.' },
          { status: 400 }
        )
    }

    if (!result || !result.data || !result.data[0]) {
      throw new Error('이미지 생성에 실패했습니다.')
    }

    return NextResponse.json({
      success: true,
      image: result.data[0].b64_json,
      type: type
    })

  } catch (error: any) {
    console.error('이미지 생성 오류:', error)
    
    return NextResponse.json(
      { 
        error: error?.message || '이미지 생성 중 오류가 발생했습니다.',
        details: error?.response?.data?.error?.message || error?.message
      },
      { status: 500 }
    )
  }
} 