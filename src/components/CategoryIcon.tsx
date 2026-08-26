import type { Category } from '../lib/types'

const CATEGORY_EMOJI: Record<Category, string> = {
  식당: '🍚',
  카페: '☕',
  전시: '🖼️',
  쇼핑: '👚',
  산책: '🚶‍♂️‍➡️',
  관광: '🚃',
  기타: '🛒',
}

/** 카테고리별 대표 이모지. 장소 이미지가 없을 때 대표 이미지 자리에 채운다 */
export function CategoryIcon({ category, size = 20 }: { category: Category; size?: number }) {
  return (
    <span aria-hidden style={{ fontSize: size, lineHeight: 1 }}>
      {CATEGORY_EMOJI[category]}
    </span>
  )
}
