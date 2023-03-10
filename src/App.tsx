import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import Projectile from "./cannon_shooter_assets/bullet.png";
import CannonBack from "./cannon_shooter_assets/cannon_back.png";
import CannonFront from "./cannon_shooter_assets/cannon_front.png";
import CannonWheel from "./cannon_shooter_assets/cannon_wheel.png";
import Cloud1 from "./cannon_shooter_assets/cloud1.png";
import Cloud2 from "./cannon_shooter_assets/cloud2.png";
import Cloud3 from "./cannon_shooter_assets/cloud3.png";
import Cloud4 from "./cannon_shooter_assets/cloud4.png";
import Spark from "./cannon_shooter_assets/spark.png";
import CannonFireSound from "./cannon_shooter_sounds/cannon_fire.wav";
import * as GameSettings from "./GameConstants";
import {
  createGameImage,
  createSound,
  drawGameImage,
  GameImage,
  linearInterpolateAnimation,
  randomInRange,
} from "./helpers";

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIdRef = useRef<number | undefined>();
  const lastTimeRef = useRef<number>(0);

  //game props
  const [gameProps, setGameProps] = useState<{
    canvas: HTMLCanvasElement | null;
    context: CanvasRenderingContext2D | null;
  }>({
    canvas: null,
    context: null,
  });

  const gameStates = useRef({
    interactionSeparateLine: 0,
    willFire: false,
    fired: false,
  });

  const mouseProps = useRef<{
    startPos: { x: number; y: number };
    currentPos: { x: number; y: number };
    pressed: boolean;
  }>({ startPos: { x: 0, y: 0 }, currentPos: { x: 0, y: 0 }, pressed: false });

  //background
  const cloudProps = useRef<
    (GameImage & {
      speed: number;
    })[]
  >([]);

  const loadCloudImages = useCallback(() => {
    cloudProps.current = [Cloud1, Cloud2, Cloud3, Cloud4].map(img => {
      const res = {
        ...createGameImage(),
        speed: 0,
      };
      res.image.onload = () => {
        res.isImageLoaded = true;
      };
      res.image.src = img;

      return res;
    });
  }, []);

  const cloudsUpdate = useCallback(
    (delta: number) => {
      cloudProps.current.forEach(item => {
        if (gameProps.canvas && item.isImageLoaded) {
          if (item.x === Infinity || item.y === Infinity) {
            const scale = randomInRange(0.5, 1);
            item.w = item.image.width * scale;
            item.h = item.image.height * scale;

            item.x = randomInRange(
              -item.w / 2,
              gameProps.canvas.width + item.w / 2
            );
            item.y = randomInRange(10, gameProps.canvas.height / 3);
            item.speed = randomInRange(
              GameSettings.CLOUD_SPEED_RANGE[0],
              GameSettings.CLOUD_SPEED_RANGE[1]
            );
          } else if (item.x > gameProps.canvas.width) {
            const scale = randomInRange(0.5, 1);
            item.w = item.image.width * scale;
            item.h = item.image.height * scale;

            item.x = -(item.w + randomInRange(0, 50));
            item.y = randomInRange(0, gameProps.canvas.height / 3);
            item.speed = randomInRange(
              GameSettings.CLOUD_SPEED_RANGE[0],
              GameSettings.CLOUD_SPEED_RANGE[1]
            );
          } else {
            item.x += (item.speed * delta) / 1000;
          }
        }
      });
    },
    [gameProps.canvas]
  );

  const cloudsDraw = useCallback(() => {
    if (gameProps.context && gameProps.canvas) {
      gameProps.context.save();

      cloudProps.current.forEach(item => {
        if (gameProps.context) {
          drawGameImage(gameProps.context, item);
        }
      });

      gameProps.context.restore();
    }
  }, [gameProps.canvas, gameProps.context]);

  const backgroundDraw = useCallback(() => {
    if (gameProps.context && gameProps.canvas) {
      const { width, height } = gameProps.canvas;
      gameProps.context.save();

      // draw sky
      const grd = gameProps.context.createLinearGradient(0, 0, 0, height);
      grd.addColorStop(0, "#3291ce");
      grd.addColorStop(1, "#ffffff");
      gameProps.context.fillStyle = grd;
      gameProps.context.fillRect(0, 0, width, height);

      // draw clouds
      cloudsDraw();

      // draw ground
      gameProps.context.fillStyle = "#929aa0";
      gameProps.context.fillRect(0, height * 0.75, width, height * 0.15);

      gameProps.context.restore();
    }
  }, [cloudsDraw, gameProps.canvas, gameProps.context]);

  //projectile
  const projectileProps = useRef({
    ...createGameImage(),
    // isMoving: false,
    // isDone: false,
    speedX: 0,
    speedY: 0,
    angle: 0,
    rotateDirection: 1,
  });

  const loadProjectileImage = useCallback(() => {
    projectileProps.current.image = new Image();
    projectileProps.current.image.onload = () => {
      projectileProps.current.isImageLoaded = true;
      projectileProps.current.w =
        projectileProps.current.image.width * GameSettings.PROJECTILE_SCALE;
      projectileProps.current.h =
        projectileProps.current.image.height * GameSettings.PROJECTILE_SCALE;
    };
    projectileProps.current.image.src = Projectile;
  }, []);

  const projectileUpdate = useCallback(
    (delta: number) => {
      if (gameProps.canvas) {
        if (
          !gameStates.current.fired &&
          gameStates.current.willFire &&
          !mouseProps.current.pressed
        ) {
          gameStates.current.fired = true;

          // calculate the true position of the projectile,
          // because before being fired, the projectile is rotated by the canvas API, so its position isn't changed
          const sina = Math.sin(cannonProps.current.angle);
          const cosa = Math.cos(cannonProps.current.angle);
          const x =
            projectileProps.current.x +
            projectileProps.current.w / 2 -
            cannonProps.current.pivot.x;
          const y =
            projectileProps.current.y +
            projectileProps.current.h / 2 -
            cannonProps.current.pivot.y;

          projectileProps.current.speedX = sina;
          projectileProps.current.speedY = -cosa;
          projectileProps.current.x =
            x * cosa -
            y * sina -
            projectileProps.current.w / 2 +
            cannonProps.current.pivot.x;
          projectileProps.current.y =
            x * sina +
            y * cosa -
            projectileProps.current.h / 2 +
            cannonProps.current.pivot.y;

          projectileProps.current.angle = cannonProps.current.angle;
          projectileProps.current.rotateDirection = Math.sign(
            cannonProps.current.angle
          );

          cannonProps.current.cannonFireSound.play();
        }

        if (gameStates.current.fired) {
          if (
            projectileProps.current.x <= gameProps.canvas.width &&
            projectileProps.current.y <= gameProps.canvas.height &&
            projectileProps.current.x + projectileProps.current.w >= 0 &&
            projectileProps.current.y + projectileProps.current.h >= 0
          ) {
            const hypotenuse = (delta * GameSettings.PROJECTILE_SPEED) / 1000;
            projectileProps.current.x +=
              hypotenuse * projectileProps.current.speedX;
            projectileProps.current.y +=
              hypotenuse * projectileProps.current.speedY;

            projectileProps.current.angle +=
              (projectileProps.current.rotateDirection *
                (delta * GameSettings.PROJECTILE_ROTATE_SPEED)) /
              1000;
          } else {
            //TODO: fail event
          }
        } else {
          projectileProps.current.x =
            gameProps.canvas.width / 2 - projectileProps.current.w / 2;
          projectileProps.current.y = cannonProps.current.projectileBase;
        }
      }
    },
    [gameProps.canvas]
  );

  //cannon
  const cannonProps = useRef({
    imageFront: createGameImage(),
    imageBack: createGameImage(),
    imageWheel: createGameImage(),
    imageFireSpark: createGameImage(),
    cannonFireSound: createSound(CannonFireSound),
    isAllImagesLoaded: false,
    angle: 0,
    sparkAnimation: GameSettings.FIRE_SPARK_FADE_ANIMATION_KEYFRAMES[0],
    pivot: { x: 0, y: 0 },
    projectileBase: 0,
    willHandleRotate: false,
  });

  const loadCannonImage = useCallback(() => {
    cannonProps.current.imageFront.image.src = CannonFront;
    cannonProps.current.imageBack.image.src = CannonBack;
    cannonProps.current.imageWheel.image.src = CannonWheel;
    cannonProps.current.imageFireSpark.image.src = Spark;

    const imgLoaded = [false, false, false];
    for (const [i, imgObj] of Array.from(
      [
        cannonProps.current.imageBack,
        cannonProps.current.imageFront,
        cannonProps.current.imageWheel,
      ].entries()
    )) {
      imgObj.image.onload = () => {
        imgLoaded[i] = true;
        imgObj.isImageLoaded = true;
        cannonProps.current.isAllImagesLoaded = imgLoaded.every(i => i);
        imgObj.w = imgObj.image.width * GameSettings.CANNON_SCALE;
        imgObj.h = imgObj.image.height * GameSettings.CANNON_SCALE;
      };
    }

    cannonProps.current.imageFireSpark.image.onload = () => {
      cannonProps.current.imageFireSpark.isImageLoaded = true;

      cannonProps.current.imageBack.image.addEventListener("load", () => {
        const ratio =
          cannonProps.current.imageFireSpark.image.height /
          cannonProps.current.imageFireSpark.image.width;

        cannonProps.current.imageFireSpark.w =
          cannonProps.current.imageBack.w * 0.85;
        cannonProps.current.imageFireSpark.h =
          cannonProps.current.imageFireSpark.w * ratio;
      });
    };
  }, []);

  const cannonUpdate = useCallback(
    (delta: number) => {
      if (gameProps.canvas && cannonProps.current.isAllImagesLoaded) {
        for (const imgObj of [
          cannonProps.current.imageBack,
          cannonProps.current.imageFront,
          cannonProps.current.imageWheel,
          cannonProps.current.imageFireSpark,
        ]) {
          imgObj.x = gameProps.canvas.width / 2 - imgObj.w / 2;
        }

        cannonProps.current.imageWheel.y =
          gameStates.current.interactionSeparateLine -
          cannonProps.current.imageWheel.h;

        for (const imgObj of [
          cannonProps.current.imageBack,
          cannonProps.current.imageFront,
        ]) {
          imgObj.y = cannonProps.current.imageWheel.y - imgObj.h + 30;
        }

        cannonProps.current.projectileBase =
          cannonProps.current.imageBack.y - 10;
        cannonProps.current.imageFireSpark.y =
          cannonProps.current.projectileBase - 10;

        cannonProps.current.pivot = {
          x:
            cannonProps.current.imageWheel.x +
            cannonProps.current.imageWheel.w / 2,
          y:
            cannonProps.current.imageWheel.y +
            cannonProps.current.imageWheel.h / 2,
        };

        if (mouseProps.current.pressed) {
          if (mouseProps.current.currentPos.y > cannonProps.current.pivot.y) {
            // if mouse only moves under the pivot, don't do anything
            if (
              !cannonProps.current.willHandleRotate &&
              mouseProps.current.startPos.y > cannonProps.current.pivot.y
            ) {
              cannonProps.current.willHandleRotate = false;
            }

            gameStates.current.willFire = false;
          } else {
            cannonProps.current.willHandleRotate = true;
            gameStates.current.willFire = true;
          }
        } else {
          cannonProps.current.willHandleRotate = false;
        }

        if (cannonProps.current.willHandleRotate) {
          const { x: x1, y: y1 } = cannonProps.current.pivot;
          let { x: x2, y: y2 } = mouseProps.current.currentPos;

          // reverse the mouse y position if it's below the pivot
          if (y1 < y2) {
            y2 = y1 - (y2 - y1);
          }

          let newAngle = -Math.atan((x2 - x1) / (y2 - y1));
          if (Math.abs(newAngle) >= GameSettings.CANNON_ROTATE_ANGLE_LIMIT)
            newAngle =
              GameSettings.CANNON_ROTATE_ANGLE_LIMIT * Math.sign(newAngle);

          cannonProps.current.angle = newAngle;
        }

        if (gameStates.current.fired) {
          if (
            cannonProps.current.sparkAnimation.alpha !==
            GameSettings.FIRE_SPARK_FADE_ANIMATION_KEYFRAMES[1].alpha
          ) {
            linearInterpolateAnimation(
              "alpha",
              cannonProps.current.sparkAnimation,
              GameSettings.FIRE_SPARK_FADE_ANIMATION_KEYFRAMES,
              delta,
              GameSettings.FIRE_SPARK_FADE_TIME * 1000
            );
          }

          if (
            cannonProps.current.sparkAnimation.offset !==
            GameSettings.FIRE_SPARK_FADE_ANIMATION_KEYFRAMES[1].offset
          ) {
            linearInterpolateAnimation(
              "offset",
              cannonProps.current.sparkAnimation,
              GameSettings.FIRE_SPARK_FADE_ANIMATION_KEYFRAMES,
              delta,
              GameSettings.FIRE_SPARK_FADE_TIME * 1000
            );

            cannonProps.current.imageFireSpark.y +=
              cannonProps.current.sparkAnimation.offset;
          }

          if (
            cannonProps.current.sparkAnimation.scale !==
            GameSettings.FIRE_SPARK_FADE_ANIMATION_KEYFRAMES[1].scale
          ) {
            const oldScale = cannonProps.current.sparkAnimation.scale;

            linearInterpolateAnimation(
              "scale",
              cannonProps.current.sparkAnimation,
              GameSettings.FIRE_SPARK_FADE_ANIMATION_KEYFRAMES,
              delta,
              GameSettings.FIRE_SPARK_FADE_TIME * 1000
            );

            cannonProps.current.imageFireSpark.w *=
              cannonProps.current.sparkAnimation.scale / oldScale;
            cannonProps.current.imageFireSpark.h *=
              cannonProps.current.sparkAnimation.scale / oldScale;
          }
        }
      }
    },
    [gameProps.canvas]
  );

  const cannonAndProjectileDraw = useCallback(() => {
    if (
      gameProps.context &&
      gameProps.canvas &&
      cannonProps.current.isAllImagesLoaded
    ) {
      gameProps.context.save();

      gameProps.context.translate(
        cannonProps.current.pivot.x,
        cannonProps.current.pivot.y
      );
      gameProps.context.rotate(cannonProps.current.angle);
      gameProps.context.translate(
        -cannonProps.current.pivot.x,
        -cannonProps.current.pivot.y
      );

      drawGameImage(gameProps.context, cannonProps.current.imageBack);

      if (gameStates.current.fired) {
        gameProps.context.save();

        // cancel the cannon rotation
        // because after being fired, the projectile's position will be handled using its true position
        gameProps.context.translate(
          cannonProps.current.pivot.x,
          cannonProps.current.pivot.y
        );
        gameProps.context.rotate(-cannonProps.current.angle);
        gameProps.context.translate(
          -cannonProps.current.pivot.x,
          -cannonProps.current.pivot.y
        );

        // make the projectile rolls around
        gameProps.context.translate(
          projectileProps.current.x + projectileProps.current.w / 2,
          projectileProps.current.y + projectileProps.current.h / 2
        );
        gameProps.context.rotate(projectileProps.current.angle);
        gameProps.context.translate(
          -(projectileProps.current.x + projectileProps.current.w / 2),
          -(projectileProps.current.y + projectileProps.current.h / 2)
        );

        drawGameImage(gameProps.context, projectileProps.current);

        gameProps.context.restore();
        gameProps.context.save();

        gameProps.context.globalAlpha =
          cannonProps.current.sparkAnimation.alpha;
        drawGameImage(gameProps.context, cannonProps.current.imageFireSpark);

        gameProps.context.restore();
      } else {
        drawGameImage(gameProps.context, projectileProps.current);
      }

      drawGameImage(gameProps.context, cannonProps.current.imageFront);
      drawGameImage(gameProps.context, cannonProps.current.imageWheel);

      gameProps.context.restore();
    }
  }, [gameProps.canvas, gameProps.context]);

  // //ball props

  // const [ballProps, setBallProps] = useState({
  //   image: null,
  //   isImageLoaded: false,
  //   ballX: getRandomBallX(),
  //   ballY: GameSettings.BALL_START_Y,
  //   speed: GameSettings.BALL_SPEED,
  // });

  // function resetBallState() {
  //   setBallProps(pre => {
  //     pre.ballX = getRandomBallX();
  //     pre.ballY = GameSettings.BALL_START_Y;
  //     pre.speed = GameSettings.BALL_SPEED;
  //     return pre;
  //   });
  // }

  // function loadBallImage() {
  //   setBallProps(pre => {
  //     pre.image = new Image();
  //     pre.image.onload = () => {
  //       pre.isImageLoaded = true;
  //     };
  //     pre.image.src = getRandomBall();
  //     return pre;
  //   });
  // }

  // function getRandomBall() {
  //   let random = Math.round(Math.random());
  //   return random === 1 ? BallGreen : BallRed;
  // }

  // function getRandomBallX() {
  //   let random = Math.round(
  //     GameSettings.BALL_WIDTH +
  //       Math.random() * (GameSettings.GAME_WIDTH - GameSettings.BALL_WIDTH * 2)
  //   );
  //   return random;
  // }

  // function ballDraw() {
  //   if (!ballProps.isImageLoaded) {
  //     return;
  //   }
  //   gameProps.context.drawImage(
  //     ballProps.image,
  //     ballProps.ballX,
  //     ballProps.ballY,
  //     GameSettings.BALL_WIDTH,
  //     GameSettings.BALL_HEIGHT
  //   );
  // }

  // function ballUpdate() {
  //   if (
  //     ballProps.ballY - GameSettings.BALL_HEIGHT >=
  //     GameSettings.GAME_HEIGHT
  //   ) {
  //     resetBallState();
  //   }
  //   setBallProps(pre => {
  //     pre.ballY += pre.speed;
  //     return pre;
  //   });
  // }

  // //spark props
  // const [sparkProps, setSparkProps] = useState({
  //   image: null,
  //   isImageLoaded: false,
  //   sparkX: GameSettings.SPARK_START_X,
  //   sparkY: GameSettings.SPARK_START_Y,
  // });

  // function loadSparkImage() {
  //   setSparkProps(pre => {
  //     pre.image = new Image();
  //     pre.image.onload = () => {
  //       pre.isImageLoaded = true;
  //     };
  //     pre.image.src = Spark;
  //     return pre;
  //   });
  // }

  // function sparkDraw() {
  //   if (!sparkProps.isImageLoaded) {
  //     return;
  //   }
  //   gameProps.context.drawImage(
  //     sparkProps.image,
  //     sparkProps.sparkX,
  //     sparkProps.sparkY
  //   );
  // }

  const getMousePos = useCallback(
    (event: MouseEvent | TouchEvent, rect: DOMRect) => {
      const mousePoint =
        "changedTouches" in event ? event.changedTouches[0] : event;

      return {
        x: mousePoint.clientX - rect.left,
        y: mousePoint.clientY - rect.top,
      };
    },
    []
  );

  const mouseEventListen = useCallback(() => {
    if (gameProps.canvas) {
      const rect = gameProps.canvas.getBoundingClientRect();

      const handleMouseMove = (event: MouseEvent | TouchEvent) => {
        mouseProps.current.currentPos = getMousePos(event, rect);
      };

      gameProps.canvas.addEventListener("mousemove", handleMouseMove);
      gameProps.canvas.addEventListener("touchmove", handleMouseMove);

      const handleMouseDown = (event: MouseEvent | TouchEvent) => {
        mouseProps.current.startPos = getMousePos(event, rect);
        mouseProps.current.currentPos = mouseProps.current.startPos;
        mouseProps.current.pressed = true;
      };

      gameProps.canvas.addEventListener("mousedown", handleMouseDown);
      gameProps.canvas.addEventListener("touchstart", handleMouseDown);

      const handleMouseUp = (event: MouseEvent | TouchEvent) => {
        mouseProps.current.currentPos = getMousePos(event, rect);
        mouseProps.current.pressed = false;
      };

      gameProps.canvas.addEventListener("mouseup", handleMouseUp);
      gameProps.canvas.addEventListener("touchend", handleMouseUp);

      return () => {
        gameProps.canvas?.removeEventListener("mousemove", handleMouseMove);
        gameProps.canvas?.removeEventListener("touchmove", handleMouseMove);
        gameProps.canvas?.removeEventListener("mousedown", handleMouseDown);
        gameProps.canvas?.removeEventListener("touchstart", handleMouseDown);
        gameProps.canvas?.removeEventListener("mouseup", handleMouseUp);
        gameProps.canvas?.removeEventListener("touchend", handleMouseUp);
      };
    }
  }, [gameProps.canvas, getMousePos]);

  const initGameProps = useCallback(() => {
    if (canvasRef.current) {
      let canvas = canvasRef.current;
      let context = canvas.getContext("2d");
      setGameProps(pre => {
        pre.canvas = canvas;
        pre.context = context;
        return pre;
      });

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      gameStates.current.interactionSeparateLine = canvas.height * 0.85;
      canvas.oncontextmenu = () => false; // prevent right click / hold down

      return mouseEventListen();
    }
  }, [mouseEventListen]);

  const gameUpdate = useCallback(
    (now: number, delta: number) => {
      cloudsUpdate(delta);
      cannonUpdate(delta);
      projectileUpdate(delta);
      //   ballUpdate();
    },
    [cannonUpdate, cloudsUpdate, projectileUpdate]
  );

  const gameDraw = useCallback(() => {
    backgroundDraw();
    cannonAndProjectileDraw();
    //   ballDraw();
    //   sparkDraw();
  }, [backgroundDraw, cannonAndProjectileDraw]);

  const gameLoop = useCallback(
    (now: number) => {
      frameIdRef.current = requestAnimationFrame(gameLoop);

      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;

      gameUpdate(now, delta);
      gameDraw();
    },
    [gameDraw, gameUpdate]
  );

  useEffect(() => {
    initGameProps();
    loadCloudImages();
    loadCannonImage();
    loadProjectileImage();
    // loadBallImage();
    // loadSparkImage();
    frameIdRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (frameIdRef.current !== undefined)
        cancelAnimationFrame(frameIdRef.current);
    };
  }, [
    gameLoop,
    initGameProps,
    loadCannonImage,
    loadCloudImages,
    loadProjectileImage,
  ]);

  // canvas resize event
  useEffect(() => {
    const listener = () => {
      if (gameProps.canvas) {
        gameProps.canvas.width = window.innerWidth;
        gameProps.canvas.height = window.innerHeight;
        gameStates.current.interactionSeparateLine =
          gameProps.canvas.height * 0.85;
      }
    };
    window.addEventListener("resize", listener);

    return () => window.removeEventListener("resize", listener);
  }, [gameProps.canvas]);

  return (
    <div id="game-container">
      <canvas ref={canvasRef} id="gameCanvas" />
    </div>
  );
}

export default App;
