import { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// The Vite-specific way to load the worker locally so it never fails
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { GoogleGenerativeAI } from '@google/generative-ai';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function ChatPage() {
    // State
    const [pdfText, setPdfText] = useState('');
    const [uploadStatus, setUploadStatus] = useState('');
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hello! Upload your PDF study materials and ask me anything.' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    // Hardcoded API Key (Hackathon mode)
    const API_KEY = "AIzaSyAzvwBBgCOSehmEu02hWChchvmyVm5dti4";

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Handle PDF Selection and Text Extraction (All in Browser)
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadStatus('Reading PDF...');
        
        try {
            // Convert file to an ArrayBuffer that PDF.js can read
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            let fullText = '';
            
            // Loop through all pages and extract text
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

    // Handle Sending Messages to Gemini
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = { role: 'user', text: input };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            if (!pdfText) {
                setMessages((prev) => [...prev, { role: 'assistant', text: "Please upload a study PDF first so I have something to read!" }]);
                setIsTyping(false);
                return;
            }

            // Call Gemini Directly
            const genAI = new GoogleGenerativeAI(API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const prompt = `
            You are a highly intelligent and helpful AI study assistant. 
            Use the following extracted text from a student's PDF study material to answer their question. 
            If the answer is not contained within the PDF text, you can use your general knowledge, but clearly mention that the information wasn't in the uploaded document.

            --- PDF MATERIAL ---
            ${pdfText}
            --------------------

            Student's Question: ${userMsg.text}
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            setMessages((prev) => [...prev, { role: 'assistant', text }]);
        } catch (error) {
            console.error(error);
            setMessages((prev) => [...prev, { role: 'assistant', text: 'Error connecting to the AI.' }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 flex flex-col gap-6 h-[calc(100vh-80px)]">
            
            {/* PDF Upload Area */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold mb-4 text-gray-800">1. Upload Study Material (PDF)</h2>
                <div className="flex items-center gap-4">
                    <input 
                        type="file" 
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                </div>
                {uploadStatus && <p className="mt-3 text-sm font-medium text-gray-600">{uploadStatus}</p>}
            </div>

            {/* AI Chat Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden">
                <div className="p-4 border-b bg-gray-50 border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">2. Chat with AI Assistant</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                                msg.role === 'user' 
                                    ? 'bg-blue-600 text-white rounded-br-none' 
                                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                            }`}>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-5 py-3 shadow-sm">
                                <p className="text-sm text-gray-500 italic">AI is thinking...</p>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-white border-t border-gray-200">
                    <form onSubmit={handleSendMessage} className="flex gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a question about your PDF..."
                            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button 
                            type="submit" 
                            disabled={isTyping}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                        >
                            Send
                        </button>
                    </form>
                </div>
            </div>
            
        </div>
    );
}