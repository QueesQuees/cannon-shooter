import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import Ball1 from "./cannon_shooter_assets/ball1.png";
import Ball2 from "./cannon_shooter_assets/ball2.png";
import Ball3 from "./cannon_shooter_assets/ball3.png";
import Ball4 from "./cannon_shooter_assets/ball4.png";
import Projectile from "./cannon_shooter_assets/bullet.png";
import CannonBack from "./cannon_shooter_assets/cannon_back.png";
import CannonFront from "./cannon_shooter_assets/cannon_front.png";
import CannonWheel from "./cannon_shooter_assets/cannon_wheel.png";
import Cloud1 from "./cannon_shooter_assets/cloud1.png";
import Cloud2 from "./cannon_shooter_assets/cloud2.png";
import Cloud3 from "./cannon_shooter_assets/cloud3.png";
import Cloud4 from "./cannon_shooter_assets/cloud4.png";
import LeftWing from "./cannon_shooter_assets/left_wing.png";
import RightWing from "./cannon_shooter_assets/right_wing.png";
import Spark from "./cannon_shooter_assets/spark.png";
import GiftBox from "./cannon_shooter_assets/giftBox.jpg";
import CannonFireSound from "./cannon_shooter_sounds/cannon_fire.wav";
import * as GameSettings from "./GameConstants";
import {
  createGameImage,
  createSound,
  drawGameImage,
  GameImage,
  linearInterpolateAnimation,
  // moveCoordinatesAnimation,
  randomInRange,
  randomInRangeInt,
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
    fly: false,
    gameStop: false,
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
    cloudProps.current = [Cloud1, Cloud2, Cloud3, Cloud4].map((img) => {
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
      cloudProps.current.forEach((item) => {
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

      cloudProps.current.forEach((item) => {
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
    // Collide
    hanleCollide: function (otherobj: GameImage) {
      const myleft = this.x;
      const myright = this.x + this.width;
      const mytop = this.y;
      const mybottom = this.y + this.height;
      const otherleft = otherobj.x;
      const otherright = otherobj.x + otherobj.w;
      const othertop = otherobj.y;
      const otherbottom = otherobj.y + otherobj.h;
      let collide = false;
      if (
        mytop <= otherbottom &&
        mytop >= othertop &&
        myleft >= otherleft &&
        myleft <= otherright
      ) {
        collide = true;
      }
      return collide;
    },
    collide: false,
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
      // Xử lý va chạm và set lại bóng
      if (gameStates.current.fired) {
        for (let i = 0; i < ballProps.current.balls.length; i++) {
          if (
            projectileProps.current.hanleCollide(ballProps.current.balls[i])
          ) {
            // gameStates.current.gameStop = true;
            // current ball
            let item = ballProps.current.balls[i];
            const itemXCurrent = item.x;
            const itemYCurrent = item.y;

            let ballXRange = GameSettings.BALL_START_X_RANGE;

            // khởi tạo lại vị trí ball và wing sau khi va chạm
            // initialization place of the ball and the wing after collide
            if (
              ballXRange !== null &&
              gameProps.canvas &&
              !gameStates.current.gameStop
            ) {
              item.direction = randomInRangeInt(0, 1) || -1;
              const offset = item.direction === 1 ? 0 : gameProps.canvas.width;

              item.x =
                -item.direction *
                (offset + randomInRange(ballXRange[0], ballXRange[1]));
              item.leftWingImage.x = item.x - GameSettings.WINGS_SIZE;
              item.rightWingImage.x = item.x + GameSettings.BALL_SIZE;
              const ballRow = randomInRangeInt(0, GameSettings.BALL_ROW - 1);
              item.y =
                GameSettings.BALL_ROW_GAP + ballRow * GameSettings.BALL_START_Y;
              item.leftWingImage.y = item.y;
              item.rightWingImage.y = item.y;
              item.speed = randomInRange(
                GameSettings.BALL_SPEED_RANGE[0],
                GameSettings.BALL_SPEED_RANGE[1]
              );
            }
            item.x += (item.direction * (item.speed * delta)) / 1000;
            // Initiate explosion effect after impact
            item.imageGiftBox.x = itemXCurrent;
            item.imageGiftBox.y = itemYCurrent;

            // Log Conllide
            projectileProps.current.collide = true;
            console.log("cham");
            break;
          }
        }
      }
      if (gameProps.canvas) {
        if (
          !gameStates.current.fired &&
          gameStates.current.willFire &&
          !mouseProps.current.pressed &&
          !gameStates.current.gameStop
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
            projectileProps.current.y + projectileProps.current.h >= 0 &&
            gameStates.current.fly &&
            !projectileProps.current.collide
          ) {
            // Xử  lý đường đạn khi bay
            const hypotenuse = (delta * GameSettings.PROJECTILE_SPEED) / 1000;
            projectileProps.current.x +=
              hypotenuse * projectileProps.current.speedX;
            projectileProps.current.y +=
              hypotenuse * projectileProps.current.speedY;

            // Hiệu úng đạn quay tròn
            projectileProps.current.angle +=
              (projectileProps.current.rotateDirection *
                (delta * GameSettings.PROJECTILE_ROTATE_SPEED)) /
              1000;
          } else {
            //TODO: fail event
            // khỏi tạo đạn về vị trí ban đầu
            gameStates.current.fired = false;
            gameStates.current.fly = false;
            projectileProps.current.collide = false;
            cannonProps.current.sparkAnimation = {
              ...GameSettings.FIRE_SPARK_FADE_ANIMATION_KEYFRAMES[0],
            };
            // khỏi tạo lại hiệu úng nổ
            const ratio =
              cannonProps.current.imageFireSpark.image.height /
              cannonProps.current.imageFireSpark.image.width;
            cannonProps.current.imageFireSpark.w =
              cannonProps.current.imageBack.w * 0.85;
            cannonProps.current.imageFireSpark.h =
              cannonProps.current.imageFireSpark.w * ratio;

            projectileProps.current.x =
              gameProps.canvas.width / 2 - projectileProps.current.w / 2;
            projectileProps.current.y = cannonProps.current.projectileBase;
          }
        } else {
          projectileProps.current.collide = false;
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
    sparkAnimation: { ...GameSettings.FIRE_SPARK_FADE_ANIMATION_KEYFRAMES[0] },
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
        cannonProps.current.isAllImagesLoaded = imgLoaded.every((i) => i);
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
            gameStates.current.fly = true;
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

        // start Spark Animation
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
            console.log(delta, cannonProps.current.sparkAnimation.offset);
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
            const _x = cannonProps.current.sparkAnimation.scale / oldScale;
            cannonProps.current.imageFireSpark.w *= _x;
            cannonProps.current.imageFireSpark.h *= _x;
          }
        }
        // End Spark Animation
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

  //ball props
  const ballProps = useRef<{
    balls: (GameImage & {
      speed: number;
      direction: number;
      leftWingImage: GameImage;
      rightWingImage: GameImage;
      imageGiftBox: GameImage;
      giftAnimation: any;
    })[];
  }>({
    balls: [],
  });

  const loadBallImages = useCallback(() => {
    if (ballProps.current.balls.length > 7) {
    }
    ballProps.current.balls = [
      Ball1,
      Ball2,
      Ball3,
      Ball4,
      Ball1,
      Ball2,
      Ball3,
      Ball4,
      Ball1,
      Ball2,
      Ball3,
      Ball4,
      Ball1,
      Ball2,
      Ball3,
      Ball4,
      Ball1,
      Ball2,
      Ball3,
      Ball4,
      Ball1,
      Ball2,
      Ball3,
      Ball4,
    ].map((img) => {
      const res = {
        ...createGameImage(),
        speed: 0,
        direction: 1,
        leftWingImage: createGameImage(),
        rightWingImage: createGameImage(),
        imageGiftBox: createGameImage(),
        giftAnimation: {},
      };
      res.image.src = img;
      res.image.onload = () => {
        res.isImageLoaded = true;
      };
      res.w = GameSettings.BALL_SIZE;
      res.h = GameSettings.BALL_SIZE;
      res.leftWingImage.image.src = LeftWing;
      res.rightWingImage.image.src = RightWing;
      res.leftWingImage.w = GameSettings.WINGS_SIZE;
      res.leftWingImage.h = GameSettings.WINGS_SIZE;
      res.leftWingImage.image.onload = () => {
        res.leftWingImage.isImageLoaded = true;
      };
      res.rightWingImage.w = GameSettings.WINGS_SIZE;
      res.rightWingImage.h = GameSettings.WINGS_SIZE;
      res.rightWingImage.image.onload = () => {
        res.rightWingImage.isImageLoaded = true;
      };
      res.imageGiftBox.image.src = GiftBox;
      res.imageGiftBox.w = GameSettings.BALL_SIZE;
      res.imageGiftBox.h = GameSettings.BALL_SIZE;
      res.imageGiftBox.image.onload = () => {
        res.imageGiftBox.isImageLoaded = true;
      };
      res.giftAnimation = {
        ...GameSettings.FIRE_SPARK_FADE_ANIMATION_KEYFRAMES[0],
      };

      return res;
    });
  }, []);

  const ballsUpdate = useCallback(
    (delta: number) => {
      ballProps.current.balls.forEach((item) => {
        if (gameProps.canvas) {
          let ballXRange = null;

          if (item.x === Infinity || item.y === Infinity) {
            ballXRange = GameSettings.BALL_START_X_INIT_RANGE;
          } else if (
            (item.direction === 1 && item.x > gameProps.canvas.width) ||
            (item.direction === -1 && item.x + item.w < 0)
          ) {
            ballXRange = GameSettings.BALL_START_X_RANGE;
          }

          if (ballXRange !== null) {
            item.direction = randomInRangeInt(0, 1) || -1;
            const offset = item.direction === 1 ? 0 : gameProps.canvas.width;

            item.x =
              -item.direction *
              (offset + randomInRange(ballXRange[0], ballXRange[1]));
            item.leftWingImage.x = item.x - GameSettings.WINGS_SIZE;
            item.rightWingImage.x = item.x + GameSettings.BALL_SIZE;

            const ballRow = randomInRangeInt(0, GameSettings.BALL_ROW - 1);
            item.y =
              GameSettings.BALL_ROW_GAP + ballRow * GameSettings.BALL_START_Y;
            item.rightWingImage.y = item.y;
            item.leftWingImage.y = item.y;

            item.speed = randomInRange(
              GameSettings.BALL_SPEED_RANGE[0],
              GameSettings.BALL_SPEED_RANGE[1]
            );
          }
          const _x = (item.direction * (item.speed * delta)) / 1000;
          item.x += _x;
          item.leftWingImage.x += _x;
          item.rightWingImage.x += _x;
        }

        if (
          gameProps.canvas &&
          item.imageGiftBox.x !== Infinity &&
          item.imageGiftBox.y !== Infinity
        ) {
          item.imageGiftBox.x =
            gameProps.canvas.width / 2 - item.imageGiftBox.w / 2;
          item.imageGiftBox.y =
            gameProps.canvas.height / 2 - item.imageGiftBox.h / 2;
          // if (
          //   item.giftAnimation.offset !==
          //   GameSettings.FIRE_SPARK_FADE_ANIMATION_KEYFRAMES[1].offset
          // ) {
          //   const pathCoords = [
          //     {x: 20, y: 20}, {x: 100, y: 100}
          //   ];
          //   moveCoordinatesAnimation(
          //     "offset",
          //     item.giftAnimation,
          //     pathCoords,
          //     delta,
          //     GameSettings.FIRE_SPARK_FADE_TIME * 100
          //   );
          //   // console.log(
          //   //   delta,
          //   //   item.giftAnimation.offset,
          //   //   GameSettings.FIRE_SPARK_FADE_ANIMATION_KEYFRAMES[1].offset,
          //   //   item.imageGiftBox.x,
          //   //   item.imageGiftBox.y
          //   // );

          //   item.imageGiftBox.y += item.giftAnimation.offset;
          //   // item.imageGiftBox.x +=
          //   // item.giftAnimation.offset;
          // }
        }
      });
    },
    [gameProps.canvas]
  );

  const ballsDraw = useCallback(() => {
    if (gameProps.context && gameProps.canvas) {
      gameProps.context.save();

      if (gameProps.context) {
      }

      ballProps.current.balls.forEach((item) => {
        if (gameProps.context) {
          drawGameImage(gameProps.context, item);
          drawGameImage(gameProps.context, item.leftWingImage);
          drawGameImage(gameProps.context, item.rightWingImage);
          drawGameImage(gameProps.context, item.imageGiftBox);
        }
      });

      gameProps.context.restore();
    }
  }, [gameProps.canvas, gameProps.context]);

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
      setGameProps((pre) => {
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
      // if (projectileProps.current.collide) {
      //   // return;
      // } else {
      cloudsUpdate(delta);
      ballsUpdate(delta);
      cannonUpdate(delta);
      projectileUpdate(delta);
      // }
    },
    [ballsUpdate, cannonUpdate, cloudsUpdate, projectileUpdate]
  );

  const gameDraw = useCallback(() => {
    backgroundDraw();
    ballsDraw();
    cannonAndProjectileDraw();
    //   sparkDraw();
  }, [backgroundDraw, ballsDraw, cannonAndProjectileDraw]);

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
    loadBallImages();
    // loadSparkImage();
    frameIdRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (frameIdRef.current !== undefined)
        cancelAnimationFrame(frameIdRef.current);
    };
  }, [
    gameLoop,
    initGameProps,
    loadBallImages,
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
