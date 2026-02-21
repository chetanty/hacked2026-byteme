import { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { GoogleGenerativeAI } from '@google/generative-ai';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function ChatPage() {
    // PDF & AI States
    const [pdfText, setPdfText] = useState('');
    const [uploadStatus, setUploadStatus] = useState('');
    const [chapters, setChapters] = useState([]);
    const [isGeneratingIndex, setIsGeneratingIndex] = useState(false);
    
    // Chat & Voice States
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hello! Upload your PDF and hit the microphone to talk to me.' }
    ]);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    
    const messagesEndRef = useRef(null);
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
        <div className="flex h-screen w-full bg-gray-100 overflow-hidden">
            
            {/* LEFT SIDEBAR: Dynamic Index */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
                <div className="p-5 border-b border-gray-200 bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        📑 Study Index
                    </h2>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                    {!pdfText && !isGeneratingIndex && (
                        <p className="text-sm text-gray-500 italic text-center mt-10">Upload a PDF to generate the syllabus.</p>
                    )}
                    
                    {isGeneratingIndex && (
                        <div className="flex flex-col items-center justify-center mt-10 space-y-3">
                            <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm text-blue-600 font-medium animate-pulse">AI is mapping chapters...</p>
                        </div>
                    )}

                    {!isGeneratingIndex && chapters.length > 0 && (
                        <ul className="space-y-2">
                            {chapters.map((chap, idx) => (
                                <li 
                                    key={idx} 
                                    className="text-sm text-gray-700 p-3 bg-gray-50 border border-gray-100 rounded-lg hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all cursor-pointer shadow-sm"
                                >
                                    {chap}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* RIGHT MAIN AREA: Upload & Chat */}
            <div className="flex-1 flex flex-col p-6 h-full max-w-5xl mx-auto gap-6 relative">
                
                {/* PDF Upload */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 shrink-0">
                    <h2 className="text-xl font-bold mb-4 text-gray-800">1. Upload Study Material</h2>
                    <input 
                        type="file" 
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                    {uploadStatus && <p className="mt-3 text-sm font-medium text-gray-600">{uploadStatus}</p>}
                </div>

                {/* AI Call Interface */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden relative">
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 pb-36">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                                    msg.role === 'user' 
                                        ? 'bg-blue-600 text-white rounded-br-none' 
                                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                                }`}>
                                    <p className="text-sm leading-relaxed">{msg.text}</p>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Voice Controls Docked at Bottom */}
                    <div className="absolute bottom-0 w-full p-6 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent flex justify-center items-center flex-col gap-2">
                        {isSpeaking && <p className="text-green-600 font-semibold animate-pulse">🔊 AI is speaking...</p>}
                        {isListening && <p className="text-red-500 font-semibold animate-pulse">🎙️ Listening to you...</p>}
                        
                        <button 
                            onClick={handleVoiceClick}
                            className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-lg transition-all transform hover:scale-105 ${
                                isListening ? 'bg-red-500 text-white animate-bounce' : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                            🎙️
                        </button>
                        <p className="text-sm text-gray-500 font-medium">Tap to Speak</p>
                    </div>
                </div>
            </div>
        </div>
    );
}