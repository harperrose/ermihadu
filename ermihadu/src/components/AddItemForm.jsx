import { useState, useRef } from "react";

export default function AddItemForm({ peopleList, onCancel }) {
  const [title, setTitle] = useState("");
  const [person, setPerson] = useState("");
  const [newPerson, setNewPerson] = useState("");
  const [size, setSize] = useState("Medium");
  const [images, setImages] = useState([]);
  const [description, setDescription] = useState("");
  const [audioBlob, setAudioBlob] = useState(null);
  const [uploadedBy, setUploadedBy] = useState([]); // Array for multiple selections
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    setImages([...images, ...files]);
  };

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const toggleUploader = (letter) => {
    if (uploadedBy.includes(letter)) {
      setUploadedBy(uploadedBy.filter(l => l !== letter));
    } else {
      setUploadedBy([...uploadedBy, letter]);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const finalPerson = newPerson || person;
    
    if (!title || !finalPerson || uploadedBy.length === 0) {
      alert('Please fill in title, person, and select who uploaded it');
      return;
    }

    setIsUploading(true);

    try {
      // TODO: Upload images and audio to Google Drive first
      // For now, we'll just send placeholder data
      const imageIds = []; // Array of Drive file IDs after upload
      const audioId = '';   // Drive file ID after upload

      // Send to Google Apps Script
      const response = await fetch('https://script.google.com/macros/s/AKfycbzXh_aPdRBgexHSbxJhrWIHkQT7e0ZNeBuPReAr2GGWjeuKCqrQSpkQ4Abv-b6t7evh/exec', {
        method: 'POST',
        mode: 'no-cors', // Required for Apps Script
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title,
          person: finalPerson,
          size: size,
          description: description,
          imageIds: imageIds,
          audioId: audioId,
          audioTranscript: '',
          uploader: uploadedBy.join('')
        })
      });

      // Reset form
      setTitle("");
      setPerson("");
      setNewPerson("");
      setSize("Medium");
      setImages([]);
      setDescription("");
      setAudioBlob(null);
      setUploadedBy([]);

      alert('Item uploaded successfully!');
      onCancel(); // Close form and return to items view
      
      // Refresh the page to show new item
      window.location.reload();

    } catch (err) {
      console.error('Error uploading:', err);
      alert('Error uploading item. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="add-item-form">
      <h2>Add Item</h2>

      {/* Image Upload */}
      <div className="form-group">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageUpload}
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
          <p style={{ color: '#666', fontSize: '16px' }}>+ Add images</p>
        </div>
        
        {images.length > 0 && (
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
            {images.map((img, idx) => (
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
                    fontSize: '16px'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Title */}
      <label>
        Item Title
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Enter item name"
          required
        />
      </label>

      {/* Person Selector */}
      <label>
        Person Who Gave It
        <select 
          value={person} 
          onChange={e => {
            setPerson(e.target.value);
            if (e.target.value !== 'new') setNewPerson('');
          }}
        >
          <option value="">Select person</option>
          {peopleList.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
          <option value="new">+ Add new person</option>
        </select>
      </label>

      {person === 'new' && (
        <label>
          New Person's Name
          <input
            type="text"
            value={newPerson}
            onChange={e => setNewPerson(e.target.value)}
            placeholder="Enter person's name"
            required
          />
        </label>
      )}

      {/* Size */}
      <label>
        Size
        <select value={size} onChange={e => setSize(e.target.value)}>
          {["Small", "Medium", "Large", "Huge"].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      {/* Description */}
      <label>
        Description (Optional)
        <textarea 
          value={description} 
          onChange={e => setDescription(e.target.value)}
          placeholder="Tell the story of this item..."
          rows="4"
        />
      </label>

      {/* Audio Recording */}
      <div className="form-group">
        <label>Record Audio (Optional)</label>
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
            fontSize: '16px'
          }}
        >
          {isRecording ? '⏹ Stop Recording' : '🎤 Record Audio'}
        </button>
        
        {audioBlob && (
          <audio
            controls
            src={URL.createObjectURL(audioBlob)}
            style={{ width: '100%', marginTop: '10px' }}
          />
        )}
      </div>

      {/* Uploader Selection */}
      <div className="form-group">
        <label>Who is Uploading?</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          {["ER", "MI", "HA", "DU"].map(letter => (
            <button
              key={letter}
              type="button"
              onClick={() => toggleUploader(letter)}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: '2px solid',
                borderColor: uploadedBy.includes(letter) ? '#333' : '#ddd',
                backgroundColor: uploadedBy.includes(letter) ? '#333' : 'white',
                color: uploadedBy.includes(letter) ? 'white' : 'black',
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

      {/* Form Actions */}
      <div className="form-actions" style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button 
          type="button" 
          onClick={onCancel} 
          disabled={isUploading}
          style={{
            flex: 1,
            padding: '16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#e0e0e0',
            cursor: isUploading ? 'not-allowed' : 'pointer',
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
  );
}