const objectSelect = document.querySelector("#grasp-object");
const viewerFrame = document.querySelector("#grasp-viewer-frame");
const loadingMessage = document.querySelector("#grasp-viewer-loading");
const scoreCanvas = document.querySelector("#grasp-score-chart");
const scoreValue = document.querySelector("#grasp-score-value");

// Muted playback is permitted by modern autoplay policies. Calling play() explicitly
// also starts videos that browsers defer merely because they begin below the fold.
document.querySelectorAll("video").forEach((video) => {
  video.defaultMuted = true;
  video.muted = true;

  const startPlayback = () => {
    video.play().catch(() => {
      // Keep the native controls available if a browser or device blocks autoplay.
    });
  };

  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) startPlayback();
  else video.addEventListener("loadeddata", startPlayback, { once: true });
});

if (objectSelect && viewerFrame && loadingMessage && scoreCanvas && scoreValue) {
  const objectTitles = {
    "assets/viser/apple.html": "apple",
    "assets/viser/mini-soccer-ball.html": "mini soccer ball",
    "assets/viser/tomato-soup-can.html": "tomato soup can",
    "assets/viser/mustard-bottle.html": "mustard bottle",
    "assets/viser/rubiks-cube.html": "Rubik's cube",
    "assets/viser/windex-bottle.html": "Windex bottle",
    "assets/viser/bowl.html": "bowl",
    "assets/viser/banana.html": "banana",
    "assets/viser/hammer.html": "hammer",
    "assets/viser/phillips-screwdriver.html": "Phillips screwdriver",
    "assets/viser/pitcher-base.html": "pitcher",
    "assets/viser/medium-clamp.html": "medium clamp",
  };

  let allScoreData = {};
  let currentData = null;
  let currentTime = 0;
  let playbackPoll = 0;

  function currentSlug() {
    return objectSelect.value.split("/").pop().replace(".html", "");
  }

  function scoreAtTime(data, time) {
    if (!data || !data.times.length) return 0;
    let low = 0;
    let high = data.times.length - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (data.times[middle] <= time) low = middle;
      else high = middle - 1;
    }
    return data.scores[low];
  }

  function drawScoreChart() {
    if (!currentData) return;
    const rect = scoreCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dpr = window.devicePixelRatio || 1;
    scoreCanvas.width = Math.round(rect.width * dpr);
    scoreCanvas.height = Math.round(rect.height * dpr);
    const ctx = scoreCanvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const margin = { top: 20, right: 13, bottom: 34, left: 43 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const maxTime = currentData.times[currentData.times.length - 1] || 1;
    const x = (time) =>
      margin.left + (Math.min(Math.max(time, 0), maxTime) / maxTime) * plotWidth;
    const y = (score) =>
      margin.top + (1 - Math.min(Math.max(score, 0), 1)) * plotHeight;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#e3e3e3";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#6a6a6a";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const tick of [0, 0.25, 0.5, 0.75, 1]) {
      ctx.beginPath();
      ctx.moveTo(margin.left, y(tick));
      ctx.lineTo(width - margin.right, y(tick));
      ctx.stroke();
      ctx.fillText(tick.toFixed(tick === 0 || tick === 1 ? 1 : 2), margin.left - 7, y(tick));
    }

    ctx.strokeStyle = "#a31f34";
    ctx.lineWidth = 2.25;
    ctx.lineJoin = "round";
    ctx.beginPath();
    currentData.times.forEach((time, index) => {
      const px = x(time);
      const py = y(currentData.scores[index]);
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    const score = scoreAtTime(currentData, currentTime);
    const markerX = x(currentTime);
    const markerY = y(score);
    ctx.strokeStyle = "rgba(43, 43, 43, 0.45)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(markerX, margin.top);
    ctx.lineTo(markerX, margin.top + plotHeight);
    ctx.stroke();
    ctx.fillStyle = "#a31f34";
    ctx.beginPath();
    ctx.arc(markerX, markerY, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#6a6a6a";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("0", margin.left, height - margin.bottom + 9);
    ctx.textAlign = "right";
    ctx.fillText(`${maxTime.toFixed(1)} s`, width - margin.right, height - margin.bottom + 9);

    ctx.save();
    ctx.translate(11, margin.top + plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Grasp score", 0, 0);
    ctx.restore();

    scoreValue.value = score.toFixed(2);
    scoreValue.textContent = score.toFixed(2);
  }

  function readViserTime() {
    try {
      const inputs = viewerFrame.contentDocument?.querySelectorAll("input") || [];
      for (const input of inputs) {
        const value = input.value.trim();
        if (/^\d+(?:\.\d+)?$/.test(value)) return Number(value);
      }
    } catch (_error) {
      // Same-origin hosting normally makes the iframe readable; keep the last value if not.
    }
    return currentTime;
  }

  function startPlaybackSync() {
    window.clearInterval(playbackPoll);
    playbackPoll = window.setInterval(() => {
      const nextTime = readViserTime();
      if (nextTime !== currentTime) {
        currentTime = nextTime;
        drawScoreChart();
      }
    }, 80);
  }

  function setCurrentData() {
    currentData = allScoreData[currentSlug()] || null;
    currentTime = 0;
    drawScoreChart();
  }

  viewerFrame.addEventListener("load", () => {
    loadingMessage.hidden = true;
    currentTime = 0;
    startPlaybackSync();
  });

  objectSelect.addEventListener("change", () => {
    const source = objectSelect.value;
    const objectName = objectTitles[source] || "selected object";
    loadingMessage.hidden = false;
    loadingMessage.textContent = `Loading ${objectName} grasp…`;
    viewerFrame.title = `Interactive 3D recording of the ${objectName} grasp`;
    viewerFrame.src = source;
    setCurrentData();
  });

  fetch("assets/viser/scores.json")
    .then((response) => response.json())
    .then((data) => {
      allScoreData = data;
      setCurrentData();
    });

  new ResizeObserver(drawScoreChart).observe(scoreCanvas);
}
