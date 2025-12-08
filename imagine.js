const express = require("express");
const app = express();
const errorHandler = require('errorhandler');
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT, 10) || 8080;
const publicDir = process.argv[2] || __dirname + '/public';
const io = require('socket.io').listen(app.listen(port));
const config = require("./config.json");
const { OpenAI } = require("openai");
const openai = new OpenAI({apiKey: config.OpenAIApiKey});
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

app.use(express.static(publicDir));
app.use(errorHandler({ dumpExceptions: true, showStack: true}));

console.log("Imagine server running at " + hostname + ":" + port);

let state = {"interim": "What can you imagine?", "final": "", "src": ""};

async function generateImage(prompt) {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3", prompt, n: 1, size: "1792x1024"
    });
    const tempUrl = response.data[0].url;
    return await mirrorToS3(tempUrl, makeFilename(prompt, true, "png"));
  } catch (e) {
    console.log(e);
    return null;
  }
}

async function generateApp(prompt) {
  try {
    const response = await openai.responses.create({
      model: "gpt-5.1",
      input: [
        { role: "system", content: "You output only HTML." },
        { role: "user", content: appPrompt(prompt) }
      ],
      text: { format: { type: "text" } },
      reasoning: { effort: "none" }, // "none/low/medium"
      max_output_tokens: 8000
    });

    let html = (response.output_text || "").trim();
    if (!html.toLowerCase().startsWith("<!doctype html")) {
      html = "<!doctype html>\n" + html;
    }
    if (!html.toLowerCase().includes("<html")) return null;

    const filename = makeFilename(prompt, false, "html");
    return await uploadToS3(Buffer.from(html, "utf8"), filename, "text/html");
  } catch (e) {
    console.error(e);
    return null;
  }
}

// (async () => {
//   const prompt = "a simulated command line user interface from the movie War Games, where the user only needs to hit the enter key for the simulated input/output messages to be displayed";
//   console.log("Prompt:", prompt);
//   const url = await generateApp(prompt);
//   console.log("App URL:", url);
// })();

io.sockets.on('initialload', function (socket) {  
	socket.emit('update', state);
});

io.sockets.on('connection', (socket) => {
  socket.on('hello', (message) => {  
  	io.sockets.emit('update', state);
  });

  socket.on('interim', (message) => {
    state.interim = message.interim;
  	io.sockets.emit('update', state);
  });

  socket.on('final', async (message) => {
    console.log(message.final);
    state.final = message.final;
    state.interim = "";
  	state.src = "";
    io.sockets.emit('update', state);

    state.redirect = await generateApp(message.final);
    if (state.redirect) {
      state.final = "";
      console.log(state);
    } else {
      state.final = "error";
    }
    io.sockets.emit('update', state);
  });
});

const s3 = new S3Client({
  region: config.S3Region,
  credentials: {
    accessKeyId: config.S3AccessKeyId,
    secretAccessKey: config.S3SecretAccessKey
  }
});

async function mirrorToS3(src, filename) {
  const res = await fetch(src);
  if (!res.ok) return null;

  const bytes = Buffer.from(await res.arrayBuffer());
  return uploadToS3(bytes, filename, "image/png");
}

async function uploadToS3(Body, filename, ContentType) {
  const Key = config.S3Path + filename;
  await s3.send(new PutObjectCommand({Bucket: config.S3Bucket, Key, Body, ContentType, 
    CacheControl: "no-cache, no-store, must-revalidate, max-age=0"
  }));
  return config.BaseUrl ? `${config.BaseUrl}/${Key}` : 
    `https://${config.S3Bucket}.s3.${config.S3Region}.amazonaws.com/${Key}`;
}

function makeFilename(prompt, random, suffix) {
  var filename = simplify(prompt, 50);
  if (random) filename += "-" + randomNumber(1000,9999);
  return filename + "." + suffix;
} 

function simplify(value, maxLen = 30) {
  let words = value
    .toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .split(/\s+/);

  let out = "";
  for (const w of words) {
    const next = out ? `${out}-${w}` : w;
    if (next.length > maxLen) break;
    out = next;
  }
  return out || "imagine";
}

function randomNumber(min, max) {
  return Math.random() * (max - min) + min;
}

function appPrompt(shortPrompt) {
  return `
Generate a single-file web app for a 16:9 TV (1920x1080).
Return ONLY valid HTML (no markdown, no explanation).
The content should fill up the screen nicely and be legible
  when viewed by a person sitting ten feet away from the TV.

Hard requirements:
- One HTML file with inline CSS and inline JS.
- Fullscreen layout; no scrolling; all text/buttons large.
- Remote-control only: Arrow keys + Enter + Escape.
- NO mouse, NO touch, NO clicking. 
- App must be fully usable with only those keys.
- No external libraries or CDNs.
- No network calls (no fetch/XHR/WebSocket).
- Keep implementations minimal and concise; prefer simple rules over full-feature completeness.

For games:
- Start automatically on first Enter/OK press (no click).
- Show on-screen controls legend.
- Never throw runtime errors:
  - All array accesses must be bounds-checked.

User request: ${shortPrompt}
`.trim();
}


