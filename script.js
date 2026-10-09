const recordButton = document.querySelector("#recordButton");
const buttonText = document.querySelector("#buttonText");
const status = document.querySelector("#status");
const statusText = document.querySelector("#statusText");
const timer = document.querySelector("#timer");
const canvas = document.querySelector("#waveform");
const transcriptContent = document.querySelector("#transcriptContent");
const finalTranscript = document.querySelector("#finalTranscript");
const interimTranscript = document.querySelector("#interimTranscript");
const placeholder = document.querySelector("#placeholder");
const copyButton = document.querySelector("#copyButton");
const clearButton = document.querySelector("#clearButton");
const supportMessage = document.querySelector("#supportMessage");
const languageSelect = document.querySelector("#languageSelect");

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let mediaStream;
let audioContext;
let analyser;
let animationFrame;
let timerInterval;
let startedAt;
let isRecording = false;
let savedTranscript = "";

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(canvas.clientWidth * ratio);
  canvas.height = Math.round(canvas.clientHeight * ratio);
}

function drawIdleWave() {
  resizeCanvas();
  const context = canvas.getContext("2d");
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);
  context.strokeStyle = "rgba(94, 234, 212, 0.34)";
  context.lineWidth = Math.max(2, window.devicePixelRatio || 1);
  context.beginPath();
  for (let x = 0; x <= width; x += 4) {
    const y = height / 2 + Math.sin(x * 0.018) * height * 0.055 * Math.sin(x * 0.003);
    x === 0 ? context.moveTo(x, y) : context.lineTo(x, y);
  }
  context.stroke();
}

function drawLiveWave() {
  const context = canvas.getContext("2d");
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(data);
  context.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, "#2dd4bf");
  gradient.addColorStop(.5, "#99f6e4");
  gradient.addColorStop(1, "#2dd4bf");
  context.strokeStyle = gradient;
  context.lineWidth = Math.max(2.5, (window.devicePixelRatio || 1) * 1.4);
  context.beginPath();
  const slice = canvas.width / data.length;
  data.forEach((value, index) => {
    const x = index * slice;
    const y = (value / 128) * canvas.height / 2;
    index === 0 ? context.moveTo(x, y) : context.lineTo(x, y);
  });
  context.stroke();
  animationFrame = requestAnimationFrame(drawLiveWave);
}

function updateTranscriptActions() {
  const hasText = Boolean((savedTranscript + interimTranscript.textContent).trim());
  copyButton.disabled = !hasText;
  clearButton.disabled = !hasText;
  placeholder.hidden = hasText;
}

function setRecordingUI(active) {
  document.body.classList.toggle("recording", active);
  recordButton.setAttribute("aria-pressed", String(active));
  recordButton.setAttribute("aria-label", active ? "Stop recording" : "Start recording");
  buttonText.textContent = active ? "Stop recording" : "Start recording";
  statusText.textContent = active ? "Listening…" : "Ready to record";
  languageSelect.disabled = active;
}

function appendFinalTranscript(words) {
  const cleanWords = words.trim();
  if (!cleanWords) return;

  // Chinese does not need a space between recognition segments. English does.
  const lastCharacter = savedTranscript.trimEnd().slice(-1);
  const firstCharacter = cleanWords.charAt(0);
  const isCjk = (character) => /[\u3400-\u9fff\uf900-\ufaff]/.test(character);
  const separator = savedTranscript && !isCjk(lastCharacter) && !isCjk(firstCharacter) ? " " : "";
  savedTranscript = `${savedTranscript.trimEnd()}${separator}${cleanWords}`;
}

function startTimer() {
  startedAt = Date.now();
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    timer.textContent = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  }, 250);
}

function stopTimer() {
  clearInterval(timerInterval);
}

async function startRecording() {
  supportMessage.hidden = true;
  if (!SpeechRecognition) {
    supportMessage.textContent = "Live transcription is not supported in this browser. Please open this page in the latest Google Chrome or Microsoft Edge.";
    supportMessage.hidden = false;
    return;
  }

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(mediaStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    // zh-CN is intentionally the default: Chromium's recognizer handles
    // Mandarin and common English code-switching in the same utterance.
    recognition.lang = languageSelect.value === "mixed" ? "zh-CN" : languageSelect.value;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const words = event.results[i][0].transcript;
        if (event.results[i].isFinal) appendFinalTranscript(words);
        else interim += words;
      }
      finalTranscript.textContent = savedTranscript;
      interimTranscript.textContent = interim;
      updateTranscriptActions();
    };

    recognition.onerror = (event) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        supportMessage.textContent = `Transcription stopped: ${event.error.replaceAll("-", " ")}. Please check your microphone permission and try again.`;
        supportMessage.hidden = false;
      }
    };

    recognition.onend = () => {
      if (isRecording) {
        try { recognition.start(); } catch (_) { /* already restarting */ }
      }
    };

    isRecording = true;
    recognition.start();
    setRecordingUI(true);
    startTimer();
    resizeCanvas();
    drawLiveWave();
  } catch (error) {
    supportMessage.textContent = error.name === "NotAllowedError"
      ? "Microphone access was blocked. Allow microphone access in your browser settings, then try again."
      : "Your microphone could not be started. Check that it is connected and not being used by another app.";
    supportMessage.hidden = false;
  }
}

function stopRecording() {
  isRecording = false;
  if (recognition) recognition.stop();
  if (mediaStream) mediaStream.getTracks().forEach((track) => track.stop());
  if (audioContext) audioContext.close();
  cancelAnimationFrame(animationFrame);
  stopTimer();
  interimTranscript.textContent = "";
  setRecordingUI(false);
  drawIdleWave();
  updateTranscriptActions();
}

recordButton.addEventListener("click", () => isRecording ? stopRecording() : startRecording());

document.addEventListener("keydown", (event) => {
  if (event.code === "Space" && !["INPUT", "TEXTAREA", "BUTTON"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    isRecording ? stopRecording() : startRecording();
  }
});

copyButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(savedTranscript.trim());
  copyButton.querySelector("span").textContent = "Copied";
  setTimeout(() => { copyButton.querySelector("span").textContent = "Copy"; }, 1400);
});

clearButton.addEventListener("click", () => {
  savedTranscript = "";
  finalTranscript.textContent = "";
  interimTranscript.textContent = "";
  updateTranscriptActions();
});

window.addEventListener("resize", () => { if (!isRecording) drawIdleWave(); });
drawIdleWave();
updateTranscriptActions();
