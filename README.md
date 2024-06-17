# Imagine

A demo that shows how to connect a mobile phone using a QR code, capture voice input using speech recognition, send commands to the TV using Socket.IO, and search for images using OpenAI.

Scan the QR code on your phone, tap the microphone icon, say what you're looking for, and then in a few moments you'll see it appear on the TV.

### OpenAI

Open an [OpenAI](https://platform.openai.com) account, create a project, get an API Key and save it in config.json.

```all
npm install --save openai
```

### Install Node.js

Install the [Node.js](https://nodejs.org/download) runtime environment. Node.js is a tool that is used to run the Voice server, which is implemented as a JavaScript script. 

### Change to Imagine directory

```all
cd ~/Downloads/imagine
```
Open a terminal and change to the Voice API directory, wherever you have downloaded it.

### Install node modules

```all
npm install
```
Then use the node package manager to install the required packages and their dependencies. The npm tool will look in the package.json file to find out which packages need to be installed.

### Start the server

```all
node imagine.js
```
In a separate terminal window or tab, start the Voice server. This will tell Node.js to run the voice.js script and wait for incoming HTTP requests and Socket.IO messages.

### Start page

You can open the start page by going to [http://localhost:8080/](http://localhost:8080/) in your browser. Substitute the name of your computer to connect from other devices. 

