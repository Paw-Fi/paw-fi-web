// Avatar template presets for quick creation
export interface AvatarTemplate {
  id: string;
  name: string;
  description: string;
  category: 'professional' | 'casual' | 'creative' | 'fun';
  elements: {
    face: string;
    ears: string;
    shirts: string;
    hair: string;
    brow: string;
    eyes: string;
    nose: string;
    mouth: string;
    blush: string;
    accessories: string;
    stars: string;
  };
  colors: {
    hair: string;
    face: string;
    eyes: string;
    mouth: string;
  };
}

export const avatarTemplates: AvatarTemplate[] = [
  {
    id: 'professional-1',
    name: 'Business Professional',
    description: 'Clean, professional look perfect for work profiles',
    category: 'professional',
    elements: {
      face: 'Face1',
      ears: 'Ear1',
      shirts: 'Shirt1',
      hair: 'hair2',
      brow: 'Brow2',
      eyes: 'Eyes1',
      nose: 'Nose1',
      mouth: 'Mouth2',
      blush: 'blush1',
      accessories: 'Accessories1',
      stars: 'Star1'
    },
    colors: {
      hair: '#4A4A4A',
      face: '#FDBCB4',
      eyes: '#2D2D2D',
      mouth: '#E57373'
    }
  },
  {
    id: 'professional-2',
    name: 'Executive Style',
    description: 'Sophisticated look for leadership roles',
    category: 'professional',
    elements: {
      face: 'Face3',
      ears: 'Ear2',
      shirts: 'Shirt2',
      hair: 'hair4',
      brow: 'Brow3',
      eyes: 'Eyes3',
      nose: 'Nose2',
      mouth: 'Mouth1',
      blush: 'blush2',
      accessories: 'Accessories2',
      stars: 'Star2'
    },
    colors: {
      hair: '#8B4513',
      face: '#F4C2A1',
      eyes: '#1A1A1A',
      mouth: '#D32F2F'
    }
  },
  {
    id: 'casual-1',
    name: 'Friendly & Approachable',
    description: 'Warm, casual look for everyday use',
    category: 'casual',
    elements: {
      face: 'Face2',
      ears: 'Ear3',
      shirts: 'Shirt3',
      hair: 'hair5',
      brow: 'Brow1',
      eyes: 'Eyes2',
      nose: 'Nose3',
      mouth: 'Mouth3',
      blush: 'blush3',
      accessories: 'Accessories3',
      stars: 'Star3'
    },
    colors: {
      hair: '#CD853F',
      face: '#FFD7BA',
      eyes: '#4E342E',
      mouth: '#FF7043'
    }
  },
  {
    id: 'casual-2',
    name: 'Relaxed Vibe',
    description: 'Laid-back style for social profiles',
    category: 'casual',
    elements: {
      face: 'Face4',
      ears: 'Ear4',
      shirts: 'Shirt4',
      hair: 'hair6',
      brow: 'Brow4',
      eyes: 'Eyes4',
      nose: 'Nose4',
      mouth: 'Mouth4',
      blush: 'blush4',
      accessories: 'Accessories4',
      stars: 'Star4'
    },
    colors: {
      hair: '#A0522D',
      face: '#F8BBD9',
      eyes: '#3E2723',
      mouth: '#FF5722'
    }
  },
  {
    id: 'creative-1',
    name: 'Artistic Expression',
    description: 'Bold, creative look for artists and designers',
    category: 'creative',
    elements: {
      face: 'Face5',
      ears: 'Ear5',
      shirts: 'Shirt5',
      hair: 'hair7',
      brow: 'Brow5',
      eyes: 'Eyes5',
      nose: 'Nose5',
      mouth: 'Mouth5',
      blush: 'blush5',
      accessories: 'Accessories5',
      stars: 'Star5'
    },
    colors: {
      hair: '#9C27B0',
      face: '#FFCDD2',
      eyes: '#6A1B9A',
      mouth: '#E91E63'
    }
  },
  {
    id: 'creative-2',
    name: 'Innovative Thinker',
    description: 'Unique style for creative professionals',
    category: 'creative',
    elements: {
      face: 'Face6',
      ears: 'Ear6',
      shirts: 'Shirt6',
      hair: 'hair8',
      brow: 'Brow6',
      eyes: 'Eyes6',
      nose: 'Nose6',
      mouth: 'Mouth6',
      blush: 'blush6',
      accessories: 'Accessories6',
      stars: 'Star6'
    },
    colors: {
      hair: '#00BCD4',
      face: '#E1F5FE',
      eyes: '#006064',
      mouth: '#FF4081'
    }
  },
  {
    id: 'fun-1',
    name: 'Playful & Energetic',
    description: 'Fun, vibrant look for social media',
    category: 'fun',
    elements: {
      face: 'Face7',
      ears: 'Ear7',
      shirts: 'Shirt7',
      hair: 'hair9',
      brow: 'Brow7',
      eyes: 'Eyes7',
      nose: 'Nose7',
      mouth: 'Mouth7',
      blush: 'blush1',
      accessories: 'Accessories7',
      stars: 'Star1'
    },
    colors: {
      hair: '#FF9800',
      face: '#FFF3E0',
      eyes: '#E65100',
      mouth: '#FF6F00'
    }
  },
  {
    id: 'fun-2',
    name: 'Party Ready',
    description: 'Lively style perfect for celebrations',
    category: 'fun',
    elements: {
      face: 'Face8',
      ears: 'Ear8',
      shirts: 'Shirt8',
      hair: 'hair10',
      brow: 'Brow8',
      eyes: 'Eyes8',
      nose: 'Nose8',
      mouth: 'Mouth8',
      blush: 'blush2',
      accessories: 'Accessories8',
      stars: 'Star2'
    },
    colors: {
      hair: '#F44336',
      face: '#FFEBEE',
      eyes: '#C62828',
      mouth: '#E53935'
    }
  }
];

export const getTemplatesByCategory = (category: AvatarTemplate['category']) => {
  return avatarTemplates.filter(template => template.category === category);
};

export const getTemplateById = (id: string) => {
  return avatarTemplates.find(template => template.id === id);
};