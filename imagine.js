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

app.use(express.static(publicDir));
app.use(errorHandler({ dumpExceptions: true, showStack: true}));

console.log("Imagine server running at " + hostname + ":" + port);

let state = {"interim": "What can you imagine?", "final": "", "src": ""};
let testMode = false;

function generate(prompt) {
  return openai.images.generate({
    model: "dall-e-3", prompt, n: 1, size: "1792x1024"
  }).then((response) => {
    return response.data[0].url;
  }).catch((error) => {
    console.log(error);
    return null;
  });
}

async function test() {
  const wait = new Promise((resolve) => {
    setTimeout(() => resolve("images/fish.jpg"), 5000);
  });
  const result = await wait;
  return result;
}

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

    state.src = testMode ? await test() : await generate(message.final);
    if (state.src) {
      state.final = "";
    } else {
      state.final = "error";
    }
    io.sockets.emit('update', state);
  });
});
