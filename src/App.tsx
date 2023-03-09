import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import CannonProjectile from "./cannon_shooter_assets/bullet.png";
import CannonBack from "./cannon_shooter_assets/cannon_back.png";
import CannonFront from "./cannon_shooter_assets/cannon_front.png";
import CannonWheel from "./cannon_shooter_assets/cannon_wheel.png";
import Cloud1 from "./cannon_shooter_assets/cloud1.png";
import Cloud2 from "./cannon_shooter_assets/cloud2.png";
import Cloud3 from "./cannon_shooter_assets/cloud3.png";
import Cloud4 from "./cannon_shooter_assets/cloud4.png";
import * as GameSettings from "./GameConstants";
import { randomInRange } from "./helpers";

type GameImage = {
  image: HTMLImageElement;
  isImageLoaded: boolean;
  w: number;
  h: number;
  x: number;
  y: number;
};

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
        if (gameProps.context && item.isImageLoaded && item.x && item.y) {
          gameProps.context.drawImage(
            item.image,
            item.x,
            item.y,
            item.w,
            item.h
          );
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

  //cannon
  const cannonProps = useRef<{
    imageFront: GameImage;
    imageBack: GameImage;
    imageWheel: GameImage;
    imageProjectile: GameImage;
    isAllImageLoaded: boolean;
    angle: number;
    direction: number;
    pivot: { x: number; y: number };
    willHandleRotate: boolean;
  }>({
    imageFront: createGameImage(),
    imageBack: createGameImage(),
    imageWheel: createGameImage(),
    imageProjectile: createGameImage(),
    isAllImageLoaded: false,
    angle: 0,
    direction: 1,
    pivot: { x: 0, y: 0 },
    willHandleRotate: false,
  });

  const loadCannonImage = useCallback(() => {
    cannonProps.current.imageFront.image.src = CannonFront;
    cannonProps.current.imageBack.image.src = CannonBack;
    cannonProps.current.imageWheel.image.src = CannonWheel;
    cannonProps.current.imageProjectile.image.src = CannonProjectile;

    const imgLoaded = [false, false, false, false];
    for (const [i, imgObj] of Array.from(
      [
        cannonProps.current.imageBack,
        cannonProps.current.imageFront,
        cannonProps.current.imageWheel,
        cannonProps.current.imageProjectile,
      ].entries()
    )) {
      imgObj.image.onload = () => {
        imgLoaded[i] = true;
        cannonProps.current.imageFront.isImageLoaded = true;
        cannonProps.current.isAllImageLoaded = imgLoaded.every(i => i);
      };
    }
  }, []);

  const cannonUpdate = useCallback(() => {
    if (gameProps.canvas && cannonProps.current.isAllImageLoaded) {
      for (const imgObj of [
        cannonProps.current.imageBack,
        cannonProps.current.imageProjectile,
        cannonProps.current.imageFront,
        cannonProps.current.imageWheel,
      ]) {
        imgObj.w = imgObj.image.width * GameSettings.CANNON_SCALE;
        imgObj.h = imgObj.image.height * GameSettings.CANNON_SCALE;
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

      cannonProps.current.imageProjectile.y =
        cannonProps.current.imageBack.y - 10;

      cannonProps.current.pivot = {
        x:
          cannonProps.current.imageWheel.x +
          cannonProps.current.imageWheel.w / 2,
        y:
          cannonProps.current.imageWheel.y +
          cannonProps.current.imageWheel.h / 2,
      };

      if (mouseProps.current.pressed) {
        // if mouse only moves under the pivot, don't do anything
        if (
          !cannonProps.current.willHandleRotate &&
          mouseProps.current.startPos.y > cannonProps.current.pivot.y &&
          mouseProps.current.currentPos.y > cannonProps.current.pivot.y
        ) {
          cannonProps.current.willHandleRotate = false;
        } else {
          cannonProps.current.willHandleRotate = true;
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
    }
  }, [gameProps.canvas]);

  const cannonDraw = useCallback(() => {
    if (
      gameProps.context &&
      gameProps.canvas &&
      cannonProps.current.isAllImageLoaded
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

      for (const imgObj of [
        cannonProps.current.imageBack,
        cannonProps.current.imageProjectile,
        cannonProps.current.imageFront,
        cannonProps.current.imageWheel,
      ]) {
        gameProps.context.drawImage(
          imgObj.image,
          imgObj.x,
          imgObj.y,
          imgObj.w,
          imgObj.h
        );
      }

      gameProps.context.restore();
    }
  }, [gameProps.canvas, gameProps.context]);

  // //arrow props
  // const [arrowProps, setArrowProps] = useState({
  //   image: null,
  //   isImageLoaded: false,
  //   isMoving: false,
  //   isDone: false,
  //   arrowX: GameSettings.ARROW_START_X,
  //   arrowY: GameSettings.ARROW_START_Y,
  //   speed: GameSettings.ARROW_SPEED,
  //   speedX: 0,
  //   speedY: 0,
  // });

  // function resetArrowState() {
  //   setArrowProps(pre => {
  //     pre.isMoving = false;
  //     pre.isDone = false;
  //     pre.arrowX = GameSettings.ARROW_START_X;
  //     pre.arrowY = GameSettings.ARROW_START_Y;
  //     pre.speed = GameSettings.ARROW_SPEED;
  //     pre.speedX = 0;
  //     pre.speedY = 0;
  //     return pre;
  //   });
  // }

  // function loadArrowImage() {
  //   setArrowProps(pre => {
  //     pre.image = new Image();
  //     pre.image.onload = () => {
  //       pre.isImageLoaded = true;
  //     };
  //     pre.image.src = Arrow;

  //     return pre;
  //   });
  // }

  // function arrowUpdate() {
  //   if (
  //     arrowProps.arrowX - GameSettings.ARROW_RADIUS <= 0 ||
  //     arrowProps.arrowX + GameSettings.ARROW_RADIUS >= GameSettings.GAME_WIDTH
  //   ) {
  //     setArrowProps(pre => {
  //       pre.speedX = -pre.speedX;
  //       return pre;
  //     });
  //   }

  //   if (
  //     arrowProps.arrowY + GameSettings.ARROW_DIAMETER <= 0 ||
  //     arrowProps.arrowY - GameSettings.ARROW_DIAMETER >=
  //       GameSettings.GAME_HEIGHT
  //   ) {
  //     resetArrowState();
  //   }

  //   setArrowProps(pre => {
  //     pre.arrowX += pre.speedX;
  //     pre.arrowY += pre.speedY;
  //     return pre;
  //   });
  // }

  // function arrowDraw() {
  //   if (!arrowProps.isImageLoaded) {
  //     return;
  //   }
  //   gameProps.context.save(); // save current state
  //   // gameProps.context.rotate(0.5); // rotate
  //   gameProps.context.imageSmoothingEnabled = false;
  //   gameProps.context.drawImage(
  //     arrowProps.image,
  //     arrowProps.arrowX - GameSettings.ARROW_RADIUS,
  //     arrowProps.arrowY - GameSettings.ARROW_DIAMETER,
  //     GameSettings.ARROW_HEIGHT,
  //     GameSettings.ARROW_WIDTH
  //   );
  //   gameProps.context.restore( );

  //   if (
  //     arrowProps.isMoving &&
  //     (Math.abs(arrowProps.arrowX - ballProps.ballX) <= 0 ||
  //       Math.abs(arrowProps.arrowX - ballProps.ballX) <=
  //         GameSettings.BALL_WIDTH) &&
  //     Math.abs(arrowProps.arrowY - ballProps.ballY) <=
  //       GameSettings.BALL_DIAMETER
  //   ) {
  //     setSparkProps(pre => {
  //       pre.sparkX = ballProps.ballX;
  //       pre.sparkY = ballProps.ballY;
  //       return pre;
  //     });
  //     setBallProps(pre => {
  //       pre.ballX = -999999999999;
  //       pre.ballY = -999999999999;
  //       return pre;
  //     });
  //     resetArrowState();
  //     setArrowProps(pre => {
  //       pre.isDone = true;
  //       return pre;
  //     });
  //   }
  // }

  // function fire(mousePos) {
  //   if (arrowProps.isMoving) {
  //     return;
  //   }
  //   let deg = Math.atan2(
  //     mousePos.y - arrowProps.arrowY,
  //     mousePos.x - arrowProps.arrowX
  //   );
  //   setArrowProps(pre => {
  //     pre.speedX = pre.speed * Math.cos(deg);
  //     pre.speedY = pre.speed * Math.sin(deg);
  //     pre.isMoving = true;
  //     return pre;
  //   });
  // }

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
      cannonUpdate();
      //   arrowUpdate();
      //   ballUpdate();
    },
    [cannonUpdate, cloudsUpdate]
  );

  const gameDraw = useCallback(() => {
    backgroundDraw();
    cannonDraw();
    //   arrowDraw();
    //   ballDraw();
    //   sparkDraw();
  }, [backgroundDraw, cannonDraw]);

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
    // loadArrowImage();
    // loadBallImage();
    // loadSparkImage();
    frameIdRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (frameIdRef.current !== undefined)
        cancelAnimationFrame(frameIdRef.current);
    };
  }, [gameLoop, initGameProps, loadCannonImage, loadCloudImages]);

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

function createGameImage(): GameImage {
  return {
    image: new Image(),
    isImageLoaded: false,
    w: 0,
    h: 0,
    x: Infinity,
    y: Infinity,
  };
}
