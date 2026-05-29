import { useState, useEffect } from 'react';
import { 
  Send, 
  Users, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Trash2,
  Activity,
  MessageSquare,
  Globe
} from 'lucide-react';
import axios from 'axios';

const SendMessage = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [phoneNumbers, setPhoneNumbers] = useState([""]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/whatsapp/templates');
      if (response.data.success) {
        // Filter only approved templates
        setTemplates(response.data.templates.filter(t => t.status === 'APPROVED'));
      }
    } catch (err) {
      console.error("Error fetching templates:", err);
    }
  };

  const handleAddNumber = () => setPhoneNumbers([...phoneNumbers, ""]);
  
  const handleRemoveNumber = (index) => {
    const newNumbers = phoneNumbers.filter((_, i) => i !== index);
    setPhoneNumbers(newNumbers.length ? newNumbers : [""]);
  };

  const handleNumberChange = (index, value) => {
    const newNumbers = [...phoneNumbers];
    newNumbers[index] = value;
    setPhoneNumbers(newNumbers);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedTemplate) return setError("Please select a template first.");
    
    const validNumbers = phoneNumbers.filter(n => n.trim() !== "");
    if (validNumbers.length === 0) return setError("Please enter at least one phone number.");

    setLoading(true);
    setResults(null);
    setError(null);

    try {
      const templateObj = templates.find(t => t.name === selectedTemplate);
      const response = await axios.post('http://localhost:5000/api/whatsapp/send-template', {
        numbers: validNumbers,
        templateName: selectedTemplate,
        languageCode: templateObj?.language || "en_US"
      });

      if (response.data.success) {
        setResults(response.data.results);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Title & Controls Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Broadcast Message</h2>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Send Templates to Multiple Users</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        
        <form onSubmit={handleSendMessage} className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-10 shadow-sm transition-all duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            
            {/* Left Side: Config */}
            <div className="space-y-8">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 block flex items-center">
                  <FileText className="w-3.5 h-3.5 mr-2 text-indigo-500" />
                  Select Approved Template
                </label>
                <select 
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none transition-all cursor-pointer text-slate-800 dark:text-slate-100"
                >
                  <option value="">Choose a template...</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.name}>{t.name} ({t.language})</option>
                  ))}
                </select>
              </div>

              <div className="p-6 bg-indigo-500/5 rounded-3xl border border-indigo-500/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <MessageSquare className="w-16 h-16" />
                </div>
                <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">Campaign Note</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Make sure your recipients have opted-in to receive messages. WhatsApp enforces strict policies for promotional broadcasting.
                </p>
              </div>
            </div>

            {/* Right Side: Recipients */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block flex items-center">
                  <Users className="w-3.5 h-3.5 mr-2 text-green-500" />
                  Recipients (International Format)
                </label>
                <button 
                  type="button"
                  onClick={handleAddNumber}
                  className="text-[10px] font-bold text-indigo-500 uppercase hover:text-indigo-400 transition-colors flex items-center"
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Number
                </button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                {phoneNumbers.map((number, idx) => (
                  <div key={idx} className="flex items-center space-x-2 group">
                    <div className="flex-1 relative">
                      <input 
                        type="text" 
                        placeholder="e.g. 919876543210"
                        value={number}
                        onChange={(e) => handleNumberChange(idx, e.target.value)}
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-5 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleRemoveNumber(idx)}
                      className="p-3 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
             {error && (
               <div className="flex items-center text-red-500 text-xs font-bold animate-pulse">
                 <AlertCircle className="w-4 h-4 mr-2" />
                 {error}
               </div>
             )}
             {!error && <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{phoneNumbers.filter(n => n.trim()).length} Recipients Prepared</div>}
             
             <button 
               disabled={loading}
               className={`px-10 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-600/20 flex items-center transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:grayscale`}
             >
               {loading ? (
                 <>Processing... <Activity className="w-4 h-4 ml-2 animate-spin" /></>
               ) : (
                 <>Blast Broadcast <Send className="w-4 h-4 ml-2" /></>
               )}
             </button>
          </div>
        </form>

        {/* Results Section */}
        {results && (
          <div className="bg-slate-900 rounded-[2.5rem] p-10 overflow-hidden relative group shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="absolute top-0 right-0 p-10 opacity-5">
               <Activity className="w-32 h-32 text-white" />
            </div>
            <h3 className="text-white text-lg font-bold mb-8 flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-500" />
              Broadcast Status Results
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {results.map((res, i) => (
                <div key={i} className="bg-black/40 border border-white/5 p-5 rounded-2xl flex items-center justify-between">
                   <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${res.success ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                         {res.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </div>
                      <div>
                         <p className="text-xs font-mono text-white">{res.number}</p>
                         <p className={`text-[10px] font-bold uppercase ${res.success ? 'text-emerald-500' : 'text-red-500'}`}>
                            {res.success ? 'Delivered' : 'Failed'}
                         </p>
                      </div>
                   </div>
                   {!res.success && (
                     <div className="group relative">
                        <AlertCircle className="w-4 h-4 text-slate-500 cursor-help" />
                        <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-red-600 text-[10px] text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                           {res.error}
                        </div>
                     </div>
                   )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SendMessage;
