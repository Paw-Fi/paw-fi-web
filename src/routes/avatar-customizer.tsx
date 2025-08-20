import React, { useState, useEffect, useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { fetchSvgContent, applyColorToSvg } from '../lib/svg-utils'
import * as domtoimage from 'dom-to-image'

export const Route = createFileRoute('/avatar-customizer')({
  component: AvatarCustomizer,
})

// Category configuration with display names and icons
const categoryConfig = {
  face: { name: 'Face Shape', icon: '👤', color: 'from-pink-500 to-rose-600' },
  ears: { name: 'Ears', icon: '👂', color: 'from-amber-500 to-orange-600' },
  shirts: { name: 'Clothing', icon: '👕', color: 'from-blue-500 to-indigo-600' },
  hair: { name: 'Hair Style', icon: '💇', color: 'from-purple-500 to-violet-600' },
  brow: { name: 'Eyebrows', icon: '🤨', color: 'from-green-500 to-emerald-600' },
  eyes: { name: 'Eyes', icon: '👁️', color: 'from-cyan-500 to-teal-600' },
  nose: { name: 'Nose', icon: '👃', color: 'from-red-500 to-pink-600' },
  mouth: { name: 'Mouth', icon: '👄', color: 'from-yellow-500 to-amber-600' },
  blush: { name: 'Blush', icon: '😊', color: 'from-rose-500 to-pink-600' },
  accessories: { name: 'Accessories', icon: '👓', color: 'from-indigo-500 to-purple-600' },
  stars: { name: 'Decorations', icon: '⭐', color: 'from-yellow-500 to-orange-600' },
}

const assetCategories = Object.keys(categoryConfig)

const initialAssets: { [key: string]: string[] } = {
  face: ['Face1', 'Face2', 'Face3', 'Face4', 'Face5', 'Face6', 'Face7', 'Face8'],
  ears: ['Ear1', 'Ear2', 'Ear3', 'Ear4', 'Ear5', 'Ear6', 'Ear7', 'Ear8', 'Ear9', 'Ear10'],
  shirts: ['Shirt1', 'Shirt2', 'Shirt3', 'Shirt4', 'Shirt5', 'Shirt6', 'Shirt7', 'Shirt8'],
  hair: ['hair1', 'hair2', 'hair3', 'hair4', 'hair5', 'hair6', 'hair7', 'hair8', 'hair9', 'hair10'],
  brow: ['Brow1', 'Brow2', 'Brow3', 'Brow4', 'Brow5', 'Brow6', 'Brow7', 'Brow8'],
  eyes: ['Eyes1', 'Eyes2', 'Eyes3', 'Eyes4', 'Eyes5', 'Eyes6', 'Eyes7', 'Eyes8'],
  nose: ['Nose1', 'Nose2', 'Nose3', 'Nose4', 'Nose5', 'Nose6', 'Nose7', 'Nose8'],
  mouth: ['Mouth1', 'Mouth2', 'Mouth3', 'Mouth4', 'Mouth5', 'Mouth6', 'Mouth7', 'Mouth8'],
  blush: ['blush1', 'blush2', 'blush3', 'blush4', 'blush5', 'blush6'],
  accessories: ['Accessories1', 'Accessories2', 'Accessories3', 'Accessories4', 'Accessories5', 'Accessories6', 'Accessories7', 'Accessories8'],
  stars: ['Star1', 'Star2', 'Star3', 'Star4', 'Star5', 'Star6'],
}

function AvatarCustomizer() {
  const [selectedElements, setSelectedElements] = useState({
    face: 'Face1',
    ears: 'Ear1',
    shirts: 'Shirt1',
    hair: 'hair1',
    brow: 'Brow1',
    eyes: 'Eyes1',
    nose: 'Nose1',
    mouth: 'Mouth1',
    blush: 'blush1',
    accessories: 'Accessories1',
    stars: 'Star1',
  })

  const [activeCategory, setActiveCategory] = useState('face')
  const [colors, setColors] = useState({
    hair: '#8B4513',
    face: '#FDBCB4',
    eyes: '#4A4A4A',
    mouth: '#FF6B6B',
  })

  const [svgContents, setSvgContents] = useState<{ [key: string]: string | null }>({})
  const [assetPreviews, setAssetPreviews] = useState<{ [key: string]: { [key: string]: string | null } }>({})
  const avatarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadSvgs = async () => {
      const newSvgContents: { [key: string]: string | null } = {}
      for (const category of assetCategories) {
        const assetName = selectedElements[category as keyof typeof selectedElements]
        if (assetName) {
          const categoryMap: { [key: string]: string } = {
            face: '1.face',
            ears: '2.ears',
            shirts: '3.shirts',
            hair: '4.hair',
            brow: '5.brow',
            eyes: '6.eyes',
            nose: '7.nose',
            mouth: '8.mouth',
            blush: '9.blush',
            accessories: '10.accessories',
            stars: '11.stars',
          }
          const path = `/src/assets/images/avatar/${categoryMap[category]}/${assetName}.svg`
          newSvgContents[category] = await fetchSvgContent(path)
        } else {
          newSvgContents[category] = null
        }
      }
      setSvgContents(newSvgContents)
    }
    loadSvgs()
  }, [selectedElements])

  // Load preview images for the active category
  useEffect(() => {
    const loadPreviews = async () => {
      if (assetPreviews[activeCategory]) return // Already loaded
      
      const categoryMap: { [key: string]: string } = {
        face: '1.face',
        ears: '2.ears',
        shirts: '3.shirts',
        hair: '4.hair',
        brow: '5.brow',
        eyes: '6.eyes',
        nose: '7.nose',
        mouth: '8.mouth',
        blush: '9.blush',
        accessories: '10.accessories',
        stars: '11.stars',
      }

      const previews: { [key: string]: string | null } = {}
      for (const asset of initialAssets[activeCategory]) {
        const path = `/src/assets/images/avatar/${categoryMap[activeCategory]}/${asset}.svg`
        previews[asset] = await fetchSvgContent(path)
      }
      
      setAssetPreviews(prev => ({ ...prev, [activeCategory]: previews }))
    }
    loadPreviews()
  }, [activeCategory])

  const handleElementChange = (category: string, assetName: string) => {
    setSelectedElements((prev) => ({ ...prev, [category]: assetName }))
  }

  const handleColorChange = (part: string, color: string) => {
    setColors((prev) => ({ ...prev, [part]: color }))
  }

  const exportAvatar = () => {
    if (avatarRef.current) {
      domtoimage.toPng(avatarRef.current, {
        width: 400,
        height: 400,
        style: {
          transform: 'scale(2)',
          transformOrigin: 'top left'
        }
      })
        .then(function (dataUrl: any) {
          const link = document.createElement('a')
          link.download = 'my-avatar.png'
          link.href = dataUrl
          link.click()
        })
        .catch(function (error: any) {
          console.error('Export failed:', error)
        })
    }
  }

  const randomizeAvatar = () => {
    const newSelection: any = {}
    assetCategories.forEach(category => {
      const assets = initialAssets[category]
      const randomIndex = Math.floor(Math.random() * assets.length)
      newSelection[category] = assets[randomIndex]
    })
    setSelectedElements(newSelection)
  }

  return (
    <>
      <style>{`
        /* Ensure SVGs are properly centered and scaled */
        .avatar-preview svg,
        .asset-preview svg {
          display: block;
          margin: auto;
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
          object-fit: contain;
        }
        
        .asset-preview {
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
      
      {/* Main Container - Full Height */}
      <div className="h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 flex flex-col">
        
        {/* Header - Fixed Height */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-600/10 to-pink-600/10 dark:from-purple-600/20 dark:to-pink-600/20 backdrop-blur-sm border-b border-gray-200/50 dark:border-white/10">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5QzkyQUMiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30 dark:opacity-50"></div>
          <div className="relative max-w-7xl mx-auto px-6 py-6">
            <div className="text-center">
              <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500 dark:from-purple-400 dark:via-pink-400 dark:to-cyan-400 bg-clip-text text-transparent mb-2">
                Avatar Studio
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Create your unique digital identity with our modern avatar customizer
              </p>
            </div>
          </div>
        </div>

        {/* Content Area - Flex 1 to fill remaining space */}
        <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            
            {/* Avatar Preview - Fixed width on desktop */}
            <div className="lg:col-span-1 order-2 lg:order-1 flex flex-col">
              <div className="bg-white/80 dark:bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-gray-200/50 dark:border-white/20 shadow-xl dark:shadow-2xl flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 text-center">Preview</h3>
                
                {/* Avatar Display - Flex 1 to take available space */}
                <div className="flex-1 flex items-center justify-center mb-6">
                  <div className="relative w-full aspect-square max-w-sm">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl blur-xl"></div>
                    <div 
                      ref={avatarRef} 
                      className="avatar-preview relative w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-2xl overflow-hidden border-2 border-gray-300/50 dark:border-white/20"
                    >
                      {assetCategories.map((category) => {
                        const svgContent = svgContents[category]
                        if (!svgContent) return null

                        let coloredSvg = svgContent
                        if (category === 'hair') {
                          coloredSvg = applyColorToSvg(svgContent, colors.hair)
                        } else if (category === 'face') {
                          coloredSvg = applyColorToSvg(svgContent, colors.face)
                        } else if (category === 'eyes') {
                          coloredSvg = applyColorToSvg(svgContent, colors.eyes)
                        } else if (category === 'mouth') {
                          coloredSvg = applyColorToSvg(svgContent, colors.mouth)
                        }

                        return (
                          <div
                            key={category}
                            className="absolute inset-0 w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
                            dangerouslySetInnerHTML={{ __html: coloredSvg }}
                          />
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Color Controls */}
                <div className="space-y-4 mb-4">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white">Colors</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(colors).map(([part, color]) => (
                      <div key={part} className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 dark:text-gray-300 capitalize min-w-12">{part}</label>
                        <div className="relative">
                          <input
                            type="color"
                            value={color}
                            onChange={(e) => handleColorChange(part, e.target.value)}
                            className="w-8 h-8 rounded-lg border-2 border-gray-300 dark:border-white/20 cursor-pointer bg-transparent"
                          />
                          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 -z-10 blur-sm"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={randomizeAvatar}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 dark:from-purple-600 dark:to-pink-600 dark:hover:from-purple-500 dark:hover:to-pink-500 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
                  >
                    🎲 Randomize
                  </button>
                  <button
                    onClick={exportAvatar}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 dark:from-cyan-600 dark:to-blue-600 dark:hover:from-cyan-500 dark:hover:to-blue-500 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-cyan-500/25"
                  >
                    💾 Export Avatar
                  </button>
                </div>
              </div>
            </div>

            {/* Customization Panel - Flex to fill remaining space */}
            <div className="lg:col-span-2 order-1 lg:order-2 flex flex-col min-h-0">
              {/* Category Tabs */}
              <div className="mb-4 flex-shrink-0">
                <div className="flex flex-wrap gap-2 p-2 bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-white/10">
                  {assetCategories.map((category) => {
                    const config = categoryConfig[category as keyof typeof categoryConfig]
                    const isActive = activeCategory === category
                    return (
                      <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl font-medium transition-all duration-300 text-sm border-2 ${
                          isActive
                            ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/80 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 shadow-lg shadow-indigo-500/20'
                            : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-white/10 hover:border-gray-300/50 dark:hover:border-white/20'
                        }`}
                      >
                        <span className="text-base">{config.icon}</span>
                        <span className="hidden sm:inline">{config.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Asset Gallery - Flex 1 with scrolling */}
              <div className="bg-white/80 dark:bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-gray-200/50 dark:border-white/20 shadow-xl dark:shadow-2xl flex-1 flex flex-col min-h-0">
                <div className="flex items-center gap-3 mb-4 flex-shrink-0">
                  <span className="text-2xl">{categoryConfig[activeCategory as keyof typeof categoryConfig].icon}</span>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                    {categoryConfig[activeCategory as keyof typeof categoryConfig].name}
                  </h3>
                </div>

                {/* Scrollable Gallery Area */}
                <div className="flex-1 overflow-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {initialAssets[activeCategory].map((asset) => {
                      const isSelected = selectedElements[activeCategory as keyof typeof selectedElements] === asset
                      const previewContent = assetPreviews[activeCategory]?.[asset]
                      
                      return (
                        <button
                          key={asset}
                          onClick={() => handleElementChange(activeCategory, asset)}
                          className={`relative aspect-square p-3 rounded-2xl transition-all duration-300 border-2 ${
                            isSelected
                              ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/80 dark:bg-indigo-500/10 shadow-lg shadow-indigo-500/20'
                              : 'border-gray-200/60 dark:border-white/10 bg-gray-100/40 dark:bg-white/5 hover:border-gray-300/80 dark:hover:border-white/20 hover:bg-gray-200/60 dark:hover:bg-white/8'
                          }`}
                        >
                          {/* Preview Image */}
                          <div className="asset-preview w-full h-full overflow-hidden">
                            {previewContent ? (
                              <div
                                className={`w-full h-full flex items-center justify-center ${
                                  activeCategory === 'accessories' || activeCategory === 'stars' ? 'scale-75' : 
                                  activeCategory === 'hair' ? 'scale-90' :
                                  activeCategory === 'shirts' ? 'scale-85' :
                                  'scale-80'
                                }`}
                                dangerouslySetInnerHTML={{ __html: previewContent }}
                                style={{
                                  transformOrigin: 'center',
                                  filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.2))'
                                }}
                              />
                            ) : (
                              <div className="animate-pulse bg-gray-200/80 dark:bg-white/10 rounded-lg w-full h-full"></div>
                            )}
                          </div>
                          
                        
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}