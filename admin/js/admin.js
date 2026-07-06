document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');
    const uploadStatus = document.getElementById('uploadStatus');
    const jsonContent = document.getElementById('jsonContent');
    const saveJsonBtn = document.getElementById('saveJsonBtn');
    const jsonStatus = document.getElementById('jsonStatus');

    // Safe LocalStorage Wrapper
    const safeStorage = {
        setItem(key, value) {
            // Store only stringified data and simple hash of the string to detect tampering
            const strValue = JSON.stringify(value);
            // Very simple hash for basic tampering detection (not cryptographically secure, but deters casual manipulation)
            const hash = strValue.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
            localStorage.setItem(key, strValue);
            localStorage.setItem(key + '_hash', hash);
        },
        getItem(key) {
            const strValue = localStorage.getItem(key);
            const savedHash = localStorage.getItem(key + '_hash');
            if (!strValue) return null;
            
            const hash = strValue.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
            if (hash.toString() !== savedHash) {
                console.warn(`Tampering detected for localStorage key: ${key}. Clearing it.`);
                localStorage.removeItem(key);
                localStorage.removeItem(key + '_hash');
                return null;
            }
            try {
                return JSON.parse(strValue);
            } catch(e) {
                return null;
            }
        }
    };

    // Load initial JSON
    fetch('../assets/data/content.json')
        .then(res => res.json())
        .then(data => {
            jsonContent.value = JSON.stringify(data, null, 2);
            // Cache a safe backup
            safeStorage.setItem('content_backup', data);
        })
        .catch(err => {
            jsonStatus.innerText = "Failed to load content.json";
        });

    if(uploadForm) {
        uploadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(uploadForm);
            uploadStatus.innerText = 'Uploading...';

            fetch('api/upload.php', {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    uploadStatus.innerText = `Upload successful! Path: ${data.path}`;
                    uploadForm.reset();
                } else {
                    uploadStatus.innerText = `Error: ${data.error}`;
                }
            })
            .catch(err => {
                uploadStatus.innerText = `Network error.`;
            });
        });
    }

    if(saveJsonBtn) {
        saveJsonBtn.addEventListener('click', () => {
            jsonStatus.innerText = 'Saving...';
            try {
                // Ensure what we are sending is valid JSON
                const parsed = JSON.parse(jsonContent.value);
                
                fetch('api/save_json.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(parsed)
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        jsonStatus.innerText = 'Saved successfully!';
                        safeStorage.setItem('content_backup', parsed);
                    } else {
                        jsonStatus.innerText = `Error: ${data.error}`;
                    }
                })
                .catch(err => {
                    jsonStatus.innerText = `Network error.`;
                });
            } catch(e) {
                jsonStatus.innerText = 'Invalid JSON syntax.';
            }
        });
    }
});
