import { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { GoogleGenerativeAI } from '@google/generative-ai';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function ChatPage() {
    const [pdfText, setPdfText] = useState('');
    const [uploadStatus, setUploadStatus] = useState('');
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hello! Upload your PDF and hit the microphone to talk to me.' }
    ]);
    
    // Voice States
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    
    const messagesEndRef = useRef(null);
    const API_KEY = "AIzaSyAzvwBBgCOSehmEu02hWChchvmyVm5dti4";

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 1. Handle PDF Upload
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadStatus('Reading PDF...');
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
        } catch (error) {
            console.error(error);
            setUploadStatus('❌ Error reading PDF.');
        }
    };

    // 2. Handle Text-to-Speech (AI talking back)
    const speakResponse = (text) => {
        // Stop any current speech if user interrupts
        window.speechSynthesis.cancel(); 
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0; // Normal speed
        utterance.pitch = 1.0; 
        
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        
        window.speechSynthesis.speak(utterance);
    };

    // 3. Handle Voice Recognition (You talking)
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
            window.speechSynthesis.cancel(); // Stop AI from talking while you speak
        };

        recognition.onend = () => setIsListening(false);

        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            
            setMessages((prev) => [...prev, { role: 'user', text: `🎤 ${transcript}` }]);

            try {
                const genAI = new GoogleGenerativeAI(API_KEY);
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

                // We tell the AI to act like it's on a phone call (no weird formatting)
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
                
                // Read the answer out loud!
                speakResponse(text);

            } catch (error) {
                console.error(error);
                setMessages((prev) => [...prev, { role: 'assistant', text: 'Error connecting to the AI.' }]);
            }
        };

        recognition.start();
    };

    return (
        <div className="max-w-4xl mx-auto p-6 flex flex-col gap-6 h-[calc(100vh-80px)]">
            
            {/* PDF Upload */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
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
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 pb-32">
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
    );
}