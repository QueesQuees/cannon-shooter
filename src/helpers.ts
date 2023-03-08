export function degToRad(deg: number) {
  return deg * (Math.PI / 180);
}

export function randomInRange(min: number, max: number): number {
  let result = Math.random() * (max - min) + min;

  if (min < 0) {
    if (max < 0) {
      min = Math.abs(min);
      result = Math.random() * (min + max) - min;
    }
  } else {
    if (max > 0) {
      min = min * -1;
      result = Math.random() * (min + max) - min;
    }
  }

  return result;
}
