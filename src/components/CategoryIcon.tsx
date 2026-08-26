import type { Category } from '../lib/types'

/** 카테고리별 최소 선 아이콘. 장소 이미지가 없을 때 대표 이미지 자리에 채운다 */
export function CategoryIcon({ category, size = 20 }: { category: Category; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (category) {
    case '카페':
      return (
        <svg {...common}>
          <path d="M5 9h11v5a5 5 0 0 1-5 5H9a4 4 0 0 1-4-4V9Z" />
          <path d="M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16" />
          <path d="M8 5.5c0 .8-1 1-1 2" />
          <path d="M11.5 5.5c0 .8-1 1-1 2" />
        </svg>
      )
    case '식당':
      return (
        <svg {...common}>
          <path d="M8 3v7a2 2 0 1 1-4 0V3" />
          <path d="M6 10v11" />
          <path d="M17 3c-1.5 0-2.5 1.5-2.5 4s1 4 2.5 4v10" />
        </svg>
      )
    case '전시':
      return (
        <svg {...common}>
          <rect x="3.5" y="4.5" width="17" height="14" rx="1.5" />
          <circle cx="9" cy="10" r="1.6" />
          <path d="M4 16.5 9.5 12l3 2.5L17 10l3 4.5" />
        </svg>
      )
    case '쇼핑':
      return (
        <svg {...common}>
          <path d="M6.5 8h11l1 12.5h-13L6.5 8Z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
      )
    case '산책':
      return (
        <svg {...common}>
          <ellipse cx="15" cy="6.5" rx="1.7" ry="2.2" transform="rotate(20 15 6.5)" />
          <path d="M12.5 10c-.5 1.7.3 2.6 1.3 3.4 1.2 1 1.6 1.8 1.1 3.4-.5 1.6-2 2.2-3.4 1.7" />
          <ellipse cx="8.7" cy="15.3" rx="1.7" ry="2.2" transform="rotate(-15 8.7 15.3)" />
        </svg>
      )
    case '관광':
      return (
        <svg {...common}>
          <path d="M12 3 4 10.5h2V20h4v-5h4v5h4v-9.5h2L12 3Z" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="10.5" r="3" />
          <path d="M12 21c4-4.2 7-7.6 7-10.8A7 7 0 0 0 5 10.2C5 13.4 8 16.8 12 21Z" />
        </svg>
      )
  }
}
