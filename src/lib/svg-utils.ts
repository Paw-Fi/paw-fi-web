export async function fetchSvgContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const svgText = await response.text()
    return svgText
  } catch (error) {
    console.error("Error fetching SVG:", error)
    return null
  }
}

export function applyColorToSvg(svgContent: string, color: string): string {
  // This is a simplified approach. A more robust solution might involve
  // parsing the SVG as XML and manipulating specific elements (e.g., paths, circles).
  // For now, we'll try to replace common fill/stroke attributes.
  let modifiedSvg = svgContent

  // Replace existing fill attributes that are not 'none'
  modifiedSvg = modifiedSvg.replace(/fill="(?!none)[^"]*"/g, `fill="${color}"`);
  // Replace existing stroke attributes that are not 'none'
  modifiedSvg = modifiedSvg.replace(/stroke="(?!none)[^"]*"/g, `stroke="${color}"`);

  // If no fill/stroke is present, add a default fill to the main path/shape
  // This part is tricky and might need more specific targeting based on SVG structure
  // For demonstration, let's assume we want to target the main path or shape.
  // This might not work for all SVGs and could require more sophisticated parsing.
  if (!modifiedSvg.includes('fill=') && !modifiedSvg.includes('stroke=')) {
    // Attempt to add fill to common SVG elements if not present
    modifiedSvg = modifiedSvg.replace(/<path/g, `<path fill="${color}"`);
    modifiedSvg = modifiedSvg.replace(/<circle/g, `<circle fill="${color}"`);
    modifiedSvg = modifiedSvg.replace(/<rect/g, `<rect fill="${color}"`);
    modifiedSvg = modifiedSvg.replace(/<polygon/g, `<polygon fill="${color}"`);
  }

  return modifiedSvg
}

