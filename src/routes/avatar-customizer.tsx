import React, { useState, useEffect, useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { fetchSvgContent, applyColorToSvg } from '../lib/svg-utils'
import * as domtoimage from 'dom-to-image'

export const Route = createFileRoute('/avatar-customizer')({
  component: AvatarCustomizer,
})

const assetCategories = [
  'backgrounds',
  'face_shape',
  'eyes',
  'eyebrows',
  'hair',
  'mouths',
  'nose',
  'facial_hair',
  'ears',
  'accessories_glasses',
  'accessories_earrings',
  'details_face',
]

const initialAssets: { [key: string]: string[] } = {
  backgrounds: ['bg-blue', 'bg-green', 'bg-none', 'bg-purple', 'bg-yellow'],
  face_shape: ['face-diamond', 'face-heart', 'face-oval', 'face-round', 'face-square'],
  eyes: ['eyes-bored', 'eyes-closed', 'eyes-crying', 'eyes-happy', 'eyes-neutral', 'eyes-sleepy', 'eyes-surprised', 'eyes-wink'],
  eyebrows: ['eyebrows-angry', 'eyebrows-bushy', 'eyebrows-neutral', 'eyebrows-raised', 'eyebrows-sad'],
  hair: ['hair-afro', 'hair-bald', 'hair-bun', 'hair-long', 'hair-ponytail', 'hair-short', 'hair-sidepart', 'hair-spiky'],
  mouths: ['mouth-frown', 'mouth-line', 'mouth-open-smile', 'mouth-smile', 'mouth-smirk', 'mouth-surprised'],
  nose: ['nose-button', 'nose-hooked', 'nose-line', 'nose-normal', 'nose-pointed', 'nose-wide'],
  facial_hair: ['facialhair-fullbeard', 'facialhair-goatee', 'facialhair-mustache', 'facialhair-none', 'facialhair-stubble'],
  ears: ['ears-detached', 'ears-elf', 'ears-normal', 'ears-pointy', 'ears-round-1', 'ears-round-2'],
  accessories_glasses: ['glasses-monocle', 'glasses-none', 'glasses-round', 'glasses-square', 'glasses-sunnies'],
  accessories_earrings: ['earrings-dangle', 'earrings-gauge', 'earrings-hoop', 'earrings-none', 'earrings-stud'],
  details_face: ['details-beautymark', 'details-blush', 'details-freckles', 'details-none', 'details-scar'],
}

function AvatarCustomizer() {
  const [selectedElements, setSelectedElements] = useState({
    backgrounds: 'bg-blue',
    face_shape: 'face-round',
    eyes: 'eyes-neutral',
    eyebrows: 'eyebrows-neutral',
    hair: 'hair-short',
    mouths: 'mouth-smile',
    nose: 'nose-normal',
    facial_hair: 'facialhair-none',
    ears: 'ears-normal',
    accessories_glasses: 'glasses-none',
    accessories_earrings: 'earrings-none',
    details_face: 'details-none',
  })

  const [colors, setColors] = useState({
    hair: '#000000',
    face: '#FFDBB4',
    eyes: '#000000',
    mouth: '#FF4858',
    background: '#ADD8E6',
  })

  const [svgContents, setSvgContents] = useState<{ [key: string]: string | null }>({})
  const avatarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadSvgs = async () => {
      const newSvgContents: { [key: string]: string | null } = {}
      for (const category of assetCategories) {
        const assetName = selectedElements[category as keyof typeof selectedElements]
        if (assetName && !assetName.includes('none')) {
          const path = `/src/assets/avatar_assets_facial_focus/${category}/${assetName}.svg`
          newSvgContents[category] = await fetchSvgContent(path)
        } else {
          newSvgContents[category] = null
        }
      }
      setSvgContents(newSvgContents)
    }
    loadSvgs()
  }, [selectedElements])

  const handleElementChange = (category: string, assetName: string) => {
    setSelectedElements((prev) => ({ ...prev, [category]: assetName }))
  }

  const handleColorChange = (part: string, color: string) => {
    setColors((prev) => ({ ...prev, [part]: color }))
  }

  const exportAvatar = () => {
    if (avatarRef.current) {
      domtoimage.toPng(avatarRef.current)
        .then(function (dataUrl) {
          const link = document.createElement('a')
          link.download = 'avatar.png'
          link.href = dataUrl
          link.click()
        })
        .catch(function (error) {
          console.error('oops, something went wrong!', error)
        })
    }
  }

  return (
    <div className="flex flex-col items-center p-4">
      <h1 className="text-2xl font-bold mb-4">Avatar Customizer</h1>

      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl">
        {/* Avatar Preview */}
        <div className="relative w-64 h-64 bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
          <div ref={avatarRef} className="relative w-full h-full">
            {assetCategories.map((category) => {
              const svgContent = svgContents[category]
              if (!svgContent) return null

              let coloredSvg = svgContent
              if (category === 'hair') {
                coloredSvg = applyColorToSvg(svgContent, colors.hair)
              } else if (category === 'face_shape') {
                coloredSvg = applyColorToSvg(svgContent, colors.face)
              } else if (category === 'eyes') {
                coloredSvg = applyColorToSvg(svgContent, colors.eyes)
              } else if (category === 'mouths') {
                coloredSvg = applyColorToSvg(svgContent, colors.mouth)
              } else if (category === 'backgrounds') {
                coloredSvg = applyColorToSvg(svgContent, colors.background)
              }

              return (
                <div
                  key={category}
                  className="absolute w-full h-full object-contain"
                  dangerouslySetInnerHTML={{ __html: coloredSvg }}
                />
              )
            })}
          </div>
        </div>

        {/* Controls */}
        <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assetCategories.map((category) => (
            <div key={category} className="border p-3 rounded-md">
              <h4 className="font-semibold mb-2 capitalize">
                {category.replace(/_/g, ' ')}
              </h4>
              <select
                value={selectedElements[category as keyof typeof selectedElements]}
                onChange={(e) => handleElementChange(category, e.target.value)}
                className="w-full p-2 border rounded"
              >
                {initialAssets[category].map((asset) => (
                  <option key={asset} value={asset}>
                    {asset.replace(category.replace(/_/g, '-') + '-', '').replace(/-/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {/* Color Pickers */}
          <div className="border p-3 rounded-md col-span-full">
            <h4 className="font-semibold mb-2">Colors</h4>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(colors).map(([part, color]) => (
                <div key={part} className="flex items-center gap-2">
                  <label className="capitalize">{part}:</label>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => handleColorChange(part, e.target.value)}
                    className="w-12 h-8"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={exportAvatar}
            className="col-span-full bg-blue-500 text-white p-3 rounded-md hover:bg-blue-600"
          >
            Export Avatar
          </button>
        </div>
      </div>
    </div>
  )
}
