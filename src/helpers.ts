export type GameImage = {
  image: HTMLImageElement;
  isImageLoaded: boolean;
  w: number;
  h: number;
  x: number;
  y: number;
};

export type GameSound = HTMLAudioElement;

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

export function randomInRangeInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function createGameImage(): GameImage {
  return {
    image: new Image(),
    isImageLoaded: false,
    w: 0,
    h: 0,
    x: Infinity,
    y: Infinity,
  };
}

export function drawGameImage(
  context: CanvasRenderingContext2D,
  gameImage: GameImage
) {
  if (gameImage.isImageLoaded)
    context.drawImage(
      gameImage.image,
      gameImage.x,
      gameImage.y,
      gameImage.w,
      gameImage.h
    );
}

export function createSound(src: string): GameSound {
  const sound = document.createElement("audio");
  sound.src = src;
  sound.setAttribute("preload", "auto");
  sound.setAttribute("controls", "none");
  sound.style.display = "none";
  document.body.appendChild(sound);

  return sound;
}

export function linearInterpolateAnimation<
  T extends Record<K, number>,
  K extends string
>(
  animateVal: K,
  currentState: T,
  keyframes: T[],
  deltaTime: number,
  duration: number
) {
  const deltaVal = keyframes[1][animateVal] - keyframes[0][animateVal];
  const clampFunc = deltaVal < 0 ? Math.max : Math.min;

  currentState[animateVal] = clampFunc(
    currentState[animateVal] + deltaTime * (deltaVal / duration),
    keyframes[1][animateVal]
  ) as T[K];

  return currentState[animateVal];
}

export function moveCoordinatesAnimation<
  T extends Record<K, any>,
  K extends string
>(
  animateVal: K,
  currentState: T,
  keyframes: T[any],
  deltaTime: number,
  duration: number
) {
  // const deltaVal = keyframes[1][animateVal] - keyframes[0][animateVal];
  // const clampFunc = deltaVal < 0 ? Math.max : Math.min;

  // currentState[animateVal] = clampFunc(
  //   currentState[animateVal] + deltaTime * (deltaVal / duration),
  //   keyframes[1][animateVal]
  // ) as T[K];

  const xX = keyframes[0].x - keyframes[1].x;
  const yY = keyframes[0].y - keyframes[1].y;

  return currentState[animateVal];
}
