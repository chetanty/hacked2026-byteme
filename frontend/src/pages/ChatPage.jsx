import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Navbar from "../components/Navbar";
import HistoryBackground from "../components/HistoryBackground";
import "../styles/chat.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function ChatPage() {
    // PDF & AI States
    const [pdfText, setPdfText] = useState("");
    const [uploadStatus, setUploadStatus] = useState("");
    const [chapters, setChapters] = useState([]);
    const [isGeneratingIndex, setIsGeneratingIndex] = useState(false);
    
    // Chat & Voice States
    const [messages, setMessages] = useState([
        { role: "assistant", text: "Hello! Upload your PDF and hit the microphone to talk to me." }
    ]);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();
    const API_KEY = "AIzaSyAzvwBBgCOSehmEu02hWChchvmyVm5dti4";
    const genAI = new GoogleGenerativeAI(API_KEY);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 1. Handle PDF Upload & Auto-Generate Index
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadStatus('Reading PDF...');
        setChapters([]); // Reset chapters on new upload
        
        try {
            // Read PDF
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
            
            // MAGIC HACKATHON FEATURE: Auto-generate the index
            generateIndexWithAI(fullText);

        } catch (error) {
            console.error(error);
            setUploadStatus('❌ Error reading PDF.');
        }
    };

    // 2. Hidden background AI call to build the Table of Contents
    const generateIndexWithAI = async (text) => {
        setIsGeneratingIndex(true);
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const prompt = `
            Analyze the following study material and extract a logical Table of Contents or list of main chapters/topics.
            Return ONLY a valid JSON array of strings. Do not include markdown formatting like \`\`\`json. Just the array.
            Example: ["Chapter 1: Introduction", "Chapter 2: Core Concepts", "Summary"]
            
            --- TEXT ---
            ${text.substring(0, 50000)} // Limiting to 50k chars so it's lightning fast
            `;

            const result = await model.generateContent(prompt);
            let rawText = await result.response.text();
            
            // Clean up any weird formatting the AI might add before parsing
            rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const chapterArray = JSON.parse(rawText);
            
            setChapters(chapterArray);
        } catch (error) {
            console.error("Failed to generate index:", error);
            setChapters(["⚠️ Could not auto-generate index."]);
        } finally {
            setIsGeneratingIndex(false);
        }
    };

    // 3. Handle Text-to-Speech (AI talking back)
    const speakResponse = (text) => {
        window.speechSynthesis.cancel(); 
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0; 
        utterance.pitch = 1.0; 
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
    };

    // 4. Handle Voice Recognition (You talking)
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
            setMessages((prev) => [...prev, { role: 'user', text: `🎤 ${transcript}` }]);

            try {
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                const prompt = `
                You are an interactive AI study tutor on a voice call with a student. 
                Keep your answers conversational, concise, and easy to listen to. 
                Do NOT use markdown formatting like asterisks, bold text, or bullet points because this will be read aloud by a text-to-speech engine.
                
                --- PDF MATERIAL ---
                ${pdfText || "No PDF uploaded yet. Just chat normally."}
                --------------------

                Student says: ${transcript}
                `;

                const result = await model.generateContent(prompt);
                const text = await result.response.text();
                
                setMessages((prev) => [...prev, { role: 'assistant', text: `🔊 ${text}` }]);
                speakResponse(text);

            } catch (error) {
                console.error(error);
                setMessages((prev) => [...prev, { role: 'assistant', text: 'Error connecting to the AI.' }]);
            }
        };

        recognition.start();
    };

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
