from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import chromadb
from dotenv import load_dotenv
import google.generativeai as genai

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect to our permanent local folder database
chroma_client = chromadb.PersistentClient(path="./chroma_storage")
code_collection = chroma_client.get_or_create_collection(name="my_code_vault")

# --- CONNECT TO GEMINI AI ---
load_dotenv()
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY)
ai_model = genai.GenerativeModel('models/gemini-2.5-flash')

class ChatMessage(BaseModel):
    role: str  # either 'user' or 'model'
    parts: str

class ChatRequest(BaseModel):
    history: list[ChatMessage]
    new_message: str

class CodeSubmission(BaseModel):
    file_name: str
    raw_code: str

class SearchRequest(BaseModel):
    query_text: str

class RepositoryScanRequest(BaseModel):
    repo_path: str

@app.post("/api/analyze-code")
async def analyze_code(submission: CodeSubmission):
    try:
        lines = submission.raw_code.split("\n")
        total_lines = len(lines)
        
        chunks = []
        current_chunk = []
        current_start = 1
        
        for idx, line in enumerate(lines):
            current_chunk.append(line)
            line_num = idx + 1
            
            if len(current_chunk) >= 40 and (line.startswith("def ") or line.startswith("class ") or line.strip() == ""):
                chunks.append({
                    "text": "\n".join(current_chunk),
                    "line_start": current_start,
                    "line_end": line_num
                })
                current_chunk = current_chunk[-5:] if len(current_chunk) > 5 else []
                current_start = line_num - len(current_chunk) + 1

        if current_chunk:
            chunks.append({
                "text": "\n".join(current_chunk),
                "line_start": current_start,
                "line_end": total_lines
            })

        for i, chunk in enumerate(chunks):
            chunk_id = f"{submission.file_name}_chunk_{i}"
            code_collection.upsert(
                ids=[chunk_id],
                documents=[chunk["text"]],
                metadatas=[{
                    "file_name": submission.file_name,
                    "chunk_index": i,
                    "line_range": f"{chunk['line_start']}-{chunk['line_end']}"
                }]
            )

        summary_prompt = f"Summarize the architecture of this file '{submission.file_name}' in 2 short sentences."
        response = ai_model.generate_content(summary_prompt)

        return {
            "status": "successfully_stored_in_vector_db",
            "file_processed": submission.file_name,
            "metrics": {
                "total_lines": total_lines,
                "generated_chunks": len(chunks)
            },
            "architecture_summary": response.text
        }
    except Exception as e:
        return {"status": "storage_failed", "error": str(e)}


@app.post("/api/search-code")
async def search_code(request: SearchRequest):
    try:
        search_results = code_collection.query(
            query_texts=[request.query_text],
            n_results=1
        )
        
        matched_documents = search_results.get("documents", [[]])[0]
        matched_metadata = search_results.get("metadatas", [[]])[0]
        
        if not matched_documents:
            return {"status": "no_match_found", "retrieved_code": "No code found."}
            
        retrieved_code = matched_documents[0]
        file_name = matched_metadata[0].get("file_name") if matched_metadata else "unknown"
        
        ai_prompt = f"""
        You are an expert AI assistant reading a developer's codebase.
        
        Here is the code file I found in my database that relates to the user's inquiry:
        File: {file_name}
```python
        {retrieved_code}
        ```
        
        The user is asking this question: "{request.query_text}"
        
        Please read the code snippet above, and answer their question conversationally. Explain what parts of the code perform the task they are asking about.
        """
        
        ai_response = ai_model.generate_content(ai_prompt)
        
        return {
            "status": "search_successful",
            "matched_file": file_name,
            "retrieved_code": retrieved_code,
            "ai_explanation": ai_response.text
        }
    except Exception as e:
        return {"status": "search_failed", "error": str(e)}
    

@app.post("/api/chat-code")
async def chat_code(request: ChatRequest):
    try:
        search_results = code_collection.query(
            query_texts=[request.new_message],
            n_results=3
        )
        
        matched_documents = search_results.get("documents", [[]])[0]
        matched_metadata = search_results.get("metadatas", [[]])[0]
        distances = search_results.get("distances", [[]])[0]
        
        context_code = ""
        valid_context_found = False
        
        if matched_documents and distances:
            context_blocks = []
            for doc, meta, dist in zip(matched_documents, matched_metadata, distances):
                if dist < 1.7:
                    valid_context_found = True
                    f_name = meta.get("file_name", "unknown")
                    l_range = meta.get("line_range", "unknown")
                    context_blocks.append(f"/* File: {f_name} (Lines: {l_range}) */\n```python\n{doc}\n```")
            
            if valid_context_found:
                context_code = "\n\n[Verified Relevant Codebase Context Blocks Found:]\n" + "\n\n".join(context_blocks)
        
        if not valid_context_found:
            context_code = "\n\n[System Notice: No relevant files found in database matching this query context. Answer generally or let the user know.]"

        # Safe chat history configuration map
        formatted_history = []
        for msg in request.history:
            # Using 'model' internally to map correctly to Gemini parameters
            api_role = "model" if msg.role == "model" else "user"
            formatted_history.append({
                "role": api_role,
                "parts": [msg.parts]
            })
            
        chat = ai_model.start_chat(history=formatted_history)
        full_prompt = f"{request.new_message}\n{context_code}"
        response = chat.send_message(full_prompt)
        
        return {
            "status": "chat_successful",
            "reply": response.text
        }
    except Exception as e:
        return {"status": "chat_failed", "error": str(e)}
    

@app.post("/api/scan-repository")
async def scan_repository(request: RepositoryScanRequest):
    try:
        if not os.path.exists(request.repo_path):
            return {"status": "failed", "error": "The specified folder path does not exist on this machine."}
            
        supported_extensions = ['.py', '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.json']
        ignored_directories = ['node_modules', '.git', 'venv', '__pycache__', 'dist', 'build', 'chroma_storage']
        
        files_indexed = []
        total_chunks_created = 0
        
        for root, dirs, files in os.walk(request.repo_path):
            dirs[:] = [d for d in dirs if d not in ignored_directories]
            
            for file in files:
                file_extension = os.path.splitext(file)[1].lower()
                
                if file_extension in supported_extensions:
                    full_file_path = os.path.join(root, file)
                    relative_path = os.path.relpath(full_file_path, request.repo_path)
                    
                    try:
                        with open(full_file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            code_content = f.read()
                    except Exception:
                        continue
                        
                    lines = code_content.split("\n")
                    total_lines = len(lines)
                    
                    chunks = []
                    current_chunk = []
                    current_start = 1
                    
                    for idx, line in enumerate(lines):
                        current_chunk.append(line)
                        line_num = idx + 1
                        
                        if len(current_chunk) >= 40 and (line.startswith("def ") or line.startswith("class ") or line.strip() == ""):
                            chunks.append({
                                "text": "\n".join(current_chunk),
                                "line_start": current_start,
                                "line_end": line_num
                            })
                            current_chunk = current_chunk[-5:] if len(current_chunk) > 5 else []
                            current_start = line_num - len(current_chunk) + 1

                    if current_chunk:
                        chunks.append({
                            "text": "\n".join(current_chunk),
                            "line_start": current_start,
                            "line_end": total_lines
                        })

                    for i, chunk in enumerate(chunks):
                        chunk_id = f"repo_{relative_path}_chunk_{i}"
                        code_collection.upsert(
                            ids=[chunk_id],
                            documents=[chunk["text"]],
                            metadatas=[{
                                "file_name": relative_path,
                                "chunk_index": i,
                                "line_range": f"{chunk['line_start']}-{chunk['line_end']}"
                            }]
                        )
                    
                    total_chunks_created += len(chunks)
                    files_indexed.append(relative_path)
                    
        return {
            "status": "scan_successful",
            "repository_analyzed": request.repo_path,
            "metrics": {
                "total_files_found": len(files_indexed),
                "total_vector_chunks_committed": total_chunks_created
            },
            "indexed_files_manifest": files_indexed
        }
    except Exception as e:
        return {"status": "scan_failed", "error": str(e)}