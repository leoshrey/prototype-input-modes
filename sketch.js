
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let model, webcam, indexTipX, indexTipY;
let handTriggered = false;
let handOpacity = 0.2;
let isGestureMode = true;
const alphabet = ['D', 'I', 'S', 'R', 'U', 'P', 'T', 'B', 'L', 'U', 'R', 'C', 'O', 'V', 'A', 'E'];
let letters = [];

let gestureIntro = document.getElementById('gestureIntro');
let cursorIntro = document.getElementById('cursorIntro');
let gestureStart = document.getElementById('gestureStartButton');
const gestureInstruction = document.getElementById('gestureInstruction');
gestureStart.style.pointerEvents = 'none';
// If someone tries to click the button manually, shake the instruction
let cursorStart = document.getElementById('cursorStartButton');
let hint = document.getElementById('hint');
let timerEl = document.getElementById('timer');

let gestureIntroCanvas = document.getElementById('gestureIntroCanvas');
let gestureIntroCtx = gestureIntroCanvas.getContext('2d');
let gestureHoverProgress = 0;
let gestureIntroActive = true;
let hoverThreshold = 100; // Distance in pixels to detect hover
let loadTime = 150; // Frames to complete loading (~1 sec if 60fps)

let handDetectionActive = true;




let streamPromise = (async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });

  webcam = document.createElement('video');
  webcam.setAttribute('autoplay', true);
  webcam.setAttribute('playsinline', true);
  webcam.style.display = 'none';
  document.body.appendChild(webcam);
  webcam.srcObject = stream;

  model = await handpose.load();
  console.log("Handpose model loaded");

  resizeCanvas();
  trackIntroHand(); // 👈 start intro interaction
})();


  // 🟢 Real interaction continues here only if handTriggered is true
gestureStart.addEventListener('click', async () => {
  await streamPromise;
  gestureIntro.style.display = 'none';
  canvas.style.display = 'block';
  document.body.classList.add('hide-cursor');
  hint.classList.add('hint-visible');
  resizeCanvas();
  model = await handpose.load();

  setTimeout(() => {
    createLetters();
    startGestureCountdown();
    requestAnimationFrame(detectHands);
  }, 1000);
});

cursorStart.addEventListener('click', () => {
  isGestureMode = false;
  console.log("Cursor Interaction Button Clicked");
  document.body.classList.remove('hide-cursor'); // Show cursor
  cursorIntro.style.display = 'none';
  cursorIntro.style.visibility = 'hidden';
  canvas.style.display = 'block';
  resizeCanvas();
  createLetters();

  const cursorHint = document.getElementById('cursorHint');
  cursorHint.classList.add('hint-visible');


  // Delay starting the cursor interaction
  setTimeout(() => {
    cursorHint.classList.remove('hint-visible');
    startCursorCountdown();
    canvas.addEventListener('mousemove', handleMouseMove);
    requestAnimationFrame(drawCursorLetters);
  }, 2000); // 2.5 seconds delay
});

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gestureIntroCanvas.width = window.innerWidth;
  gestureIntroCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);

function trackIntroHand() {
  if (!gestureIntroActive) return;
  gestureIntroCtx.clearRect(0, 0, gestureIntroCanvas.width, gestureIntroCanvas.height);
  gestureIntroCtx.clearRect(0, 0, gestureIntroCanvas.width, gestureIntroCanvas.height);
  // gestureIntroCtx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  // gestureIntroCtx.fillRect(0, 0, gestureIntroCanvas.width, gestureIntroCanvas.height);

  model.estimateHands(webcam).then(predictions => {
    if (predictions.length > 0) {
      let landmarks = predictions[0].landmarks;
      drawHandOverlay(landmarks); // 👋 Draw hand landmarks

      let indexTip = landmarks[8];
      let x = gestureIntroCanvas.width - (indexTip[0] * gestureIntroCanvas.width / webcam.videoWidth);
      let y = indexTip[1] * gestureIntroCanvas.height / webcam.videoHeight;

      let button = document.getElementById('gestureStartButton');
      let rect = button.getBoundingClientRect();

      // Calculate center of button
      // Check if fingertip is inside the button's bounding box
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        button.classList.add('blinking'); // ✅ Add blinking effect
        gestureHoverProgress++;
        let progressRatio = Math.min(gestureHoverProgress / loadTime, 1);
        // Draw loading bar
        gestureIntroCtx.fillStyle = 'white';
        gestureIntroCtx.fillRect(rect.left, rect.bottom + 8, rect.width * progressRatio, 6);

        if (gestureHoverProgress >= loadTime) {
          gestureIntroActive = false;
          // 🔄 Use setTimeout to ensure handTriggered = true takes effect BEFORE the click fires
          setTimeout(() => {
            gestureStart.click();
          }, 50); // slight delay to ensure timing
        }
      } else {
          gestureHoverProgress = 0;
          button.classList.remove('blinking'); // ✅ Remove blinking effect
        }
    }
    requestAnimationFrame(trackIntroHand);
  });
}

function drawHandOverlay(landmarks) {
  gestureIntroCtx.fillStyle = `rgba(255, 255, 255, 0.15)`;
  gestureIntroCtx.shadowColor = 'white';
  gestureIntroCtx.shadowBlur = 20;

  for (let i = 0; i < landmarks.length; i++) {
    let [x3d, y3d] = landmarks[i];
    let x = canvas.width - (x3d * canvas.width / webcam.videoWidth);
    let y = y3d * gestureIntroCanvas.height / webcam.videoHeight;

    gestureIntroCtx.beginPath();
    gestureIntroCtx.fillStyle = i === 8 
      ? 'rgba(255, 255, 255, 0.7)' 
      : `rgba(255, 255, 255, ${handOpacity})`;
    gestureIntroCtx.arc(x, y, 15, 0, 2 * Math.PI);
    

    gestureIntroCtx.fill();
  }

  gestureIntroCtx.shadowColor = 'transparent';
  gestureIntroCtx.shadowBlur = 0;
}


function startGestureCountdown() {
  startCountdown(13, () => {
    hint.style.display = 'none';
    isGestureMode = false;
    handDetectionActive = false;
    isGestureMode = false;

    // ✅ Restore cursor BEFORE showing the next screen
    document.body.classList.remove('hide-cursor');

    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.style.display = 'none';
    
    // ✅ Now show cursor intro
    cursorIntro.style.display = 'flex';
  });
}

function startCursorCountdown() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // clear leftover visuals
  startCountdown(13, () => {
    canvas.removeEventListener('mousemove', handleMouseMove);
    timerEl.textContent = "Thank you!";
    timerEl.classList.add('timer-center');

    setTimeout(() => {
      canvas.style.opacity = '0.2';
    }, 2000);
    
  });
}

function startCountdown(seconds, onComplete) {
  let timeLeft = seconds;
  timerEl.textContent = `Time Left: ${timeLeft}s`;
  const countdown = setInterval(() => {
    timeLeft--;
    timerEl.textContent = `Time Left: ${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(countdown);
      timerEl.textContent = "";
      if (onComplete) onComplete();
    }
  }, 1000);
}

function createLetters() {
  letters = [];
  let centerX = canvas.width / 2;
  let centerY = canvas.height / 2;
  let radius = 200;
  for (let i = 0; i < 300; i++) {
    let angle = Math.random() * 2 * Math.PI;
    let r = radius * Math.sqrt(Math.random());
    let x = centerX + r * Math.cos(angle);
    let y = centerY + r * Math.sin(angle);
    let char = alphabet[Math.floor(Math.random() * alphabet.length)];
    letters.push({ text: char, x: x, y: y, scatterX: 0, scatterY: 0, scattered: false, alpha: 1 });
  }
}

async function detectHands() {
  if (!isGestureMode || !handDetectionActive) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (webcam.readyState === 4) {
    const predictions = await model.estimateHands(webcam);
    if (predictions.length > 0) {
      drawHand(predictions[0].landmarks);
    } else {
      drawLetters();
    }
  } else {
    drawLetters();
  }
  requestAnimationFrame(detectHands);
}

function drawHand(landmarks) {
  if (!isGestureMode) return; // ✅ Don't draw hand in cursor mode
  ctx.fillStyle = `rgba(255, 255, 255, ${handOpacity})`;
  ctx.shadowColor = 'white';
  ctx.shadowBlur = 20;
  for (let i = 0; i < landmarks.length; i++) {
    let [x3d, y3d] = landmarks[i];
    let x = canvas.width - (x3d * canvas.width / webcam.videoWidth);
    let y = y3d * canvas.height / webcam.videoHeight;
    ctx.beginPath();
    ctx.fillStyle = i === 8 
      ? 'rgba(255, 255, 255, 0.7)' 
      : `rgba(255, 255, 255, ${handOpacity})`;
    ctx.arc(x, y, 15, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  let indexTip = landmarks[8];
  indexTipX = canvas.width - (indexTip[0] * canvas.width / webcam.videoWidth);
  indexTipY = indexTip[1] * canvas.height / webcam.videoHeight;
  drawLetters();
}

function handleMouseMove(e) {
  indexTipX = e.clientX;
  indexTipY = e.clientY;
  console.log("Mouse moved to", indexTipX, indexTipY);
}

function drawCursorLetters() {
  if (isGestureMode) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawLetters();
  requestAnimationFrame(drawCursorLetters);
}

function drawLetters() {
  ctx.fillStyle = 'white';
  ctx.font = '18px Helvetica';
  for (let letter of letters) {
    if (!letter.scattered) {
      let d = dist(indexTipX, indexTipY, letter.x, letter.y);
      if (d < 100) {
        letter.scatterX = (Math.random() - 0.5) * 2;
        letter.scatterY = (Math.random() - 0.5) * 2;
        letter.scattered = true;
      }
    }
    if (letter.scattered) {
      letter.x += letter.scatterX;
      letter.y += letter.scatterY;
      letter.alpha -= 0.002;
      letter.alpha = Math.max(letter.alpha, 0);
    }
    ctx.globalAlpha = letter.alpha;
    ctx.fillText(letter.text, letter.x, letter.y);
  }
  ctx.globalAlpha = 1.0;
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1)**2 + (y2 - y1)**2);
}
