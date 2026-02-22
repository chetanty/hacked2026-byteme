import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Navbar from "../components/Navbar";
import HistoryBackground from "../components/HistoryBackground";
import { createChat, getChat, getMessages, getUploads, addMessage, addUpload, updateChat, updateChatProgress } from "../db/indexedDb";
import ProgressBar from "../components/ProgressBar";
import "../styles/chat.css";
import "../styles/progress.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const INITIAL_MESSAGE = { role: "assistant", text: "Thanks for using Cognify! Let's start with a couple of revision questions if you are ready?" };

export default function ChatPage() {
    const { sessionId } = useParams();
    
    // PDF & AI States
    const [pdfText, setPdfText] = useState("");
    const [uploadStatus, setUploadStatus] = useState("");
    const [chapters, setChapters] = useState([]);
    const [isGeneratingIndex, setIsGeneratingIndex] = useState(false);
    
    // Chat & Voice States
    const [messages, setMessages] = useState([INITIAL_MESSAGE]);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [chatId, setChatId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [progress, setProgress] = useState({ correctCount: 0, totalEvaluated: 0 });
    
    // NEW: Recommended Answers State
    const [recommendedAnswers, setRecommendedAnswers] = useState(["Yes, I'm ready!", "Give me a minute to upload my PDF."]);
    
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();
    const API_KEY = "INSERT-API-KEY";
    const genAI = new GoogleGenerativeAI(API_KEY);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // NEW: Force the browser to load its high-quality human voices early
    useEffect(() => {
        const loadVoices = () => window.speechSynthesis.getVoices();
        loadVoices(); // Initial trigger
        window.speechSynthesis.onvoiceschanged = loadVoices; // Trigger when they finish downloading
    }, []);

    // Initialize or load chat from DB
    useEffect(() => {
        let mounted = true;

        async function init() {
            try {
            if (sessionId) {
                const id = parseInt(sessionId, 10);
                if (isNaN(id)) {
                    setIsLoading(false);
                    return;
                }
                const chat = await getChat(id);
                if (!chat) {
                    if (mounted) setIsLoading(false);
                    return;
                }
                if (!mounted) return;
                const [savedMessages, savedUploads] = await Promise.all([
                    getMessages(id),
                    getUploads(id),
                ]);
                if (!mounted) return;
                setChatId(id);
                setProgress({
                    correctCount: chat.correctCount ?? 0,
                    totalEvaluated: chat.totalEvaluated ?? 0,
                });
                const msgs = savedMessages.length > 0
                    ? savedMessages.map((m) => ({ role: m.role, text: m.text }))
                    : [INITIAL_MESSAGE];
                setMessages(msgs);
                
                // Clear initial recommended answers if this is an older chat history
                if (savedMessages.length > 0) setRecommendedAnswers([]);

                if (savedUploads.length > 0) {
                    const latest = savedUploads[savedUploads.length - 1];
                    setPdfText(latest.pdfText || "");
                    setChapters(latest.chapters || []);
                    setUploadStatus(`✅ Loaded ${savedUploads.length} file(s). Latest: ${latest.fileName}`);
                }
            } else {
                const id = await createChat();
                if (!mounted) return;
                await addMessage(id, "assistant", INITIAL_MESSAGE.text);
                if (!mounted) return;
                setChatId(id);
                navigate(`/chat/${id}`, { replace: true });
            }
            setIsLoading(false);
            } catch (err) {
                console.error("Chat init error:", err);
                if (mounted) setIsLoading(false);
            }
        }

        init();
        return () => { mounted = false; };
    }, [sessionId, navigate]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file || !chatId) return;

        setUploadStatus('Reading PDF...');
        setChapters([]);
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + ' ';
            }
            
            setPdfText(fullText);
            setUploadStatus(`✅ PDF loaded! Extracted ${fullText.length} characters.`);
            
            const chapterArray = await generateIndexWithAI(fullText);
            setChapters(chapterArray);

            await addUpload(chatId, {
                fileName: file.name,
                pdfText: fullText,
                chapters: chapterArray,
            });
        } catch (error) {
            console.error(error);
            setUploadStatus('❌ Error reading PDF.');
        }
    };

    const generateIndexWithAI = async (text) => {
        setIsGeneratingIndex(true);
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const prompt = `
            Analyze the following study material and extract a logical Table of Contents or list of main chapters/topics.
            Return ONLY a valid JSON array of strings. Do not include markdown formatting like \`\`\`json. Just the array.
            Example: ["Chapter 1: Introduction", "Chapter 2: Core Concepts", "Summary"]
            
            --- TEXT ---
            ${text.substring(0, 50000)}
            `;

            const result = await model.generateContent(prompt);
            let rawText = await result.response.text();
            rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const chapterArray = JSON.parse(rawText);
            return chapterArray;
        } catch (error) {
            console.error("Failed to generate index:", error);
            return ["⚠️ Could not auto-generate index."];
        } finally {
            setIsGeneratingIndex(false);
        }
    };

    // 3. Handle Text-to-Speech (Upgraded to human voices)
    const speakResponse = (text) => {
        window.speechSynthesis.cancel(); 
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Find a high-quality, human-sounding voice instead of the default robot
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => 
            v.name.includes("Google US English") || 
            v.name.includes("Samantha") || 
            (v.lang === 'en-US' && v.name.includes("Natural"))
        ) || voices.find(v => v.lang.startsWith("en"));
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.rate = 1.0; 
        utterance.pitch = 1.0; 
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    };

    // NEW: Centralized message submission logic (handles both voice and text clicks)
    const submitUserMessage = async (transcript) => {
        const userText = `🎤 ${transcript}`;
        setRecommendedAnswers([]); // Clear options once an answer is chosen

        setMessages((prev) => {
            const newMessages = [...prev, { role: 'user', text: userText }];
            if (chatId && prev.length === 1) {
                const title = transcript.replace(/^🎤\s*/, '').slice(0, 50) + (transcript.length > 50 ? '…' : '');
                updateChat(chatId, { title }).catch(console.error);
            }
            return newMessages;
        });

        if (chatId) {
            addMessage(chatId, 'user', userText).catch(console.error);
        }

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            
            // Get latest context right before sending
            const currentContext = messages.length > 0 ? messages : [{role: 'assistant', text: INITIAL_MESSAGE.text}];
            const recentContext = [...currentContext, { role: 'user', text: userText }]
                .slice(-6)
                .map((m) => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${(m.text || '').replace(/^[🎤🔊]\s*/, '')}`)
                .join('\n');

            const prompt = `
You are an interactive AI study tutor on a voice call with a student.
Keep your answers conversational, concise, and easy to listen to.
Do NOT use markdown formatting like asterisks, bold text, or bullet points because this will be read aloud by a text-to-speech engine.

IMPORTANT - Answer evaluation:
When the student is answering a comprehension or quiz question YOU asked (based on the PDF), evaluate their answer.
- If their answer is correct or mostly correct: append exactly [EVAL:correct] at the very end of your response (no other text after it).
- If their answer is wrong or incomplete: append exactly [EVAL:incorrect] at the very end of your response.
- If you are NOT evaluating an answer (e.g. they asked a question, made a comment, or you're asking a new question), do NOT append any [EVAL:...].
When you have PDF material, occasionally ask comprehension questions to quiz the student. When they answer, evaluate and use [EVAL:correct] or [EVAL:incorrect].

IMPORTANT - Recommended Answers:
At the very end of your response (after the EVAL tag if there is one), provide exactly two short recommended responses the student could say next, formatted exactly like this: [REC: First option | Second option]

--- PDF MATERIAL ---
${pdfText || "No PDF uploaded yet. Just chat normally."}
--------------------

--- RECENT CONVERSATION ---
${recentContext}
--------------------

Student says: ${transcript}
`;

            const result = await model.generateContent(prompt);
            let text = await result.response.text();

            // Parse out Recommended Answers
            const recMatch = text.match(/\[REC:(.*?)\]/i);
            if (recMatch) {
                const recs = recMatch[1].split('|').map(r => r.trim());
                setRecommendedAnswers(recs);
                text = text.replace(/\[REC:.*?\]/i, '').trim();
            }

            // Parse out Evaluation marker
            const evalCorrect = text.includes('[EVAL:correct]');
            const evalIncorrect = text.includes('[EVAL:incorrect]');
            if (evalCorrect || evalIncorrect) {
                text = text.replace(/\s*\[EVAL:(?:correct|incorrect)\]\s*$/i, '').trim();
                setProgress((p) => ({
                    correctCount: p.correctCount + (evalCorrect ? 1 : 0),
                    totalEvaluated: p.totalEvaluated + 1,
                }));
                if (chatId) {
                    updateChatProgress(chatId, { correct: evalCorrect }).catch(console.error);
                }
            }

            const assistantText = `🔊 ${text}`;
            
            setMessages((prev) => [...prev, { role: 'assistant', text: assistantText }]);
            if (chatId) addMessage(chatId, 'assistant', assistantText).catch(console.error);
            speakResponse(text);

        } catch (error) {
            console.error(error);
            const errText = 'Error connecting to the AI.';
            setMessages((prev) => [...prev, { role: 'assistant', text: errText }]);
            if (chatId) addMessage(chatId, 'assistant', errText).catch(console.error);
        }
    };

    const handleVoiceClick = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Your browser doesn't support voice recognition. Please use Google Chrome!");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;

        recognition.onstart = () => {
            setIsListening(true);
            window.speechSynthesis.cancel();
        };

        recognition.onend = () => setIsListening(false);

        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            submitUserMessage(transcript);
        };

        recognition.start();
    };

    if (isLoading) {
        return (
            <div className="chat-shell">
                <HistoryBackground />
                <div className="chat-overlay" aria-hidden="true" />
                <Navbar onNavigate={navigate} />
                <div className="chat-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                    <div className="chat-loader">
                        <div className="spinner" />
                        <p>Loading chat…</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-shell">
            <HistoryBackground />
            <div className="chat-overlay" aria-hidden="true" />
            <Navbar onNavigate={navigate} />

            <div className="chat-content">
                <header className="chat-heading">
                    <div>
                        <p className="chat-kicker">New Chat</p>
                        <h1>Practice with Cognify</h1>
                        <p>Upload your PDF, pick chapters, and quiz through voice. Keep answers concise; we’ll cite the pages for you.</p>
                    </div>
                    <div className="chat-status">
                        <span className="dot" aria-hidden="true" />
                        {isListening ? "Listening…" : isSpeaking ? "Speaking…" : "Ready"}
                    </div>
                </header>

                <div className="chat-grid">
                    {/* LEFT SIDEBAR: Dynamic Index */}
                    <aside className="chat-index glass-card">
                        <div className="chat-index-title">
                            <span role="img" aria-label="Index">📑</span>
                            Study Index
                        </div>
                        {pdfText && (
                            <div className="chat-progress-wrap">
                                <span className="chat-progress-title">Chapter mastery</span>
                                <ProgressBar correctCount={progress.correctCount} totalEvaluated={progress.totalEvaluated} />
                            </div>
                        )}
                        <div className="chat-index-body">
                            {!pdfText && !isGeneratingIndex && (
                                <p className="muted">Upload a PDF to generate the syllabus.</p>
                            )}

                            {isGeneratingIndex && (
                                <div className="chat-loader">
                                    <div className="spinner" />
                                    <p>AI is mapping chapters…</p>
                                </div>
                            )}

                            {!isGeneratingIndex && chapters.length > 0 && (
                                <ul className="chat-index-list">
                                    {chapters.map((chap, idx) => (
                                        <li key={idx} className="chat-index-item">
                                            {chap}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </aside>

                    {/* RIGHT MAIN AREA: Upload & Chat */}
                    <section className="chat-panel">
                        <div className="chat-upload glass-card">
                            <div>
                                <p className="label">1. Upload study material</p>
                                <h2>Bring your PDF</h2>
                                <p className="muted">We’ll extract pages and chapters so the tutor can quiz you.</p>
                            </div>
                            <label className="file-input">
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                />
                                <span>Choose PDF</span>
                            </label>
                            {uploadStatus && <p className="upload-status">{uploadStatus}</p>}
                        </div>

                        <div className="chat-window glass-card">
                            <div className="chat-messages">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`chat-row ${msg.role === "user" ? "from-user" : "from-ai"}`}>
                                        <div className={`chat-bubble ${msg.role === "user" ? "user" : "assistant"}`}>
                                            <p>{msg.text}</p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="chat-dock">
                                {/* NEW: Recommended Answer Chips */}
                                {recommendedAnswers.length > 0 && !isSpeaking && !isListening && (
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                                        {recommendedAnswers.map((ans, i) => (
                                            <button 
                                                key={i} 
                                                onClick={() => submitUserMessage(ans)}
                                                style={{ 
                                                    padding: '8px 16px', borderRadius: '20px', border: '1px solid #d1d5db', 
                                                    backgroundColor: '#ffffff', color: '#374151', cursor: 'pointer', fontSize: '14px', 
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.2s' 
                                                }}
                                                onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                                                onMouseOut={(e) => e.target.style.backgroundColor = '#ffffff'}
                                            >
                                                {ans}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {isSpeaking && <p className="status speaking">🔊 AI is speaking…</p>}
                                {isListening && <p className="status listening">🎙️ Listening…</p>}

                                <button
                                    onClick={handleVoiceClick}
                                    className={`chat-mic ${isListening ? "active" : ""}`}
                                    type="button"
                                >
                                    🎙️
                                </button>
                                <p className="muted small">Tap to speak</p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}