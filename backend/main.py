from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.tools import tool
from langchain.agents import create_agent

from langchain_chroma import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader, PyPDFLoader

import sqlite3
import os


# =========================================================
# ENVIRONMENT
# =========================================================

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY is missing from .env")

# =========================================================
# FASTAPI
# =========================================================

app = FastAPI(
    title="AI Student Support Assistant",
    description="AI Student Assistant with RAG, Calculator and Memory",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# DATABASE / MEMORY
# =========================================================

def create_memory_table():

    conn = sqlite3.connect("memory.db")

    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS memory (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)

    conn.commit()
    conn.close()


create_memory_table()


def save_to_memory(key, value):

    conn = sqlite3.connect("memory.db")

    cursor = conn.cursor()

    cursor.execute("""
        INSERT OR REPLACE INTO memory (key, value)
        VALUES (?, ?)
    """, (key, value))

    conn.commit()
    conn.close()


def get_from_memory(key):

    conn = sqlite3.connect("memory.db")

    cursor = conn.cursor()

    cursor.execute(
        "SELECT value FROM memory WHERE key = ?",
        (key,)
    )

    result = cursor.fetchone()

    conn.close()

    if result:
        return result[0]

    return None


# =========================================================
# CALCULATOR TOOL
# =========================================================

@tool
def calculator(expression: str) -> str:
    """
    Calculate basic mathematical expressions.

    Example:
    10 + 20
    100 / 4
    25 * 8
    """

    try:

        allowed = "0123456789+-*/(). "

        if not all(char in allowed for char in expression):
            return "Invalid calculation."

        result = eval(
            expression,
            {"__builtins__": None},
            {}
        )

        return str(result)

    except Exception:
        return "Invalid calculation."


# =========================================================
# COLLEGE DOCUMENT LOADING
# =========================================================

documents = []

documents_folder = "documents"


if os.path.exists(documents_folder):

    for filename in os.listdir(documents_folder):

        file_path = os.path.join(
            documents_folder,
            filename
        )

        try:

            if filename.lower().endswith(".txt"):

                loader = TextLoader(
                    file_path,
                    encoding="utf-8"
                )

                documents.extend(
                    loader.load()
                )

            elif filename.lower().endswith(".pdf"):

                loader = PyPDFLoader(
                    file_path
                )

                documents.extend(
                    loader.load()
                )

        except Exception as error:

            print(
                f"Error loading {filename}: {error}"
            )


else:

    print(
        "WARNING: documents folder not found."
    )


# =========================================================
# TEXT SPLITTER
# =========================================================

chunks = []


if documents:

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=700,
        chunk_overlap=100
    )

    chunks = text_splitter.split_documents(
        documents
    )


# =========================================================
# EMBEDDINGS + CHROMA
# =========================================================

vectorstore = None


if chunks:

    print(
        f"Creating vector database from {len(chunks)} chunks..."
    )

    embeddings = GoogleGenerativeAIEmbeddings(
        model="gemini-embedding-001"
    )

    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        collection_name="college_documents",
        persist_directory="chroma_db"
    )

    print("Vector database ready.")

else:

    print(
        "WARNING: No college documents found."
    )

@tool
def college_knowledge_search(question: str) -> str:
    """
    Search the college knowledge base for information
    related to the student's question.
    """

    if vectorstore is None:
        return (
            "The college knowledge base is currently empty. "
            "Please add PDF or TXT files inside the documents folder."
        )

    try:

        results = vectorstore.similarity_search(
            question,
            k=5
        )

        if not results:
            return (
                "I couldn't find this information "
                "in the college knowledge base."
            )

        content_parts = []

        for doc in results:

            source = os.path.basename(
                doc.metadata.get(
                    "source",
                    "Unknown source"
                )
            )

            page = doc.metadata.get("page")

            if page is not None:
                source_info = (
                    f"{source}, page {page + 1}"
                )
            else:
                source_info = source

            content_parts.append(
                f"""
SOURCE: {source_info}

CONTENT:
{doc.page_content}
"""
            )

        content = "\n\n".join(content_parts)

        return f"""
COLLEGE KNOWLEDGE BASE RESULTS

{content}
"""

    except Exception as error:

        print(
            f"Knowledge search error: {error}"
        )

        return (
            "There was an error while searching "
            "the college knowledge base."
        )

# =========================================================
# STUDENT MEMORY TOOL
# =========================================================

@tool
def student_memory() -> str:
    """
    Retrieve all information remembered about the student.
    """

    try:

        conn = sqlite3.connect("memory.db")

        cursor = conn.cursor()

        cursor.execute("""
            SELECT key, value
            FROM memory
        """)

        rows = cursor.fetchall()

        conn.close()

        if not rows:

            return (
                "No student information is currently remembered."
            )

        memories = []

        for key, value in rows:

            memories.append(
                f"{key}: {value}"
            )

        return "\n".join(memories)

    except Exception as error:

        print(
            f"Memory error: {error}"
        )

        return "Unable to retrieve student memory."


# =========================================================
# SAVE MEMORY TOOL
# =========================================================

@tool
def save_student_memory(
    key: str,
    value: str
) -> str:
    """
    Save important student information
    to persistent memory.
    """

    try:

        save_to_memory(
            key,
            value
        )

        return (
            f"Saved to memory: {key} = {value}"
        )

    except Exception as error:

        print(
            f"Save memory error: {error}"
        )

        return "Unable to save memory."


# =========================================================
# AI MODEL
# =========================================================

llm = ChatGoogleGenerativeAI(
    model="gemini-3.8-flash",
    temperature=0,
    google_api_key=GEMINI_API_KEY
)


# =========================================================
# AI AGENT
# =========================================================

SYSTEM_PROMPT = """
You are an AI Student Support Assistant.

You help college students with:

1. College syllabus and college documents
2. Academic questions
3. Attendance calculations
4. Marks calculations
5. Basic mathematical calculations
6. Student memory

IMPORTANT RULES:

- If the student asks a college-related question,
  ALWAYS use the college_knowledge_search tool.

- If the student asks for a mathematical calculation,
  use the calculator tool.

- If the student asks what you remember about them,
  use the student_memory tool.

- If the student tells you an important personal preference
  or student information that should be remembered,
  use save_student_memory.

- Do not invent college information.

- When answering from the college knowledge base,
  mention the source document at the end.

- Give clear and student-friendly answers.

- If the knowledge base does not contain the answer,
  clearly say that the information was not found.

- Never pretend that information exists if it was not found.
"""


agent = create_agent(
    model=llm,
    tools=[
        calculator,
        college_knowledge_search,
        student_memory,
        save_student_memory
    ],
    system_prompt=SYSTEM_PROMPT
)


# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():

    return {
        "message":
        "AI Student Support Assistant Backend is running!"
    }


# =========================================================
# HEALTH
# =========================================================

@app.get("/api/health")
def health():

    return {
        "status": "healthy",
        "service": "AI Student Support Assistant"
    }


# =========================================================
# MEMORY API
# =========================================================

@app.post("/api/memory")
def save_memory(
    key: str,
    value: str
):

    save_to_memory(
        key,
        value
    )

    return {
        "message": "Memory saved",
        "key": key,
        "value": value
    }


@app.get("/api/memory")
def get_memory(
    key: str
):

    value = get_from_memory(
        key
    )

    return {
        "key": key,
        "value":
        value if value
        else "No memory found"
    }


# =========================================================
# CALCULATOR API
# =========================================================

@app.get("/api/calculator")
def calculate(
    expression: str
):

    result = calculator.invoke(
        expression
    )

    return {
        "expression": expression,
        "result": result
    }

@app.post("/api/agent-chat")
def agent_chat(question: str):

    try:

        print(f"\nUSER QUESTION: {question}")

        # =================================================
        # DIRECT CALCULATOR
        # =================================================

        expression = question.lower().strip()

        # Remove common words
        remove_words = [
            "what is",
            "calculate",
            "solve",
            "please calculate",
            "please solve"
        ]

        for word in remove_words:
            expression = expression.replace(word, "")

        expression = expression.strip().rstrip("?")

        # Check if question is a simple calculation
        allowed = "0123456789+-*/().% "

        if expression and all(
            char in allowed
            for char in expression
        ):

            result = calculator.invoke(expression)

            print(
                f"\nCALCULATOR RESULT: {result}\n"
            )

            return {
                "question": question,
                "answer": f"The answer is **{result}**."
            }

        # =================================================
        # AI AGENT
        # =================================================

        result = agent.invoke(
            {
                "messages": [
                    {
                        "role": "user",
                        "content": question
                    }
                ]
            }
        )

        print(
            "\nAGENT EXECUTION COMPLETED"
        )

        final_message = result["messages"][-1]

        # =================================================
        # GET FINAL RESPONSE
        # =================================================

        if hasattr(
            final_message,
            "content_blocks"
        ):

            blocks = final_message.content_blocks

            text_parts = []

            for block in blocks:

                if isinstance(block, dict):

                    if block.get("type") == "text":

                        text_parts.append(
                            block.get("text", "")
                        )

                elif isinstance(block, str):

                    text_parts.append(block)

            answer = "".join(text_parts)

        else:

            content = final_message.content

            if isinstance(content, list):

                text_parts = []

                for item in content:

                    if isinstance(item, dict):

                        if item.get("type") == "text":

                            text_parts.append(
                                item.get("text", "")
                            )

                answer = "".join(text_parts)

            else:

                answer = str(content)

        if not answer.strip():

            answer = (
                "I could not generate an answer."
            )

        print(
            f"\nAI ANSWER: {answer}\n"
        )

        return {
            "question": question,
            "answer": answer
        }

    except Exception as error:

        print(
            "\n=============================="
        )

        print("AGENT ERROR:")
        print(repr(error))

        print(
            "==============================\n"
        )

        return {
            "question": question,
            "answer":
                "Sorry, I could not process your question right now.",
            "error": str(error)
        }
        # =========================================================
# DOCUMENT UPLOAD API
# =========================================================

@app.post("/api/upload-document")
async def upload_document(
    file: UploadFile = File(...)
):

    try:

        allowed_extensions = [".pdf", ".txt"]

        filename = file.filename or ""

        extension = os.path.splitext(filename)[1].lower()

        if extension not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail="Only PDF and TXT files are allowed."
            )

        os.makedirs(documents_folder, exist_ok=True)

        file_path = os.path.join(
            documents_folder,
            filename
        )

        file_content = await file.read()

        with open(file_path, "wb") as output_file:
            output_file.write(file_content)

        print(f"\nDOCUMENT UPLOADED: {filename}\n")

        if extension == ".txt":
            loader = TextLoader(
                file_path,
                encoding="utf-8"
            )
        else:
            loader = PyPDFLoader(file_path)

        new_documents = loader.load()

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=700,
            chunk_overlap=100
        )

        new_chunks = text_splitter.split_documents(
            new_documents
        )

        global vectorstore

        embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )

        if vectorstore is None:

            vectorstore = Chroma.from_documents(
                documents=new_chunks,
                embedding=embeddings,
                collection_name="college_documents",
                persist_directory="chroma_db"
            )

        else:

            vectorstore.add_documents(new_chunks)

        print(
            f"Added {len(new_chunks)} chunks to vector database."
        )

        return {
            "success": True,
            "filename": filename,
            "message": "Document uploaded and added to knowledge base.",
            "chunks": len(new_chunks)
        }

    except HTTPException:
        raise

    except Exception as error:

        print(
            f"\nDOCUMENT UPLOAD ERROR: {repr(error)}\n"
        )

        raise HTTPException(
            status_code=500,
            detail="Failed to upload and process document."
        )