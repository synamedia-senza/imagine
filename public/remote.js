let socket = io.connect(location.hostname);

socket.emit('hello', '');

socket.on('update', (message) => {
  interim.innerHTML = message.interim;
  final.innerHTML = message.final;
});

const tapTheMic = "Tap the mic to listen.";
const whatDoYouWant = "What can you imagine?";

function showInfo(string) {
  info.innerHTML = string;
}
showInfo(tapTheMic);

let recognition = new webkitSpeechRecognition();
let recognizing = false;

recognition.lang = 'en-US';
recognition.continuous = true;
recognition.interimResults = true;
recognition.onstart = () => {
  recognizing = true;
  showInfo(whatDoYouWant);
};
recognition.onend = () => {
  recognizing = false;
};
recognition.onresult = (event) => {
  for (let i = event.resultIndex; i < event.results.length; ++i) {
    let value = event.results[i][0].transcript;
    if (event.results[i].isFinal) {
      socket.emit("final", {"final": value});
      
      if (recognizing) {
        recognition.stop();
        showInfo(tapTheMic);
      }
    } else {
      socket.emit("interim", {"interim": value});
    }
  }
};

recognition.onerror = (event) => {
  if (event.error == 'no-speech') {
    showInfo('Sorry, didn’t hear you.');
  } else if (event.error == 'audio-capture') {
    showInfo('No microphone was found.');
  } else if (event.error == 'not-allowed') {
    showInfo('Couldn’t use the microphone.');
  }
};

function microphone(event) {
  if (recognizing) {
    recognition.stop();
    showInfo(tapTheMic);
  } else {
    socket.emit('reset', '');
    recognition.start();
  }
}

