function generateCode(text, size) {
  let data = encodeURIComponent(text);
  let src = `http://api.qrserver.com/v1/create-qr-code/?data=${data}&size=${size}x${size}`;
  qrcode.src = src;
}
let page = window.location.href;
if (page.endsWith("html") || page.endsWith("/")) {
  page = page.substring(0, page.lastIndexOf('/'));
}
generateCode(page + "/remote.html", 200);

let socket = io.connect(location.hostname);

socket.emit('hello', '');

socket.on('update', (message) => {
  console.log(message);
  
  if (message.interim) {
    request.innerHTML = message.interim;
    request.style.opacity = 0.75;
  } else if (message.final) {
    request.innerHTML = message.final;
    request.style.animationDuration = "2.0s";
    request.style.animationIterationCount = "infinite";
    request.style.animationName = "pulse";
  } else if (message.src) {
    image.src = message.src;
    request.style.animationDuration = "7.0s";
    request.style.animationIterationCount = 1;
    request.style.animationName = "final";
    setTimeout(() => request.style.opacity = 0.0, 7000);
  }
});

document.addEventListener("keydown", function(event) {
	switch (event.key) {
    case "ArrowUp": qrcode.style.opacity = 1.0; break;
    case "ArrowDown": qrcode.style.opacity = 0.0; break;
		default: return;
	}
	event.preventDefault();
});
