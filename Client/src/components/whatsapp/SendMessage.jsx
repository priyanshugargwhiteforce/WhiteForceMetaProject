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
  Globe,
  ChevronDown,
  Database,
  UploadCloud,
  FileSpreadsheet,
  Info
} from 'lucide-react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useAuth } from '../../context/AuthContext';

const SendMessage = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [phoneNumbers, setPhoneNumbers] = useState([""]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // Configuration States
  const [whatsappConfigs, setWhatsappConfigs] = useState([]);
  const [selectedConfigId, setSelectedConfigId] = useState(localStorage.getItem('selectedWhatsAppConfigId') || '');

  // Bulk Upload States
  const [recipientMode, setRecipientMode] = useState("manual"); // "manual" or "bulk"
  const [bulkFile, setBulkFile] = useState(null);
  const [parsedRecipients, setParsedRecipients] = useState([]); // [{ number: '', parameters: [] }]
  const [detectedHeaders, setDetectedHeaders] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [bulkError, setBulkError] = useState(null);
  const [rawRows, setRawRows] = useState([]);
  const [phoneColIdx, setPhoneColIdx] = useState(0);
  const [variableMappings, setVariableMappings] = useState([]);

  const activeTemplate = templates.find(t => t.name === selectedTemplate);

  const getTemplateVariableCount = (template) => {
    if (!template) return 0;
    if (template.variables && Array.isArray(template.variables)) {
      return template.variables.length;
    }
    if (!template.components) return 0;
    const bodyComp = template.components.find(c => c.type === 'BODY');
    if (!bodyComp || !bodyComp.text) return 0;

    // Find unique occurrences of alphanumeric variables (e.g. {{name}}, {{1}})
    const matches = bodyComp.text.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
    return matches ? new Set(matches).size : 0;
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setBulkFile(file);
    setBulkError(null);
    setParsedRecipients([]);
    setPreviewRows([]);
    setDetectedHeaders([]);
    setRawRows([]);

    const reader = new FileReader();
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    reader.onload = (e) => {
      try {
        let rows = [];
        if (isExcel) {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        } else {
          const text = e.target.result;
          rows = text.split('\n')
            .map(line => line.split(',').map(cell => cell.trim()))
            .filter(row => row.length > 0 && row.some(cell => cell !== ""));
        }

        if (rows.length === 0) {
          throw new Error("The file appears to be empty.");
        }

        const headers = rows[0].map(h => String(h).trim());
        setDetectedHeaders(headers);

        let initialPhoneColIdx = 0;
        const phoneKeywords = ['phone', 'mobile', 'number', 'contact', 'to', 'recipient'];
        for (let i = 0; i < headers.length; i++) {
          const hLower = headers[i].toLowerCase();
          if (phoneKeywords.some(k => hLower.includes(k))) {
            initialPhoneColIdx = i;
            break;
          }
        }
        setPhoneColIdx(initialPhoneColIdx);
        setRawRows(rows);
      } catch (err) {
        console.error(err);
        setBulkError(err.message || "Failed to parse the file.");
        setBulkFile(null);
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  // 1. Hook to initialize/adjust variableMappings whenever template, headers, or phone column changes
  useEffect(() => {
    if (detectedHeaders.length > 0) {
      const selTmpl = templates.find(t => t.name === selectedTemplate);
      const reqVars = getTemplateVariableCount(selTmpl);
      
      setVariableMappings(prev => {
        // If we already have the correct number of mappings, keep them
        if (prev.length === reqVars) return prev;
        
        const newMappings = [];
        let mappedCount = 0;
        for (let i = 0; i < detectedHeaders.length; i++) {
          if (i !== phoneColIdx && mappedCount < reqVars) {
            newMappings.push(i);
            mappedCount++;
          }
        }
        while (newMappings.length < reqVars) {
          newMappings.push(-1);
        }
        return newMappings;
      });
    }
  }, [selectedTemplate, detectedHeaders, phoneColIdx, templates]);

  // 2. Hook to map rawRows to parsedRecipients whenever rawRows, phoneColIdx, or variableMappings change
  useEffect(() => {
    if (rawRows.length === 0) {
      setParsedRecipients([]);
      setPreviewRows([]);
      return;
    }

    const dataRows = rawRows.slice(1);
    const mapped = [];

    dataRows.forEach(row => {
      if (phoneColIdx >= row.length) return;
      const phoneValRaw = row[phoneColIdx];
      if (phoneValRaw === undefined || phoneValRaw === null) return;
      
      const phoneVal = String(phoneValRaw).replace(/[^0-9]/g, '');
      if (!phoneVal) return;

      const params = variableMappings.map(colIdx => {
        if (colIdx === -1 || colIdx >= row.length || row[colIdx] === undefined) return "";
        return String(row[colIdx]);
      });

      mapped.push({
        number: phoneVal,
        parameters: params
      });
    });

    setParsedRecipients(mapped);
    setPreviewRows(mapped.slice(0, 5));
  }, [rawRows, phoneColIdx, variableMappings]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchConfigs();
    }
  }, [user]);

  useEffect(() => {
    fetchTemplates();
  }, [selectedConfigId]);

  const fetchConfigs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/whatsapp/configs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.data.success) {
        setWhatsappConfigs(response.data.configs || []);
      }
    } catch (err) {
      console.error("Error fetching whatsapp configs:", err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const headers = {};
      if (selectedConfigId) {
        headers['X-WhatsApp-Config-Id'] = selectedConfigId;
      }

      const response = await axios.get('http://localhost:5000/api/whatsapp/templates', { headers });
      if (response.data.success) {
        // Filter only approved templates
        setTemplates(response.data.templates.filter(t => t.status === 'APPROVED'));
      }
    } catch (err) {
      console.error("Error fetching templates:", err);
      setTemplates([]);
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
    
    setError(null);
    setResults(null);

    const templateObj = templates.find(t => t.name === selectedTemplate);
    const payload = {
      templateName: selectedTemplate,
      languageCode: templateObj?.language || "en_US"
    };

    if (recipientMode === 'manual') {
      const validNumbers = phoneNumbers.filter(n => n.trim() !== "");
      if (validNumbers.length === 0) return setError("Please enter at least one phone number.");
      payload.numbers = validNumbers;
    } else {
      if (parsedRecipients.length === 0) return setError("Please upload and parse a valid CSV/Excel file first.");
      payload.recipients = parsedRecipients;
    }

    setLoading(true);
    try {
      const headers = {};
      if (selectedConfigId) headers['X-WhatsApp-Config-Id'] = selectedConfigId;

      const response = await axios.post('http://localhost:5000/api/whatsapp/send-template', payload, { headers });

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
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Title & Header Row */}
      <div className="flex items-center space-x-4 bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm">
        <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500">
          <Send className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Broadcast Message</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Send Templates to Multiple Users</p>
        </div>
      </div>

      <div className="space-y-6">
        <form onSubmit={handleSendMessage} className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-6 md:p-8 shadow-sm transition-all duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
            
            {/* Left Side: Config */}
            <div className="space-y-6">
              <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-wider border-b border-slate-100 dark:border-white/5 pb-2">
                1. Sender & Template Setup
              </h3>

              {user?.role === 'admin' && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    <Database className="w-3.5 h-3.5 text-indigo-500/70" />
                    Select WhatsApp Sender Account
                  </label>
                  <div className="relative">
                    <select 
                      value={selectedConfigId}
                      onChange={(e) => setSelectedConfigId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 pr-12 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none transition-all cursor-pointer text-slate-800 dark:text-slate-100"
                    >
                      <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Default Server Config</option>
                      {whatsappConfigs.map(cfg => (
                        <option key={cfg.id} value={cfg.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                          {cfg.name} ({cfg.phone_number_id})
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400">
                      <ChevronDown className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  <FileText className="w-3.5 h-3.5 text-indigo-500/70" />
                  Select Approved Template
                </label>
                <div className="relative">
                  <select 
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 pr-12 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none transition-all cursor-pointer text-slate-800 dark:text-slate-100"
                  >
                    <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Choose a template...</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.name} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        {t.name} ({t.language})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400">
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="p-5 bg-indigo-500/5 rounded-3xl border border-indigo-500/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <MessageSquare className="w-16 h-16" />
                </div>
                <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">Campaign Note</h4>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Make sure your recipients have opted-in to receive messages. WhatsApp enforces strict policies for promotional broadcasting.
                </p>
              </div>
            </div>

            {/* Right Side: Recipients */}
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2 gap-2">
                <h3 className="text-xs font-bold text-green-500 uppercase tracking-wider">
                  2. Recipients Setup
                </h3>

                {/* Mode Selector */}
                <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setRecipientMode('manual')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${recipientMode === 'manual' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    Manual Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientMode('bulk')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${recipientMode === 'bulk' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    Excel/CSV Upload
                  </button>
                </div>
              </div>

              {recipientMode === 'manual' ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Recipients List</span>
                    <button 
                      type="button"
                      onClick={handleAddNumber}
                      className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400 uppercase transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Number
                    </button>
                  </div>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                    {phoneNumbers.map((number, idx) => (
                      <div key={idx} className="flex items-center space-x-3 group">
                        <div className="flex-1 relative">
                          <input 
                            type="text" 
                            placeholder="e.g. 919876543210"
                            value={number}
                            onChange={(e) => handleNumberChange(idx, e.target.value)}
                            className="w-full bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all text-slate-800 dark:text-slate-100"
                          />
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleRemoveNumber(idx)}
                          className="p-4 text-slate-400 hover:text-red-500 dark:hover:text-red-400 bg-slate-50 hover:bg-red-500/5 dark:bg-white/5 dark:hover:bg-red-500/10 border border-slate-200 dark:border-white/10 rounded-2xl transition-all duration-300 shadow-sm"
                          title="Remove recipient"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File Input Dropzone */}
                  {!bulkFile ? (
                    <label className="border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-[2rem] p-8 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-indigo-500/[0.01]">
                      <UploadCloud className="w-10 h-10 text-indigo-500 mb-3 animate-pulse" />
                      <span className="text-sm font-bold text-slate-800 dark:text-white">Upload CSV or Excel file</span>
                      <span className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">Supports .csv, .xlsx, .xls</span>
                      <input 
                        type="file" 
                        accept=".csv, .xlsx, .xls" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                      />
                    </label>
                  ) : (
                    <div className="p-5 bg-green-500/5 border border-green-500/10 rounded-3xl space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2.5 bg-green-500/10 rounded-xl text-green-500">
                            <FileSpreadsheet className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-[150px]">
                              {bulkFile.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              {parsedRecipients.length} recipients parsed
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setBulkFile(null);
                            setParsedRecipients([]);
                            setPreviewRows([]);
                            setDetectedHeaders([]);
                            setBulkError(null);
                          }}
                          className="text-xs font-bold text-red-500 hover:text-red-400 uppercase tracking-widest"
                        >
                          Remove
                        </button>
                      </div>

                      {/* Column Mappings Configuration */}
                      {detectedHeaders.length > 0 && (
                        <div className="space-y-4 bg-slate-50 dark:bg-white/[0.02] p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-inner">
                          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-white/5">
                            <Database className="w-4 h-4 text-indigo-500" />
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Column Mapping Setup</h4>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Phone Column Select */}
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                                Recipient Phone Number
                              </label>
                              <div className="relative">
                                <select
                                  value={phoneColIdx}
                                  onChange={(e) => setPhoneColIdx(parseInt(e.target.value))}
                                  className="w-full bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 pr-10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800 dark:text-slate-100 cursor-pointer appearance-none"
                                >
                                  {detectedHeaders.map((header, idx) => (
                                    <option key={idx} value={idx} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                      Column {idx + 1}: {header}
                                    </option>
                                  ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                  <ChevronDown className="w-4 h-4" />
                                </div>
                              </div>
                            </div>

                            {/* Variables Mappings */}
                            {variableMappings.map((mappedColIdx, varIdx) => {
                              const variableName = (activeTemplate?.variables && activeTemplate.variables[varIdx]) || `${varIdx + 1}`;
                              return (
                                <div key={varIdx} className="space-y-2">
                                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">
                                    Template Variable {`{{${variableName}}}`}
                                  </label>
                                  <div className="relative">
                                    <select
                                      value={mappedColIdx}
                                      onChange={(e) => {
                                        const newVal = parseInt(e.target.value);
                                        setVariableMappings(prev => {
                                          const updated = [...prev];
                                          updated[varIdx] = newVal;
                                          return updated;
                                        });
                                      }}
                                      className="w-full bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 pr-10 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-slate-800 dark:text-slate-100 cursor-pointer appearance-none"
                                    >
                                      <option value={-1} className="bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500">-- Select Column (or Empty) --</option>
                                      {detectedHeaders.map((header, idx) => (
                                        <option key={idx} value={idx} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                          Column {idx + 1}: {header}
                                        </option>
                                      ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                      <ChevronDown className="w-4 h-4" />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Dynamic Warning Messages */}
                          {(() => {
                            const unmappedIndex = variableMappings.findIndex(idx => idx === -1);
                            if (unmappedIndex !== -1) {
                              const variableName = (activeTemplate?.variables && activeTemplate.variables[unmappedIndex]) || `${unmappedIndex + 1}`;
                              return (
                                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl text-[10px] leading-relaxed">
                                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                  <span>
                                    <strong>Warning:</strong> Template Variable <strong>{`{{${variableName}}}`}</strong> is not mapped to any column. It will be sent as an empty string.
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })()}

                          {parsedRecipients.length === 0 && (
                            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-[10px] leading-relaxed">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                              <span>
                                <strong>Error:</strong> No valid phone numbers found using the currently selected "Recipient Phone Number" column (Column {phoneColIdx + 1}). Please select the correct column.
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {bulkError && (
                    <div className="flex items-center space-x-2 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs font-semibold text-red-400">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{bulkError}</span>
                    </div>
                  )}

                  {/* Preview Table of First 3 records */}
                  {previewRows.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Preview (First 3 Rows)</h4>
                      <div className="overflow-x-auto border border-slate-100 dark:border-white/5 rounded-2xl">
                        <table className="w-full text-left text-[10px] border-collapse bg-white/5">
                          <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                              <th className="p-3 font-bold text-slate-400 uppercase">Phone Number</th>
                              <th className="p-3 font-bold text-slate-400 uppercase">Variables</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {previewRows.slice(0, 3).map((row, idx) => (
                              <tr key={idx} className="hover:bg-white/5 transition-colors">
                                <td className="p-3 font-mono text-slate-300 font-bold">{row.number}</td>
                                <td className="p-3 font-mono text-slate-400">
                                  {row.parameters.length > 0 ? row.parameters.join(' | ') : 'None'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
             {error && (
               <div className="flex items-center text-red-500 text-xs font-bold animate-pulse">
                 <AlertCircle className="w-4 h-4 mr-2" />
                 {error}
               </div>
             )}
             {!error && <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{recipientMode === 'manual' ? phoneNumbers.filter(n => n.trim()).length : parsedRecipients.length} Recipients Prepared</div>}
             
             <button 
               disabled={loading}
               type="submit"
               className={`px-10 py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-600/20 flex items-center transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:grayscale cursor-pointer`}
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
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${res.success ? (res.status === 'queued' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-emerald-500/10 text-emerald-500') : 'bg-red-500/10 text-red-500'}`}>
                         {res.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </div>
                      <div>
                         <p className="text-xs font-mono text-white">{res.number}</p>
                         <p className={`text-[10px] font-bold uppercase ${res.success ? (res.status === 'queued' ? 'text-indigo-400' : 'text-emerald-500') : 'text-red-500'}`}>
                            {res.success ? (res.status === 'queued' ? 'Enqueued' : 'Delivered') : 'Failed'}
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
