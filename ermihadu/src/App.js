import React, { useState, useRef, useEffect } from 'react';
import { Upload, Plus, Mic, X } from 'lucide-react';

const OAUTH_CONFIG = {
  clientId: '146399874070-lnnt6mejb702tcc9vc8s205puq3vp5ml.apps.googleusercontent.com',
  scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets',
  discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4', 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
};

const INITIAL_PEOPLE = ['Grammie', 'Verna', 'Elaine', 'Joyce'];
const UPLOADERS = ['ER', 'MI', 'HA', 'DU'];
const SIZES = ['Small', 'Medium', 'Large', 'Huge'];

export default function ErmihaduVault() {
  const [currentPage, setCurrentPage] = useState('home');
  const [items, setItems] = useState([]);
  const [expandedItem, setExpandedItem] = useState(null);
  const [filters, setFilters] = useState({ size: 'all', recency: 'newest', person: 'all' });
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    images: [],
    title: '',
    person: '',
    newPerson: '',
    size: 'Medium',
    description: '',
    audioBlob: null,
    audioTranscript: '',
    uploader: []
  });
  const [isRecording, setIsRecording] = useState(false);
  const [people, setPeople] = useState(INITIAL_PEOPLE);
  const [isUploading, setIsUploading] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);
  const gapiInited = useRef(false);

  // Initialize Google API
  useEffect(() => {
    const initClient = () => {
      window.gapi.client.init({
        clientId: OAUTH_CONFIG.clientId,
        discoveryDocs: OAUTH_CONFIG.discoveryDocs,
        scope: OAUTH_CONFIG.scope
      }).then(() => {
        const authInstance = window.gapi.auth2.getAuthInstance();
        setIsSignedIn(authInstance.isSignedIn.get());
        authInstance.isSignedIn.listen(setIsSignedIn);
        setIsInitialized(true);
        gapiInited.current = true;
        
        if (authInstance.isSignedIn.get()) {
          loadItems();
        }
      }).catch(err => {
        console.error('Error initializing GAPI:', err);
        alert('Failed to initialize Google API. Please refresh and try again.');
      });
    };

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      window.gapi.load('client:auth2', initClient);
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleSignIn = () => {
    if (!gapiInited.current) {
      alert('Google API is still initializing. Please wait a moment and try again.');
      return;
    }
    window.gapi.auth2.getAuthInstance().signIn();
  };

  const handleSignOut = () => {
    window.gapi.auth2.getAuthInstance().signOut();
  };

  // Load items from Google Sheets
  const loadItems = async () => {
    try {
      const sheetId = await getOrCreateSheet();
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Items!A2:L'
      });
      
      const rows = response.result.values || [];
      const loadedItems = rows.map((row, idx) => ({
        id: idx,
        timestamp: row[0] || '',
        title: row[1] || '',
        person: row[2] || '',
        size: row[3] || '',
        description: row[4] || '',
        imageUrls: row[5] ? row[5].split(',') : [],
        audioUrl: row[6] || '',
        audioTranscript: row[7] || '',
        uploader: row[8] || '',
        driveImageIds: row[9] ? row[9].split(',') : [],
        driveAudioId: row[10] || '',
        sheetId: row[11] || sheetId
      }));
      
      setItems(loadedItems);
    } catch (err) {
      console.error('Error loading items:', err);
    }
  };

  // Get or create Google Sheet
  const getOrCreateSheet = async () => {
    const storedSheetId = await window.storage.get('ermihadu_sheet_id').catch(() => null);
    
    if (storedSheetId?.value) {
      return storedSheetId.value;
    }

    // Create new sheet
    const response = await window.gapi.client.sheets.spreadsheets.create({
      properties: { title: 'ERMIHADU Items Database' },
      sheets: [{
        properties: { title: 'Items' },
        data: [{
          startRow: 0,
          startColumn: 0,
          rowData: [{
            values: [
              { userEnteredValue: { stringValue: 'Timestamp' } },
              { userEnteredValue: { stringValue: 'Title' } },
              { userEnteredValue: { stringValue: 'Person' } },
              { userEnteredValue: { stringValue: 'Size' } },
              { userEnteredValue: { stringValue: 'Description' } },
              { userEnteredValue: { stringValue: 'Image URLs' } },
              { userEnteredValue: { stringValue: 'Audio URL' } },
              { userEnteredValue: { stringValue: 'Transcript' } },
              { userEnteredValue: { stringValue: 'Uploader' } },
              { userEnteredValue: { stringValue: 'Drive Image IDs' } },
              { userEnteredValue: { stringValue: 'Drive Audio ID' } },
              { userEnteredValue: { stringValue: 'Sheet ID' } }
            ]
          }]
        }]
      }]
    });

    const sheetId = response.result.spreadsheetId;
    await window.storage.set('ermihadu_sheet_id', sheetId);
    return sheetId;
  };

  // Handle image selection
  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files]
    }));
  };

  const removeImage = (idx) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx)
    }));
  };

  // Handle audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setFormData(prev => ({ ...prev, audioBlob }));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Could not access microphone. Please allow microphone access.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Upload to Google Drive
  const uploadToDrive = async (file, filename) => {
    const metadata = {
      name: filename,
      mimeType: file.type
    };

    const formDataUpload = new FormData();
    formDataUpload.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formDataUpload.append('file', file);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: new Headers({ Authorization: 'Bearer ' + window.gapi.auth.getToken().access_token }),
      body: formDataUpload
    });

    const result = await response.json();
    
    // Make file publicly readable
    await window.gapi.client.drive.permissions.create({
      fileId: result.id,
      resource: { role: 'reader', type: 'anyone' }
    });

    return {
      id: result.id,
      url: `https://drive.google.com/uc?export=view&id=${result.id}`
    };
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isSignedIn) {
      alert('Please sign in with Google first');
      return;
    }

    if (!formData.title || (!formData.person && !formData.newPerson) || formData.uploader.length === 0) {
      alert('Please fill in title, person, and select uploader');
      return;
    }

    setIsUploading(true);

    try {
      const sheetId = await getOrCreateSheet();
      
      // Upload images
      const imageUploads = await Promise.all(
        formData.images.map((img, idx) => 
          uploadToDrive(img, `${formData.title}_${idx}_${Date.now()}.jpg`)
        )
      );

      // Upload audio
      let audioUpload = { id: '', url: '' };
      if (formData.audioBlob) {
        audioUpload = await uploadToDrive(
          formData.audioBlob,
          `${formData.title}_audio_${Date.now()}.webm`
        );
      }

      // Add person if new
      const finalPerson = formData.newPerson || formData.person;
      if (formData.newPerson && !people.includes(formData.newPerson)) {
        setPeople(prev => [...prev, formData.newPerson]);
      }

      // Add to Google Sheets
      await window.gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Items!A:L',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [[
            new Date().toISOString(),
            formData.title,
            finalPerson,
            formData.size,
            formData.description,
            imageUploads.map(u => u.url).join(','),
            audioUpload.url,
            formData.audioTranscript,
            formData.uploader.join(''),
            imageUploads.map(u => u.id).join(','),
            audioUpload.id,
            sheetId
          ]]
        }
      });

      // Reset form
      setFormData({
        images: [],
        title: '',
        person: '',
        newPerson: '',
        size: 'Medium',
        description: '',
        audioBlob: null,
        audioTranscript: '',
        uploader: []
      });

      // Reload items and go to home
      await loadItems();
      setCurrentPage('home');
      alert('Item uploaded successfully!');
    } catch (err) {
      console.error('Error uploading:', err);
      alert('Error uploading item. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Filter and sort items
  const filteredItems = items
    .filter(item => filters.size === 'all' || item.size === filters.size)
    .filter(item => filters.person === 'all' || item.person === filters.person)
    .sort((a, b) => {
      if (filters.recency === 'newest') {
        return new Date(b.timestamp) - new Date(a.timestamp);
      }
      return new Date(a.timestamp) - new Date(b.timestamp);
    });

  const toggleUploader = (letter) => {
    setFormData(prev => ({
      ...prev,
      uploader: prev.uploader.includes(letter)
        ? prev.uploader.filter(l => l !== letter)
        : [...prev.uploader, letter]
    }));
  };

  if (!isInitialized) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Maitree, serif' }}>
        <p>Loading Google API...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'Maitree, serif' }}>
        <h1 style={{ fontFamily: 'Inknut Antiqua, serif', fontSize: '35px', marginBottom: '30px' }}>
          ERMIHADU ITEMS
        </h1>
        <p style={{ marginBottom: '20px' }}>Please sign in with Google to access the memory vault</p>
        <button
          onClick={handleSignIn}
          style={{
            padding: '12px 24px',
            backgroundColor: '#333',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontFamily: 'Maitree, serif'
          }}
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '100vw', margin: '0 auto', padding: '20px', fontFamily: 'Maitree, serif', backgroundColor: 'white', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontFamily: 'Inknut Antiqua, serif', fontSize: '35px', margin: '0 0 20px 0' }}>
          <span 
            onClick={() => setCurrentPage('upload')}
            style={{ 
              cursor: 'pointer',
              textDecoration: currentPage === 'upload' ? 'underline' : 'none'
            }}
          >
            ERMIHADU
          </span>{' '}
          <span 
            onClick={() => setCurrentPage('home')}
            style={{ 
              cursor: 'pointer',
              textDecoration: currentPage === 'home' ? 'underline' : 'none'
            }}
          >
            ITEMS
          </span>
        </h1>
        
        {currentPage === 'home' && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px', height: '40px', flexWrap: 'wrap' }}>
            <select
              value={filters.size}
              onChange={(e) => setFilters(prev => ({ ...prev, size: e.target.value }))}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '16px' }}
            >
              <option value="all">All Sizes</option>
              {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            
            <select
              value={filters.recency}
              onChange={(e) => setFilters(prev => ({ ...prev, recency: e.target.value }))}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '16px' }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            
            <select
              value={filters.person}
              onChange={(e) => setFilters(prev => ({ ...prev, person: e.target.value }))}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '16px' }}
            >
              <option value="all">All People</option>
              {people.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            
            <button
              onClick={() => setCurrentPage('upload')}
              style={{
                marginLeft: 'auto',
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#e0e0e0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Plus size={24} />
            </button>
          </div>
        )}
      </div>

      {/* Home Page */}
      {currentPage === 'home' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {filteredItems.map(item => (
            <div key={item.id} style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
              {/* Image */}
              {expandedItem === item.id && item.imageUrls.length > 1 ? (
                <div style={{ overflowX: 'auto', display: 'flex', gap: '10px', padding: '10px' }}>
                  {item.imageUrls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`${item.title} ${idx + 1}`}
                      style={{ width: '90vw', height: 'auto', flexShrink: 0, borderRadius: '4px' }}
                    />
                  ))}
                </div>
              ) : item.imageUrls.length > 0 && (
                <img
                  src={item.imageUrls[0]}
                  alt={item.title}
                  style={{
                    width: '100%',
                    maxHeight: expandedItem === item.id ? 'none' : '300px',
                    objectFit: 'cover'
                  }}
                />
              )}
              
              {/* Info Row */}
              <div style={{
                display: 'flex',
                alignItems: expandedItem === item.id ? 'flex-start' : 'center',
                padding: '10px',
                gap: '10px',
                minHeight: '32px'
              }}>
                <div style={{ width: '20%', fontSize: '14px' }}>{item.person}</div>
                <div style={{
                  width: '60%',
                  fontSize: '16px',
                  fontFamily: 'Inknut Antiqua, serif',
                  overflow: expandedItem === item.id ? 'visible' : 'hidden',
                  textOverflow: expandedItem === item.id ? 'clip' : 'ellipsis',
                  whiteSpace: expandedItem === item.id ? 'normal' : 'nowrap'
                }}>
                  {item.title}
                </div>
                <button
                  onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                  style={{
                    width: '20%',
                    padding: '6px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: expandedItem === item.id ? '#666' : '#333',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  {expandedItem === item.id ? 'Hide' : 'Read'}
                </button>
              </div>
              
              {/* Expanded Content */}
              {expandedItem === item.id && (
                <div style={{ padding: '10px 10px 20px 10px' }}>
                  {item.description && (
                    <p style={{ fontSize: '12px', marginBottom: '15px', whiteSpace: 'pre-wrap' }}>
                      {item.description}
                    </p>
                  )}
                  
                  {item.audioUrl && (
                    <div style={{ marginBottom: '15px' }}>
                      <audio controls src={item.audioUrl} style={{ width: '100%', marginBottom: '10px' }} />
                      {item.audioTranscript && (
                        <p style={{ fontSize: '16px', fontStyle: 'italic' }}>{item.audioTranscript}</p>
                      )}
                    </div>
                  )}
                  
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Uploaded by: {item.uploader}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {filteredItems.length === 0 && (
            <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
              No items yet. Click the + button to add your first memory!
            </p>
          )}
        </div>
      )}

      {/* Upload Form */}
      {currentPage === 'upload' && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h2 style={{ fontFamily: 'Inknut Antiqua, serif', fontSize: '24px' }}>Add Item</h2>
          
          {/* Image Upload */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              style={{ display: 'none' }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '100%',
                padding: '40px',
                border: '2px dashed #ccc',
                borderRadius: '16px',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: '#f9f9f9'
              }}
            >
              <Upload size={48} style={{ color: '#666', margin: '0 auto 10px' }} />
              <p style={{ color: '#666', fontSize: '16px' }}>Add images</p>
            </div>
            
            {formData.images.length > 0 && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                {formData.images.map((img, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <img
                      src={URL.createObjectURL(img)}
                      alt={`Preview ${idx}`}
                      style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: '#ff4444',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Title */}
          <input
            type="text"
            placeholder="Item title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontSize: '16px'
            }}
            required
          />

          {/* Person Selector */}
          <div>
            <select
              value={formData.person}
              onChange={(e) => setFormData(prev => ({ ...prev, person: e.target.value, newPerson: '' }))}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '16px',
                marginBottom: '10px'
              }}
            >
              <option value="">Select person who gave it</option>
              {people.map(p => <option key={p} value={p}>{p}</option>)}
              <option value="new">+ Add new person</option>
            </select>
            
            {formData.person === 'new' && (
              <input
                type="text"
                placeholder="Enter person's name"
                value={formData.newPerson}
                onChange={(e) => setFormData(prev => ({ ...prev, newPerson: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '16px'
                }}
                required
              />
            )}
          </div>

          {/* Size */}
          <select
            value={formData.size}
            onChange={(e) => setFormData(prev => ({ ...prev, size: e.target.value }))}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontSize: '16px'
            }}
          >
            {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Description */}
          <textarea
            placeholder="Description (optional)"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontSize: '16px',
              minHeight: '100px',
              resize: 'vertical'
            }}
          />

          {/* Audio Recording */}
          <div>
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isRecording ? '#ff4444' : '#e0e0e0',
                color: isRecording ? 'white' : 'black',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Mic size={20} />
              {isRecording ? 'Stop Recording' : 'Record Audio'}
            </button>
            
            {formData.audioBlob && (
              <audio
                controls
                src={URL.createObjectURL(formData.audioBlob)}
                style={{ width: '100%', marginTop: '10px' }}
              />
            )}
          </div>

          {/* Uploader Selection */}
          <div>
            <p style={{ marginBottom: '10px', fontSize: '16px' }}>Who is uploading?</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              {UPLOADERS.map(letter => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => toggleUploader(letter)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '2px solid',
                    borderColor: formData.uploader.includes(letter) ? '#333' : '#ddd',
                    backgroundColor: formData.uploader.includes(letter) ? '#333' : 'white',
                    color: formData.uploader.includes(letter) ? 'white' : 'black',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                >
                  {letter}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setCurrentPage('home')}
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#e0e0e0',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#333',
                color: 'white',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                opacity: isUploading ? 0.6 : 1
              }}
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      )}

      {/* Sign Out Button */}
      <div style={{ marginTop: '40px', textAlign: 'center', paddingBottom: '20px' }}>
        <button
          onClick={handleSignOut}
          style={{
            padding: '8px 16px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}