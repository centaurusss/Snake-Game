(() => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  // UI elements
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const restartBtn = document.getElementById("restartBtn");
  const difficultySelect = document.getElementById("difficulty");
  const scoreEl = document.getElementById("score");
  const highscoreEl = document.getElementById("highscore");
  const overlay = document.getElementById("overlay");
  const overlayText = document.getElementById("overlayText");
  const gridToggle = document.getElementById("gridToggle");
  const wrapToggle = document.getElementById("wrapToggle");
  const soundToggle = document.getElementById("soundToggle");

  // mobile buttons
  const dirButtons = document.querySelectorAll(".dir");

  // Game settings
  const TILE_SIZE = 16; // size of cell in pixels (logical)
  const COLUMNS = Math.floor(canvas.width / TILE_SIZE);
  const ROWS = Math.floor(canvas.height / TILE_SIZE);

  // state
  let snake = [{ x: Math.floor(COLUMNS / 2), y: Math.floor(ROWS / 2) }];
  let dir = { x: 0, y: 0 }; // current direction
  let nextDir = { x: 0, y: 0 };
  let food = null;
  let score = 0;
  let highscore = parseInt(localStorage.getItem("snake_highscore") || "0", 10);
  let gameInterval = null;
  let isRunning = false;
  let isPaused = false;
  let showGrid = false;
  let wrapWalls = false;
  let soundOn = soundToggle.checked;

  highscoreEl.textContent = highscore;

  // sounds (simple beep using WebAudio)
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = AudioCtx ? new AudioCtx() : null;
  function beep(freq = 440, duration = 0.05, volume = 0.2) {
    if (!audioCtx || !soundOn) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.value = volume;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    setTimeout(() => { o.stop(); }, duration * 1000);
  }

  // Difficulty speeds (ms per tick)
  const SPEEDS = {
    easy: 160,
    medium: 100,
    hard: 60
  };

  // helpers
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function placeFood() {
    let safe = false;
    let fx, fy;
    while (!safe) {
      fx = randInt(0, COLUMNS - 1);
      fy = randInt(0, ROWS - 1);
      safe = !snake.some(s => s.x === fx && s.y === fy);
    }
    food = { x: fx, y: fy };
  }

  function resetGame() {
    snake = [{ x: Math.floor(COLUMNS / 2), y: Math.floor(ROWS / 2) }];
    dir = { x: 0, y: 0 };
    nextDir = { x: 0, y: 0 };
    score = 0;
    scoreEl.textContent = score;
    placeFood();
    isRunning = false;
    isPaused = false;
    overlayText.textContent = "Press Start";
    overlay.classList.remove("hidden");
    stopLoop();
    draw(); // draw initial frame
  }

  function startGame() {
    if (isRunning) return;
    isRunning = true;
    isPaused = false;
    overlay.classList.add("hidden");
    overlayText.textContent = "";
    const diff = difficultySelect.value || "medium";
    startLoop(SPEEDS[diff]);
  }

  function pauseGame() {
    if (!isRunning) return;
    isPaused = !isPaused;
    if (isPaused) {
      overlay.classList.remove("hidden");
      overlayText.textContent = "Paused";
      stopLoop();
    } else {
      overlay.classList.add("hidden");
      overlayText.textContent = "";
      const diff = difficultySelect.value || "medium";
      startLoop(SPEEDS[diff]);
    }
  }

  function gameOver() {
    isRunning = false;
    stopLoop();
    beep(180, 0.12, 0.25);
    overlay.classList.remove("hidden");
    overlayText.textContent = `Game Over — Score: ${score}`;
    if (score > highscore) {
      highscore = score;
      localStorage.setItem("snake_highscore", String(highscore));
      highscoreEl.textContent = highscore;
      overlayText.textContent += " — New Highscore!";
    }
  }

  function startLoop(ms) {
    stopLoop();
    gameInterval = setInterval(tick, ms);
  }

  function stopLoop() {
    if (gameInterval) {
      clearInterval(gameInterval);
      gameInterval = null;
    }
  }

  // game tick
  function tick() {
    // update direction (prevent reverse)
    if ((nextDir.x !== -dir.x || nextDir.y !== -dir.y) || (dir.x === 0 && dir.y === 0)) {
      dir = { ...nextDir };
    }

    if (dir.x === 0 && dir.y === 0) {
      // not moving yet
      draw();
      return;
    }

    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // wall collision or wrap
    if (wrapWalls) {
      if (head.x < 0) head.x = COLUMNS - 1;
      if (head.x >= COLUMNS) head.x = 0;
      if (head.y < 0) head.y = ROWS - 1;
      if (head.y >= ROWS) head.y = 0;
    } else {
      if (head.x < 0 || head.x >= COLUMNS || head.y < 0 || head.y >= ROWS) {
        gameOver();
        return;
      }
    }

    // self collision
    if (snake.some(seg => seg.x === head.x && seg.y === head.y)) {
      gameOver();
      return;
    }

    snake.unshift(head);

    // eat food?
    if (food && head.x === food.x && head.y === food.y) {
      score += 1;
      scoreEl.textContent = score;
      beep(880, 0.04, 0.08);
      placeFood();
    } else {
      snake.pop(); // move without growing
    }

    draw();
  }

  // rendering
  function draw() {
    // clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // draw grid if enabled
    if (showGrid) {
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      for (let x = 0; x <= COLUMNS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * TILE_SIZE, 0);
        ctx.lineTo(x * TILE_SIZE, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * TILE_SIZE);
        ctx.lineTo(canvas.width, y * TILE_SIZE);
        ctx.stroke();
      }
    }

    // draw food
    if (food) {
      const fx = food.x * TILE_SIZE;
      const fy = food.y * TILE_SIZE;
      const grad = ctx.createLinearGradient(fx, fy, fx + TILE_SIZE, fy + TILE_SIZE);
      grad.addColorStop(0, "#ffd166");
      grad.addColorStop(1, "#ff7b54");
      ctx.fillStyle = grad;
      ctx.fillRect(fx + 2, fy + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      // small shine
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(fx + 4, fy + 4, 4, 4);
    }

    // draw snake
    for (let i = 0; i < snake.length; i++) {
      const s = snake[i];
      const sx = s.x * TILE_SIZE;
      const sy = s.y * TILE_SIZE;

      // head different style
      if (i === 0) {
        const grad = ctx.createLinearGradient(sx, sy, sx + TILE_SIZE, sy + TILE_SIZE);
        grad.addColorStop(0, "#8be9fd");
        grad.addColorStop(1, "#50e3c2");
        ctx.fillStyle = grad;
      } else {
        const t = i / snake.length;
        ctx.fillStyle = `rgba(${Math.floor(20 + 200 * (1 - t))}, ${Math.floor(120 + 80 * t)}, ${Math.floor(60 + 150 * t)}, 1)`;
      }
      ctx.fillRect(sx + 1, sy + 1, TILE_SIZE - 2, TILE_SIZE - 2);

      // subtle border
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.strokeRect(sx + 1, sy + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }
  }

  // Input handling
  window.addEventListener("keydown", (e) => {
    const k = e.key;
    if (k === "ArrowUp" || k === "w") { nextDir = { x: 0, y: -1 }; e.preventDefault(); }
    if (k === "ArrowDown" || k === "s") { nextDir = { x: 0, y: 1 }; e.preventDefault(); }
    if (k === "ArrowLeft" || k === "a") { nextDir = { x: -1, y: 0 }; e.preventDefault(); }
    if (k === "ArrowRight" || k === "d") { nextDir = { x: 1, y: 0 }; e.preventDefault(); }

    // quick keys
    if (k === " "){ // space toggles pause
      pauseGame();
      e.preventDefault();
    }
  });

  // mobile button controls
  dirButtons.forEach(btn => {
    btn.addEventListener("touchstart", (ev) => {
      const d = btn.dataset.dir;
      setDirectionFromString(d);
      ev.preventDefault();
    });
    btn.addEventListener("mousedown", () => {
      setDirectionFromString(btn.dataset.dir);
    });
  });

  function setDirectionFromString(s) {
    if (s === "up") nextDir = { x: 0, y: -1 };
    if (s === "down") nextDir = { x: 0, y: 1 };
    if (s === "left") nextDir = { x: -1, y: 0 };
    if (s === "right") nextDir = { x: 1, y: 0 };
    // start automatically if not running
    if (!isRunning) startGame();
  }

  // swipe detection
  let touchStartX = 0, touchStartY = 0;
  canvas.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }, { passive: true });

  canvas.addEventListener("touchend", (e) => {
    if (!touchStartX) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const threshold = 20; // minimal swipe distance
    if (Math.max(absX, absY) < threshold) { touchStartX = 0; return; }
    if (absX > absY) {
      nextDir = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
    } else {
      nextDir = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
    }
    if (!isRunning) startGame();
    touchStartX = 0;
  }, { passive: true });

  // UI hookups
  startBtn.addEventListener("click", () => {
    startGame();
  });
  pauseBtn.addEventListener("click", () => {
    pauseGame();
  });
  restartBtn.addEventListener("click", () => {
    resetGame();
    startGame();
  });

  difficultySelect.addEventListener("change", () => {
    if (isRunning && !isPaused) {
      const diff = difficultySelect.value || "medium";
      startLoop(SPEEDS[diff]);
    }
  });

  gridToggle.addEventListener("change", () => {
    showGrid = gridToggle.checked;
    draw();
  });
  wrapToggle.addEventListener("change", () => {
    wrapWalls = wrapToggle.checked;
  });
  soundToggle.addEventListener("change", () => {
    soundOn = soundToggle.checked;
  });

  // initialization
  resetGame();

  // make canvas pixel perfect on high DPI
  function adjustCanvasForDPR() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // recompute derived cells
    // not resizing tiles to remain logical grid; we keep TILE_SIZE fixed
    draw();
  }
  window.addEventListener("resize", adjustCanvasForDPR);
  adjustCanvasForDPR();

  // expose for debug (optional)
  window._snakeGame = {
    resetGame, startGame, pauseGame, gameOver, snakeState: () => ({ snake, dir, food, score })
  };

})();
