/* =========================================================
   STUDENT AI HUB
   Frontend → FastAPI → AI Agent + RAG
========================================================= */


/* =========================================================
   API CONFIG
========================================================= */

const API_URL = "https://ai-student-support-3qw8.onrender.com/api/agent-chat";

/* =========================================================
   ELEMENTS
========================================================= */

const input = document.getElementById("questionInput");
const sendButton = document.getElementById("sendButton");
const startButton = document.getElementById("startButton");
if (startButton && input) {
    startButton.addEventListener("click", () => {
        showChatMode();

        input.value = "";
        input.placeholder = "Ask me anything about your campus...";
        input.focus();
    });
}

const chatContainer = document.getElementById("chatContainer");
const chatMessages = document.getElementById("chatMessages");

const welcome = document.getElementById("welcome");
const content = document.querySelector(".content");
const newChatButton = document.getElementById("newChatButton");

const voiceButton = document.getElementById("voiceButton");
const attachButton = document.getElementById("attachButton");
const documentInput = document.getElementById("documentInput");
const knowledgeBaseButton = document.getElementById("knowledgeBaseButton");
const myMemoryButton = document.getElementById("myMemoryButton");
const settingsButton = document.getElementById("settingsButton");
const settingsPanel = document.getElementById("settingsPanel");
const closeSettings = document.getElementById("closeSettings");
const clearChatButton = document.getElementById("clearChatButton");
const knowledgePanel = document.getElementById("knowledgePanel");
const closeKnowledge = document.getElementById("closeKnowledge");
const knowledgeSearch = document.getElementById("knowledgeSearch");
const memoryPanel = document.getElementById("memoryPanel");
const closeMemory = document.getElementById("closeMemory");
const memorySearch = document.getElementById("memorySearch");

const quickQuestions =
    document.querySelectorAll(".quick-question");

const recentItems =
    document.querySelectorAll(".recent-item");

const toolCards =
    document.querySelectorAll(".tool-card");
toolCards.forEach(card => {
    card.addEventListener("click", () => {
        console.log("TOOL CARD CLICKED");

        const question = card.dataset.question;

        if (!question || !input) return;

        input.value = question;
        input.focus();

        sendMessage();
    });
});

const quickArea =
    document.querySelector(".quick-area");

const toolsHeading =
    document.querySelector(".tools-heading");


/* =========================================================
   CHAT STATE
========================================================= */

let isSending = false;


/* =========================================================
   QUICK QUESTIONS
========================================================= */

quickQuestions.forEach(button => {

    button.addEventListener("click", () => {

        const question =
            button.textContent.trim();

        if (!question || !input) {
            return;
        }

        input.value = question;

        input.focus();
    });

});


/* =========================================================
   ENTER KEY
========================================================= */

if (input) {

    input.addEventListener("keydown", event => {

        if (event.key === "Enter" && !event.shiftKey) {

            event.preventDefault();

            sendMessage();
        }

    });

}


/* =========================================================
   SEND BUTTON
========================================================= */

if (sendButton) {

    sendButton.addEventListener(
        "click",
        sendMessage
    );

}


/* =========================================================
   SHOW CHAT MODE
========================================================= */

function showChatMode() {

    /* Hide welcome section */

    if (welcome) {
    welcome.style.display =
        "none";
}

if (content) {
    content.classList.add("chat-mode");
}


    /* Hide tool cards */

    if (toolCards) {
    toolCards.forEach(card => {
        card.style.display = "none";
    });
}


    /* Hide tools heading */

    if (toolsHeading) {
        toolsHeading.style.display = "none";
    }


    /* Hide quick questions */

    if (quickArea) {
        quickArea.style.display = "none";
    }


    /* Show chat */

    if (chatMessages) {

        chatMessages.classList.add("active");

        chatMessages.style.display = "block";
    }

}


/* =========================================================
   SHOW HOME MODE
========================================================= */

function showHomeMode() {

    /* Show welcome */

    if (welcome) {
        welcome.style.display = "block";
    }

    if (content) {
        content.classList.remove("chat-mode");
    }

    /* Show tool cards */

    if (toolCards) {
    toolCards.forEach(card => {
        card.style.display = "block";
    });
}

    /* Show tools heading */

    if (toolsHeading) {
        toolsHeading.style.display = "flex";
    }

    /* Show quick questions */

    if (quickArea) {
        quickArea.style.display = "flex";
    }

    /* Hide chat */

    if (chatMessages) {
        chatMessages.classList.remove("active");
        chatMessages.style.display = "none";
        chatMessages.innerHTML = "";
    }
}


/* =========================================================
   SEND MESSAGE
========================================================= */

async function sendMessage() {

    if (!input || isSending) {
        return;
    }


    const question =
        input.value.trim();


    /* Empty message */

    if (!question) {

        input.focus();

        return;
    }


    /* =====================================================
       CHANGE UI TO CHAT MODE
    ===================================================== */

    showChatMode();


    /* =====================================================
       ADD USER MESSAGE
    ===================================================== */

    addUserMessage(question);


    /* =====================================================
       CLEAR INPUT
    ===================================================== */

    input.value = "";


    /* =====================================================
       LOCK SEND
    ===================================================== */

    isSending = true;


    if (sendButton) {

        sendButton.disabled = true;

        sendButton.style.opacity = "0.6";
    }


    /* =====================================================
       SHOW TYPING
    ===================================================== */

    const typingMessage =
        showTyping();


    try {

        console.log(
            "Sending question:",
            question
        );


        /* =================================================
           FASTAPI REQUEST
        ================================================= */

        const url =
            `${API_URL}?question=${encodeURIComponent(question)}`;


        const response =
            await fetch(url, {

                method: "POST",

                headers: {
                    "Accept": "application/json"
                }

            });


        /* =================================================
           READ RESPONSE
        ================================================= */

        let data;

        try {

            data = await response.json();

        }
        catch {

            data = {};
        }


        console.log(
            "Backend response:",
            data
        );


        /* =================================================
           REMOVE TYPING
        ================================================= */

        if (typingMessage) {

            typingMessage.remove();
        }


        /* =================================================
           HTTP ERROR
        ================================================= */

        if (!response.ok) {

            throw new Error(

                data.detail ||
                data.error ||
                "Backend request failed."

            );

        }


        /* =================================================
           GET AI ANSWER
        ================================================= */

        let answer = "";


        if (
            data &&
            typeof data.answer === "string"
        ) {

            answer =
                data.answer.trim();

        }


        if (!answer) {

            answer =
                "I couldn't generate an answer. Please try again.";

        }


        /* =================================================
           DISPLAY AI ANSWER
        ================================================= */

        addAIMessage(answer);

    }


    catch (error) {

        console.error(
            "Student AI Error:",
            error
        );


        /* Remove typing */

        if (typingMessage) {
            typingMessage.remove();
        }


        /* =================================================
           ERROR MESSAGE
        ================================================= */

        let errorMessage =
            "⚠️ Unable to connect to Student AI.";


        if (
            error &&
            error.message
        ) {

            if (
                error.message.includes("429") ||
                error.message.toLowerCase().includes("rate limit")
            ) {

                errorMessage =
                    "⏳ AI request limit reached. Please wait a few minutes and try again.";

            }
            else {

                errorMessage =
                    "⚠️ " + error.message;

            }

        }


        addAIMessage(errorMessage);

    }


    finally {

        isSending = false;


        if (sendButton) {

            sendButton.disabled = false;

            sendButton.style.opacity = "1";
        }


        if (input) {

            input.focus();
        }

    }

}


/* =========================================================
   USER MESSAGE
========================================================= */

function addUserMessage(text) {

    if (!chatMessages) {
        return;
    }


    const row =
        document.createElement("div");

    row.className =
        "message-row user";


    const bubble =
        document.createElement("div");

    bubble.className =
        "message-bubble user-message";


    bubble.textContent =
        text;


    row.appendChild(
        bubble
    );


    chatMessages.appendChild(
        row
    );


    scrollChat();

}


/* =========================================================
   AI MESSAGE
========================================================= */

function addAIMessage(text) {

    if (!chatMessages) {
        return;
    }


    const row =
        document.createElement("div");

    row.className =
        "message-row assistant";


    const bubble =
        document.createElement("div");

    bubble.className =
        "message-bubble ai-message";


    /* =====================================================
       AI LABEL
    ===================================================== */

    const label =
        document.createElement("span");

    label.className =
        "ai-label";

    label.textContent =
        "✦ Student AI";


    /* =====================================================
       AI CONTENT
    ===================================================== */

    const content =
        document.createElement("div");

    content.className =
        "ai-content";


    content.innerHTML =
        formatResponse(text);


    bubble.appendChild(
        label
    );

    bubble.appendChild(
        content
    );


    row.appendChild(
        bubble
    );


    chatMessages.appendChild(
        row
    );


    scrollChat();

}


/* =========================================================
   FORMAT AI RESPONSE
========================================================= */

function formatResponse(text) {

    if (!text) {

        return "No response received.";

    }


    /* =====================================================
       ESCAPE HTML
    ===================================================== */

    let safeText =
        escapeHTML(
            String(text)
        );


    /* =====================================================
       BOLD
       **text**
    ===================================================== */

    safeText =
        safeText.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );


    /* =====================================================
       INLINE CODE
       `code`
    ===================================================== */

    safeText =
        safeText.replace(
            /`([^`]+)`/g,
            "<code>$1</code>"
        );


    /* =====================================================
       BULLET POINTS
    ===================================================== */

    safeText =
        safeText.replace(
            /^\s*[-*]\s+(.+)$/gm,
            "• $1"
        );


    /* =====================================================
       NEW LINES
    ===================================================== */

    safeText =
        safeText.replace(
            /\r?\n/g,
            "<br>"
        );


    return safeText;

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text;

    return div.innerHTML;

}


/* =========================================================
   TYPING INDICATOR
========================================================= */

function showTyping() {

    if (!chatMessages) {
        return null;
    }


    const row =
        document.createElement("div");

    row.className =
        "message-row assistant";


    const bubble =
        document.createElement("div");

    bubble.className =
        "message-bubble ai-message";


    bubble.innerHTML = `

        <span class="ai-label">
            ✦ Student AI
        </span>

        <div class="typing">

            <span></span>
            <span></span>
            <span></span>

        </div>

    `;


    row.appendChild(
        bubble
    );


    chatMessages.appendChild(
        row
    );


    scrollChat();


    return row;

}


/* =========================================================
   CHAT SCROLL
========================================================= */

function scrollChat() {

    if (!chatMessages) {
        return;
    }


    requestAnimationFrame(() => {

        chatMessages.scrollTop =
            chatMessages.scrollHeight;

    });

}


/* =========================================================
   NEW CHAT
========================================================= */

if (newChatButton) {

    newChatButton.addEventListener(
        "click",
        () => {

            showHomeMode();


            if (input) {

                input.value = "";

                input.focus();

            }

        }
    );

}


/* =========================================================
   RECENT CHAT BUTTONS
========================================================= */

recentItems.forEach(item => {

    item.addEventListener(
        "click",
        () => {

            const text =
                item.textContent.trim();


            if (!input) {
                return;
            }


            if (
                text.includes("CSE Syllabus")
            ) {

                input.value =
                    "What is the CSE syllabus?";

            }

            else if (
                text.includes("Attendance")
            ) {

                input.value =
                    "Calculate my attendance percentage.";

            }

            else if (
                text.includes("College Documents")
            ) {

                input.value =
                    "What college documents are available?";

            }

            else {

                input.value =
                    text;

            }


            input.focus();
            sendMessage();

        }
    );

});


/* =========================================================
   VOICE INPUT
========================================================= */

if (voiceButton) {

    voiceButton.addEventListener(
        "click",
        startVoiceInput
    );

}


function startVoiceInput() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        alert(
            "Voice input is not supported in this browser."
        );

        return;
    }


    const recognition =
        new SpeechRecognition();


    recognition.lang =
        "en-IN";

    recognition.interimResults =
        false;

    recognition.continuous =
        false;


    voiceButton.classList.add(
        "listening"
    );


    try {

        recognition.start();

    }

    catch (error) {

        console.error(
            "Voice start error:",
            error
        );

    }


    recognition.onresult =
        event => {

            const transcript =
                event.results[0][0]
                    .transcript;


            if (input) {

                input.value =
                    transcript;

                input.focus();

            }

        };


    recognition.onerror =
        event => {

            console.error(
                "Voice error:",
                event.error
            );

        };


    recognition.onend =
        () => {

            voiceButton.classList.remove(
                "listening"
            );

        };

}


/* =========================================================
   ATTACH BUTTON
========================================================= */

/* ATTACH BUTTON */

if (attachButton && documentInput) {

    attachButton.addEventListener("click", () => {
        documentInput.click();
    });

}
/* DOCUMENT UPLOAD */

if (documentInput) {

    documentInput.addEventListener("change", async () => {
        console.log("FILE INPUT CHANGED");

        const file = documentInput.files[0];

        if (!file) return;

        const formData = new FormData();

        formData.append("file", file);

        try {

            console.log("Uploading:", file.name);

            const response = await fetch(
                "https://ai-student-support-3qw8.onrender.com/api/upload-document",
                {
                    method: "POST",
                    body: formData
                }
            );

            const data = await response.json();

            console.log("Upload response:", data);

            if (!response.ok) {
                throw new Error(
                    data.detail || "Upload failed."
                );
            }

            alert(
                `✅ ${file.name} uploaded successfully!`
            );

        } catch (error) {

            console.error(
                "Document upload error:",
                error
            );

            alert(
                `❌ Upload failed: ${error.message}`
            );

        }

        documentInput.value = "";

    });

}
/* KNOWLEDGE BASE */

if (knowledgeBaseButton && knowledgePanel) {
    knowledgeBaseButton.addEventListener("click", () => {
        knowledgePanel.classList.add("active");
    });
}

if (closeKnowledge && knowledgePanel) {
    closeKnowledge.addEventListener("click", () => {
        knowledgePanel.classList.remove("active");
    });
}

/* MY MEMORY */

if (myMemoryButton && memoryPanel) {
    myMemoryButton.addEventListener("click", () => {
        memoryPanel.classList.add("active");
    });
}

if (closeMemory && memoryPanel) {
    closeMemory.addEventListener("click", () => {
        memoryPanel.classList.remove("active");
    });
}
/* MEMORY SEARCH */

if (memorySearch) {
    memorySearch.addEventListener("input", () => {

        const searchText =
            memorySearch.value.toLowerCase().trim();

        const memoryItems =
            document.querySelectorAll(".memory-item");

        memoryItems.forEach(item => {

            const itemText =
                item.textContent.toLowerCase();

            if (itemText.includes(searchText)) {
                item.style.display = "flex";
            } else {
                item.style.display = "none";
            }

        });

    });
}
/* MEMORY ITEM CLICK */

const memoryItems =
    document.querySelectorAll(".memory-item");

memoryItems.forEach(item => {

    item.addEventListener("click", () => {

        const title =
            item.querySelector("strong")?.textContent.trim();

        if (!title || !input) return;

        if (title.includes("Saved Information")) {
            input.value = "What information do you remember about me?";
        }
        else if (title.includes("Conversation Memory")) {
            input.value = "What do you remember from our conversations?";
        }
        else if (title.includes("Preferences")) {
            input.value = "What are my saved preferences?";
        }

        if (memoryPanel) {
            memoryPanel.classList.remove("active");
        }

        input.focus();
        sendMessage();

    });

});

/* SETTINGS */

if (settingsButton && settingsPanel) {
    settingsButton.addEventListener("click", () => {
        settingsPanel.classList.add("active");
    });
}

if (closeSettings && settingsPanel) {
    closeSettings.addEventListener("click", () => {
        settingsPanel.classList.remove("active");
    });
}
if (clearChatButton) {
    clearChatButton.addEventListener("click", () => {

        if (chatMessages) {
            chatMessages.innerHTML = "";
        }

        if (settingsPanel) {
            settingsPanel.classList.remove("active");
        }

        showHomeMode();

        if (input) {
            input.value = "";
            input.focus();
        }
    });
}
/* KNOWLEDGE BASE SEARCH */

if (knowledgeSearch) {
    knowledgeSearch.addEventListener("input", () => {

        const searchText = knowledgeSearch.value
            .toLowerCase()
            .trim();

        const knowledgeItems =
            document.querySelectorAll(".knowledge-item");

        knowledgeItems.forEach(item => {

            const itemText =
                item.textContent.toLowerCase();

            if (itemText.includes(searchText)) {
                item.style.display = "flex";
            } else {
                item.style.display = "none";
            }

        });
    });
}
/* KNOWLEDGE RESOURCE CLICK */

const knowledgeItems =
    document.querySelectorAll(".knowledge-item");

knowledgeItems.forEach(item => {

    item.addEventListener("click", () => {

        const title =
            item.querySelector("strong")?.textContent.trim();

        if (!title || !input) return;

        if (title.includes("CSE Syllabus")) {
            input.value = "What is the CSE syllabus?";
        }
        else if (title.includes("College Documents")) {
            input.value = "What college documents are available?";
        }
        else if (title.includes("Semester Results")) {
            input.value = "What information is available about semester results?";
        }

        if (knowledgePanel) {
            knowledgePanel.classList.remove("active");
        }

        input.focus();
        sendMessage();
    });

});


/* =========================================================
   INITIAL STATE
========================================================= */

showHomeMode();


if (input) {

    input.focus();

}


console.log(
    "✅ Student AI frontend loaded successfully."
);