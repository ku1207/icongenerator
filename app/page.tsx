'use client'

import React, { useState } from 'react'
import { Upload, Image as ImageIcon, Sparkles, Palette, Layers } from 'lucide-react'

type GenerationType = '이미지 생성' | '이미지 변경' | '이미지 결합'

export default function Home() {
  const [selectedType, setSelectedType] = useState<GenerationType>('이미지 생성')
  const [textInput, setTextInput] = useState('')
  const [uploadedImages, setUploadedImages] = useState<File[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    if (selectedType === '이미지 변경') {
      setUploadedImages(files.slice(0, 1)) // 최대 1개
    } else if (selectedType === '이미지 결합') {
      setUploadedImages(files.slice(0, 4)) // 최대 4개
    }
  }

  const getPlaceholder = () => {
    switch (selectedType) {
      case '이미지 생성':
        return '생성하고자 하는 이미지를 묘사해 주세요.'
      case '이미지 변경':
        return '이미지에서 변경하고자 하는 것을 구체적으로 묘사해 주세요. (예: 배경을 바다로 변경, 옷 색깔을 빨간색으로 변경)'
      case '이미지 결합':
        return '어떠한 방식으로 이미지들을 합성하고자 하는지 묘사해 주세요.'
      default:
        return ''
    }
  }

  const getImageUploadText = () => {
    if (selectedType === '이미지 변경') {
      return '변경할 이미지 1개를 업로드해주세요'
    } else if (selectedType === '이미지 결합') {
      return '합성할 이미지 2-4개를 업로드해주세요'
    }
    return ''
  }

  const getTypeIcon = (type: GenerationType) => {
    switch (type) {
      case '이미지 생성':
        return <Sparkles className="w-5 h-5" />
      case '이미지 변경':
        return <Palette className="w-5 h-5" />
      case '이미지 결합':
        return <Layers className="w-5 h-5" />
      default:
        return null
    }
  }

  const getTypeDescription = (type: GenerationType) => {
    switch (type) {
      case '이미지 생성':
        return '텍스트 설명만으로 새로운 이미지를 생성합니다'
      case '이미지 변경':
        return '기존 이미지의 구조를 유지하면서 원하는 부분만 정교하게 변경합니다'
      case '이미지 결합':
        return '여러 이미지의 특성을 분석하여 자연스럽게 합성합니다'
      default:
        return ''
    }
  }

  // 파일을 Base64로 변환하는 헬퍼 함수
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        // data:image/jpeg;base64, 부분을 제거하고 순수 base64만 반환
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = error => reject(error)
    })
  }

  const handleGenerate = async () => {
    if (!textInput.trim()) {
      setError('텍스트 설명을 입력해주세요.')
      return
    }

    // 이미지 변경/결합 모드에서 이미지가 없는 경우 체크
    if (selectedType === '이미지 변경' && uploadedImages.length === 0) {
      setError('변경할 이미지를 업로드해주세요.')
      return
    }

    if (selectedType === '이미지 결합' && uploadedImages.length < 2) {
      setError('합성할 이미지를 최소 2개 업로드해주세요.')
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedImage(null)

    try {
      // 업로드된 이미지들을 Base64로 변환
      let base64Images: string[] = []
      if (uploadedImages.length > 0) {
        base64Images = await Promise.all(
          uploadedImages.map(file => convertFileToBase64(file))
        )
      }

      const requestBody = {
        type: selectedType,
        prompt: textInput,
        images: base64Images
      }

      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '이미지 생성에 실패했습니다.')
      }

      if (data.success && data.image) {
        setGeneratedImage(data.image)
      } else {
        throw new Error('이미지 데이터를 받지 못했습니다.')
      }

    } catch (error: any) {
      console.error('이미지 생성 오류:', error)
      setError(error.message || '이미지 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="flex h-screen">
        {/* 왼쪽 입력 영역 (30%) */}
        <div className="w-3/10 bg-white/80 backdrop-blur-sm border-r border-white/20 shadow-xl p-6" style={{width: '30%'}}>
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              AI 이미지 생성기
            </h1>
            <p className="text-gray-600 text-sm font-medium">창의적인 아이디어를 시각적 현실로</p>
          </div>
          
          {/* 생성 방식 선택 */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              생성 방식 선택
            </label>
            <select 
              className="w-full p-4 bg-white/70 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-medium"
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value as GenerationType)
                setUploadedImages([])
                setTextInput('')
              }}
            >
              <option value="이미지 생성">✨ 이미지 생성</option>
              <option value="이미지 변경">🎨 이미지 변경</option>
              <option value="이미지 결합">🔄 이미지 결합</option>
            </select>
            
            {/* 생성 방식 설명 */}
            <p className="text-xs text-gray-600 mt-2 leading-relaxed">
              {getTypeDescription(selectedType)}
            </p>
          </div>

          {/* 이미지 업로드 영역 (이미지 변경, 결합 시에만 표시) */}
          {(selectedType === '이미지 변경' || selectedType === '이미지 결합') && (
            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                이미지 업로드
              </label>
              <div className="border-2 border-dashed border-blue-200 rounded-2xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-300 bg-gradient-to-br from-blue-50/20 to-purple-50/20">
                <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Upload className="h-8 w-8 text-blue-600" />
                </div>
                <p className="text-sm text-gray-700 mb-4 font-medium">{getImageUploadText()}</p>
                <input
                  type="file"
                  accept="image/*"
                  multiple={selectedType === '이미지 결합'}
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  이미지 선택
                </label>
              </div>
              
              {/* 업로드된 이미지 목록 */}
              {uploadedImages.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">업로드된 이미지:</h4>
                  <div className="space-y-3">
                    {uploadedImages.map((file, index) => (
                      <div key={index} className="flex items-center p-3 bg-white/60 rounded-xl border border-gray-200 shadow-sm">
                        <div className="bg-green-100 rounded-lg p-2 mr-3">
                          <ImageIcon className="h-4 w-4 text-green-600" />
                        </div>
                        <span className="text-sm text-gray-700 truncate font-medium">{file.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 텍스트 입력 영역 */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              이미지 설명
            </label>
            <textarea
              value={textInput}
              onChange={(e) => {
                setTextInput(e.target.value)
                if (error) setError(null) // 입력 시 에러 메시지 제거
              }}
              placeholder={getPlaceholder()}
              rows={5}
              className="w-full p-4 bg-white/70 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200 font-medium placeholder:text-gray-500"
            />
            {(selectedType === '이미지 변경' || selectedType === '이미지 결합') && (
              <p className="text-xs text-blue-600 mt-2 leading-relaxed">
                💡 AI가 업로드된 이미지를 자동으로 분석하여 유지할 요소와 변경할 요소를 지능적으로 구분합니다.
              </p>
            )}
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* 생성 버튼 */}
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !textInput.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isGenerating ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>
                  {selectedType === '이미지 변경' ? '이미지 분석 및 변경 중...' : 
                   selectedType === '이미지 결합' ? '이미지 분석 및 합성 중...' : 
                   '이미지 생성 중...'}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                {getTypeIcon(selectedType)}
                <span>이미지 생성하기</span>
              </div>
            )}
          </button>
        </div>

        {/* 오른쪽 결과 영역 (70%) */}
        <div className="flex-1 p-8" style={{width: '70%'}}>
          <div className="h-full relative">
                         <div className="absolute top-0 left-0 right-0 bg-white rounded-t-3xl p-6 border-b border-gray-200">
               <div className="flex items-center justify-between">
                 <h2 className="text-xl font-bold text-gray-800">생성 결과</h2>
               </div>
             </div>
            
                         <div className="pt-20 h-full flex items-center justify-center border-2 border-dashed border-purple-200 rounded-3xl bg-gradient-to-br from-white/90 to-purple-50/90 overflow-hidden">
               {isGenerating ? (
                 <div className="text-center text-gray-600">
                   <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 animate-pulse">
                     <Sparkles className="h-12 w-12 text-purple-600 animate-spin" />
                   </div>
                   <h2 className="text-2xl font-bold text-gray-800 mb-3">AI가 이미지를 생성하고 있습니다</h2>
                   <p className="text-gray-600 font-medium">
                     {selectedType === '이미지 변경' ? '업로드된 이미지를 분석하여 정교하게 변경하는 중입니다...' :
                      selectedType === '이미지 결합' ? '이미지들을 분석하여 자연스럽게 합성하는 중입니다...' :
                      '잠시만 기다려주세요...'}
                   </p>
                   <div className="mt-8 flex items-center justify-center space-x-1">
                     {[...Array(8)].map((_, i) => (
                       <div
                         key={i}
                         className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"
                         style={{animationDelay: `${i * 0.1}s`}}
                       ></div>
                     ))}
                   </div>
                 </div>
               ) : generatedImage ? (
                 <div className="w-full h-full flex flex-col p-4">
                   {/* 이미지 영역 - 스크롤 가능 */}
                   <div className="flex-1 flex items-center justify-center mb-6 overflow-auto">
                     <div className="relative max-w-full">
                       <img
                         src={`data:image/png;base64,${generatedImage}`}
                         alt="생성된 이미지"
                         className="max-w-full h-auto object-contain rounded-2xl shadow-2xl"
                         style={{ maxHeight: 'calc(100vh - 300px)' }}
                       />
                       <div className="absolute -bottom-2 -right-2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                         완성!
                       </div>
                     </div>
                   </div>
                   
                   {/* 고정된 버튼 영역 */}
                   <div className="flex-shrink-0 flex justify-center space-x-4 pb-4">
                     <button
                       onClick={() => {
                         const link = document.createElement('a')
                         link.href = `data:image/png;base64,${generatedImage}`
                         link.download = `ai-generated-image-${Date.now()}.png`
                         document.body.appendChild(link)
                         link.click()
                         document.body.removeChild(link)
                       }}
                       className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
                     >
                       📥 다운로드
                     </button>
                     <button
                       onClick={() => {
                         setGeneratedImage(null)
                         setTextInput('')
                         setUploadedImages([])
                       }}
                       className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
                     >
                       ✨ 새로 생성
                     </button>
                   </div>
                 </div>
               ) : (
                <div className="text-center text-gray-600">
                  <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                    <ImageIcon className="h-12 w-12 text-purple-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">생성된 이미지가 여기에 표시됩니다</h2>
                  <p className="text-gray-600 font-medium">왼쪽에서 옵션을 선택하고 이미지를 생성해보세요</p>
                  <div className="mt-8 grid grid-cols-3 gap-4 max-w-md mx-auto">
                    <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg p-4 text-center">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                      <p className="text-xs font-medium text-blue-700">창의적</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg p-4 text-center">
                      <Palette className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                      <p className="text-xs font-medium text-purple-700">정교함</p>
                    </div>
                    <div className="bg-gradient-to-br from-pink-100 to-pink-200 rounded-lg p-4 text-center">
                      <Layers className="w-8 h-8 mx-auto mb-2 text-pink-600" />
                      <p className="text-xs font-medium text-pink-700">고품질</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 