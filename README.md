# Kyambogo Translator

A simple web-based translation app that lets a user translate text between supported languages using a backend API.

## Project overview

This project has two main parts:

1. A frontend interface built with HTML, CSS, and JavaScript.
2. A Node.js server that receives the text from the browser, sends it to the translation service, and returns the translated output.

The app is designed for coursework use and presents a clean university-style interface without exposing third-party service names to the user.

## How it works

### 1. User enters text
The browser loads the page from the local server and shows:
- source language dropdown
- target language dropdown
- input text area
- output translation area

### 2. User clicks Translate
When the form is submitted, the browser sends a POST request to:

```text
/api/translate
```

with JSON like this:

```json
{
  "text": "Hello world",
  "source_lang": "en",
  "target_lang": "lug"
}
```

### 3. Server receives the request
The server in `server.js`:
- reads the JSON request body
- validates the text and target language
- checks whether the API key is configured
- sends the request to the translation service

### 4. Translation service processes the request
The backend sends the text to the Fasiri translation API using the configured API key.

### 5. Response is sent back to the browser
The server reads the translated result and returns it in JSON format:

```json
{
  "translated_text": "Gyebale ko ensi yonna."
}
```

The frontend then displays the translation in the result box.

## Project structure

```text
project/
├── index.html         # Main webpage
├── style.css          # Styling for the interface
├── script.js          # Frontend logic for submit and UI updates
├── server.js          # Backend server and API logic
├── .env               # Local environment variables
├── package.json       # Node.js project config
├── kyulogo.jpeg       # University logo used in the header
├── README.md          # Project documentation
└── outputs/           # Optional output files or project artifacts
```

## Environment variables

The app uses a `.env` file for configuration. Example:

```env
PORT=3000
FASIRI_API_KEY=your_api_key_here
FASIRI_TRANSLATE_URL=https://api.fasiri-ai.com/api/v1/translate
# Legacy compatibility: some earlier versions used FASIRI_API_ENDPOINT
FASIRI_API_ENDPOINT=https://api.fasiri-ai.com/api/v1/translate
```

Important:
- `PORT` determines the port the server runs on.
- `FASIRI_API_KEY` is required for the translation request.
- `FASIRI_TRANSLATE_URL` is the active setting used by the server.
- `FASIRI_API_ENDPOINT` is still accepted for older setups.

## Run the project

From the project folder, run:

```bash
npm start
```

Then open in the browser:

```text
http://localhost:3000
```

## Deploy on Netlify

This project includes `netlify.toml` and a Netlify Function for the `/api` routes. In the Netlify site settings, add:

```env
FASIRI_API_KEY=your_api_key_here
FASIRI_TRANSLATE_URL=https://api.fasiri-ai.com/api/v1/translate
```

Deploy the project root as the publish directory. Netlify will publish the static frontend and route `/api/languages` and `/api/translate` to the serverless function automatically.

## Notes

- The frontend does not expose the API key to the user.
- The translation uses the backend server as a secure middle layer.
- The interface has been styled for a university coursework presentation.

## Troubleshooting

### App does not start
Check whether port 3000 is already in use. If so, either stop the other process or change the port in `.env`.

### Translation fails
Make sure:
- `.env` exists
- `FASIRI_API_KEY` is valid
- the language codes are supported
- `FASIRI_TRANSLATE_URL` or `FASIRI_API_ENDPOINT` points to the live Fasiri endpoint
- the server is restarted after changing environment values

### Recent fix
The app was previously ignoring the live `.env` endpoint name and falling back to a stale URL. The server now accepts either `FASIRI_TRANSLATE_URL` or `FASIRI_API_ENDPOINT`, which keeps translation working across older and newer config setups.

## Summary

This project lets users translate text between languages through a simple web interface. The frontend handles the user interaction, while the Node.js backend handles secure communication with the translation API.
