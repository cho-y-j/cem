// camelCase를 snake_case로 변환하는 유틸리티 함수
export function toSnakeCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // camelCase를 snake_case로 변환
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  
  return result;
}

// snake_case를 camelCase로 변환하는 유틸리티 함수
export function toCamelCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // snake_case를 camelCase로 변환
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  
  return result;
}


// 배열의 각 객체를 camelCase로 변환
export function toCamelCaseArray(arr: Record<string, any>[]): Record<string, any>[] {
  return arr.map(obj => toCamelCase(obj));
}

