export function plainFoodName(name: string): string {
  return name.normalize('NFKC').toLowerCase().replace(/[\p{P}\s]+/gu, '');
}

export function naturalFoodName(plain: string): string {
  return plain.replaceAll('的', '');
}
