import { AuditRecord } from '../types';

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// !!! WARNING: DO NOT COPY THIS ENTIRE FILE INTO GOOGLE APPS SCRIPT !!!
// !!! This file is TypeScript for the Frontend App. 
// !!! The Google Apps Script only understands the code INSIDE the 'GOOGLE_SCRIPT_CODE' string below.
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

// =============================================================================================
// OPTIONAL: HARDCODED CONFIGURATION
// =============================================================================================
// If you prefer to put the URL directly in the code instead of using the Settings menu:
// 1. Deploy your Google Script.
// 2. Paste the Web App URL inside the quotes below.
const HARDCODED_SCRIPT_URL = "https://script.google.com/a/macros/genesishcc.com/s/AKfycbySJDL3JbEBfynAtx-FITgeysPbmhmiNUhPnBau_j9wZ6nwYxFPvPJZSsPXvdWfTwo53A/exec"; 

const STORAGE_KEY = 'f880_audits_data_v1';
const URL_KEY = 'f880_google_script_url';

// This is the pure JavaScript code for the Google Apps Script.
// We export it as a string so the UI can display it for the user to copy easily.
export const GOOGLE_SCRIPT_CODE = `
function doGet(e) {
  const sheet = getSheet();
  const range = sheet.getDataRange();
  
  // If sheet is empty or just header
  if (range.getLastRow() <= 1) {
     return ContentService.createTextOutput("[]").setMimeType(ContentService.MimeType.JSON);
  }

  const data = range.getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  // We expect a column named 'JSON_DATA' to contain the full record
  const jsonColIndex = headers.indexOf('JSON_DATA');
  
  let records = [];
  if (jsonColIndex > -1) {
    records = rows.map(row => {
      try {
        return JSON.parse(row[jsonColIndex]);
      } catch (err) {
        return null;
      }
    }).filter(r => r !== null);
  }
  
  return ContentService.createTextOutput(JSON.stringify(records))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const sheet = getSheet();
  
  // Ensure Headers exist if new sheet
  if (sheet.getLastRow() === 0) {
    const headers = ['ID', 'Date', 'Facility', 'Location', 'Score', 'Status', 'JSON_DATA'];
    sheet.appendRow(headers);
  }

  try {
    // Parse the incoming POST body
    const body = JSON.parse(e.postData.contents);
    const record = body.record; // The AuditRecord object
    
    // Create a row: Summary columns + Full JSON
    const row = [
      record.id,
      new Date(record.timestamp).toISOString(),
      record.facilityName,
      record.location,
      record.overallScore,
      record.status,
      JSON.stringify(record)
    ];
    
    sheet.appendRow(row);
    
    return ContentService.createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ result: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Audits');
  if (!sheet) {
    sheet = ss.insertSheet('Audits');
  }
  return sheet;
}
`.trim();

// --- Configuration Methods ---

export const getScriptUrl = (): string => {
  // Prioritize the hardcoded URL if it exists
  if (HARDCODED_SCRIPT_URL) return HARDCODED_SCRIPT_URL;
  return localStorage.getItem(URL_KEY) || '';
};

export const saveScriptUrl = (url: string) => {
  localStorage.setItem(URL_KEY, url.trim());
};

// --- API Methods ---

export const fetchAuditsFromSheet = async (): Promise<AuditRecord[]> => {
  const url = getScriptUrl();
  if (!url) {
    // Fallback to local storage if no URL configured
    return loadAuditsFromStorage() || [];
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    
    // Backup to local storage for offline capability
    saveAuditsToStorage(data);
    
    return data;
  } catch (error) {
    console.error("Error fetching from Google Sheet:", error);
    // If fetch fails (offline?), fallback to local
    const local = loadAuditsFromStorage();
    return local || [];
  }
};

export const saveAuditToSheet = async (audit: AuditRecord): Promise<void> => {
  const url = getScriptUrl();
  
  // Always save locally first (optimistic UI)
  const currentAudits = loadAuditsFromStorage() || [];
  const exists = currentAudits.find(a => a.id === audit.id);
  const updatedAudits = exists 
    ? currentAudits.map(a => a.id === audit.id ? audit : a)
    : [audit, ...currentAudits];
  saveAuditsToStorage(updatedAudits);

  if (!url) return;

  try {
    // Use no-cors mode or text/plain to avoid CORS preflight issues with GAS
    // Note: 'no-cors' means we won't know if it succeeded, but GAS Web Apps usually require 
    // simple requests (text/plain) to bypass preflight complex checks easily.
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({ record: audit })
    });
  } catch (error) {
    console.error("Error saving to Google Sheet:", error);
  }
};

// --- Local Storage Fallback (Internal) ---

export const saveAuditsToStorage = (audits: AuditRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(audits));
  } catch (e) {
    console.error("Failed to save audits locally", e);
  }
};

export const loadAuditsFromStorage = (): AuditRecord[] | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

// --- Export Utility ---

export const exportToGoogleSheetsCSV = (audits: AuditRecord[]) => {
  const headers = [
    'Audit ID',
    'Facility Name',
    'Location/Unit',
    'Date',
    'Time',
    'Auditor',
    'Overall Score',
    'Status',
    'Failed Items (IDs)',
    'AI Summary'
  ];

  const rows = audits.map(audit => {
    const dateObj = new Date(audit.timestamp);
    const failures = audit.responses
      .filter(r => r.status === 'fail')
      .map(r => r.questionId)
      .join('; ');
    
    const cleanStr = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;

    return [
      cleanStr(audit.id),
      cleanStr(audit.facilityName),
      cleanStr(audit.location),
      cleanStr(dateObj.toLocaleDateString()),
      cleanStr(dateObj.toLocaleTimeString()),
      cleanStr(audit.auditorName),
      audit.overallScore,
      cleanStr(audit.status),
      cleanStr(failures),
      cleanStr(audit.aiAnalysis || '')
    ].join(',');
  });

  const csvContent = "data:text/csv;charset=utf-8," 
    + headers.join(',') + "\n" 
    + rows.join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `F880_Surveillance_Export_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};