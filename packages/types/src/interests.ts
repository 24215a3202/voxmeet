// ============================================
// Interest Tags — Server-Authoritative Whitelist
// ============================================

export const INTEREST_TAGS = [
  'music',
  'gaming',
  'tech',
  'sports',
  'movies',
  'telugu',
  'anime',
  'art',
  'travel',
  'food',
  'science',
  'books',
  'fashion',
  'fitness',
  'politics',
  'news',
  'comedy',
  'nature',
  'photography',
] as const;


export type InterestTag = (typeof INTEREST_TAGS)[number];

export const MAX_INTERESTS = 5;
export const MIN_INTERESTS = 1;

export function isValidInterest(tag: string): tag is InterestTag {
  return INTEREST_TAGS.includes(tag as InterestTag);
}
