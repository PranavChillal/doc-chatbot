# DocChat: Chat with your PDFs

A full-stack RAG (retrieval-augmented generation) app. Upload a PDF, ask questions in plain language, and get answers that cite the document and page they came from.

**Live demo:** https://doc-chatbot-swart.vercel.app/

> The public demo has uploads turned off and comes with a sample PDF, so you can try the questions right away. The server runs on a free tier and sleeps when idle, so the first load can take up to a minute.

## Features

- PDF upload with text extraction, page by page
- Semantic search: finds relevant passages by meaning, not just matching words
- Answers grounded in your documents, with numbered citations (document name and page)
- Questions with no relevant passage are refused without calling the AI model
- Saved chats with follow-up questions ("which room is that in?")
- Search all documents or limit a chat to one

## How it works

1. **Upload:** the server checks the file really is a PDF, extracts the text of each page, and splits it into overlapping chunks.
2. **Embed:** each chunk is turned into a 768-number vector (Google's embedding API) and stored in MongoDB Atlas.
3. **Search:** a question is embedded the same way, and Atlas Vector Search returns the closest chunks by cosine similarity.
4. **Filter:** chunks below a relevance score are dropped. If none are left, the app says it couldn't find an answer, and the AI model is never called.
5. **Answer:** the remaining chunks are sent to the AI model as numbered passages, with instructions to answer only from them and cite like `[1]`.
6. **Cite:** the server reports which passages the answer actually cited, and the UI highlights them.

## Tech stack

| Layer       | Tools                                       |
| ----------- | ------------------------------------------- |
| Frontend    | React (Vite), plain CSS                     |
| Backend     | Node.js, Express                            |
| Database    | MongoDB Atlas with Vector Search (Mongoose) |
| AI          | Google Gemini API (embeddings and answers)  |
| PDF reading | pdfjs-dist                                  |
| Hosting     | Vercel (client), Render (server)            |

## Design decisions

- **Chunking with overlap.** About 900 characters per chunk, with 150 characters of overlap, cut at sentence ends where possible. Each chunk keeps its page number, which is what makes page citations possible.
- **A measured relevance cutoff.** Embedding models score differently, so I measured it: off-topic questions topped out around 0.76 and relevant ones started around 0.81, and the cutoff (0.78) sits in that gap. It has to be re-measured if the embedding model changes.
- **Grounded prompting.** The model is told to use only the numbered passages, to cite them, to treat document text as untrusted (so instructions hidden inside a PDF are ignored), and to say so when the answer isn't there.
- **Resilient AI calls.** Each call has a 20-second timeout, one retry for temporary errors, and automatic fallback to backup models when the main one is busy. Errors are turned into safe messages, so internals never leak.
- **Hosted embeddings.** An earlier version ran a local embedding model, but it didn't fit a 512 MB free server, so embeddings moved behind a single module that calls a hosted API. While testing, I found that passing a list of strings to the embedding call merges them into one vector, so each text is sent separately and the response size is validated.
- **Private chats without accounts.** Each browser makes a random id and sends it in a header. Chats are saved under it, so visitors only see their own.

## Safety limits

- Uploads: PDF only (checked by file signature, not just the name), max 5 MB and 100 pages
- Questions: max 500 characters
- Rate limit: 10 AI requests per minute per IP, plus a daily cap on total AI requests
- Chats: max 30 per browser, 100 messages each
- Demo mode (`DEMO_MODE=true`) disables uploading and deleting documents
- CORS only allows the configured website (`CLIENT_ORIGIN`)

## API

| Method and path                                                    | What it does                                           |
| ------------------------------------------------------------------ | ------------------------------------------------------ |
| `POST /api/documents`                                              | Upload a PDF (form field `file`)                       |
| `GET /api/documents`                                               | List documents                                         |
| `DELETE /api/documents/:id`                                        | Delete a document and its chunks                       |
| `POST /api/search`                                                 | Show the closest chunks and scores for a query         |
| `POST /api/chat`                                                   | Ask a question (`question`, optional `conversationId`) |
| `GET/POST /api/conversations`, `GET/DELETE /api/conversations/:id` | Manage saved chats                                     |
| `GET /health`                                                      | Health check                                           |

## Run it locally

You need Node.js, a free MongoDB Atlas cluster, and a Google Gemini API key.

```bash
git clone https://github.com/PranavChillal/doc-chatbot.git
cd doc-chatbot/server
npm install
```

Create `server/.env`:

```
PORT=5001
MONGO_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=a_gemini_text_model_your_key_can_use
GEMINI_FALLBACK_MODELS=optional,comma,separated,backups
```

Build the vector index once (re-run until it says `queryable=true`), then start the server:

```bash
node scripts/createVectorIndex.js
npm run dev
```

In a second terminal:

```bash
cd client
npm install
```

Create `client/.env`:

```
VITE_API_URL=http://localhost:5001
```

```bash
npm run dev
```

Open http://localhost:5173 and upload a PDF.

On a public server, also set `DEMO_MODE=true`, `CLIENT_ORIGIN` (your website's address), and optionally `DAILY_AI_LIMIT`.

## Project structure

```
doc-chatbot/
├── server/
│   ├── index.js              # app setup, CORS, rate limits
│   ├── config.js             # embedding model, vector index, relevance cutoff
│   ├── models/               # PdfDocument, Chunk, Conversation
│   ├── routes/               # documents, search, chat, conversations
│   ├── utils/                # pdf extraction, chunking, embeddings, AI calls, retrieval, security
│   └── scripts/              # createVectorIndex.js, listModels.js
└── client/
    └── src/                  # App, Sidebar, Chat, api.js
```

## Limitations and next steps

- No user accounts: chats are tied to a browser id, and documents are shared.
- On the free Gemini tier, Google may use submitted text to improve its products, so use public or sample documents only.
- Scanned PDFs (images of text) aren't supported, since there's no OCR.
- Next steps: user accounts, streaming answers, OCR, and automated tests.

## Author

Pranav P Chillal
[LinkedIn](https://www.linkedin.com/in/pranav-p-chillal-6a97813bb) · [GitHub](https://github.com/PranavChillal)
