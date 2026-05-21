// SimuLab Firebase Module
// Handles: Google login, save/load projects to Firestore
//
// SETUP (one time):
// 1. Go to console.firebase.google.com
// 2. Create project → "simulab"
// 3. Add Web app → copy firebaseConfig below
// 4. Enable Authentication → Google sign-in
// 5. Enable Firestore Database → start in test mode

// ── YOUR FIREBASE CONFIG (replace with yours) ─────────────────
// Get this from Firebase Console → Project Settings → Your apps
const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
};
// ──────────────────────────────────────────────────────────────

// Firebase SDK URLs (loaded dynamically)
const FB_SDK = {
  app:       'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js',
  auth:      'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js',
  firestore: 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js',
};

let fbApp=null, fbAuth=null, fbDb=null, currentUser=null;

// ── Load Firebase SDK ─────────────────────────────────────────
async function loadFirebase() {
  try {
    const { initializeApp }        = await import(FB_SDK.app);
    const { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } = await import(FB_SDK.auth);
    const { getFirestore, collection, doc, setDoc, getDocs, getDoc, deleteDoc, query, where, orderBy, limit } = await import(FB_SDK.firestore);

    fbApp  = initializeApp(FIREBASE_CONFIG);
    fbAuth = getAuth(fbApp);
    fbDb   = getFirestore(fbApp);

    // Watch auth state
    onAuthStateChanged(fbAuth, user => {
      currentUser = user;
      updateAuthUI(user);
      if(user) loadUserProjects();
    });

    // Expose to window
    window._fb = { GoogleAuthProvider, signInWithPopup, signOut,
                   collection, doc, setDoc, getDocs, getDoc, deleteDoc, query, where, orderBy, limit };

    // Check for shared project in URL
    const urlParams = new URLSearchParams(window.location.search);
    const sharedId = urlParams.get('id');
    if (sharedId) {
      setTimeout(() => loadSharedProject(sharedId), 500);
    }

    console.log('Firebase loaded ✓');
    return true;
  } catch(e) {
    console.warn('Firebase not configured:', e.message);
    return false;
  }
}

// ── Google Sign In ────────────────────────────────────────────
async function signInGoogle() {
  if(!fbAuth) { alert('Firebase not configured. See js/firebase.js'); return; }
  try {
    const provider = new window._fb.GoogleAuthProvider();
    await window._fb.signInWithPopup(fbAuth, provider);
  } catch(e) {
    if(e.code !== 'auth/popup-closed-by-user')
      console.error('Sign in error:', e);
  }
}

async function signOutUser() {
  if(!fbAuth) return;
  await window._fb.signOut(fbAuth);
  currentUser = null;
  updateAuthUI(null);
}

// ── UI update ─────────────────────────────────────────────────
function updateAuthUI(user) {
  const btn    = document.getElementById('auth-btn');
  const avatar = document.getElementById('auth-avatar');
  const name   = document.getElementById('auth-name');
  const projPanel = document.getElementById('cloud-projects-panel');

  if(user) {
    if(btn) { btn.textContent = 'Sign Out'; btn.onclick = signOutUser; }
    if(avatar) { avatar.src = user.photoURL || ''; avatar.style.display='block'; }
    if(name)   name.textContent = user.displayName || user.email;
    if(projPanel) projPanel.style.display = 'block';
  } else {
    if(btn) { btn.textContent = '🔑 Sign In'; btn.onclick = signInGoogle; }
    if(avatar) avatar.style.display='none';
    if(name)   name.textContent = '';
    if(projPanel) projPanel.style.display = 'none';
  }
}

// ── Save project to Firestore ─────────────────────────────────
async function saveToCloud(name, projectData) {
  if(!currentUser || !fbDb) {
    alert('Sign in to save to cloud');
    return false;
  }
  try {
    const { doc, setDoc } = window._fb;
    const id = 'proj_' + Date.now();
    await setDoc(doc(fbDb, 'projects', id), {
      uid:       currentUser.uid,
      name:      name || 'Untitled',
      data:      JSON.stringify(projectData),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author:    currentUser.displayName || 'Anonymous',
      avatar:    currentUser.photoURL || '',
    });
    console.log('Saved to cloud:', id);
    await loadUserProjects();
    return id;
  } catch(e) {
    console.error('Save error:', e);
    alert('Save failed: ' + e.message);
    return false;
  }
}

// ── Load user's projects ───────────────────────────────────────
async function loadUserProjects() {
  if(!currentUser || !fbDb) return [];
  try {
    const { collection, query, where, orderBy, getDocs, limit } = window._fb;
    const q = query(
      collection(fbDb, 'projects'),
      where('uid', '==', currentUser.uid),
      orderBy('updatedAt', 'desc'),
      limit(20)
    );
    const snap = await getDocs(q);
    const projects = [];
    snap.forEach(d => projects.push({ id: d.id, ...d.data() }));
    renderCloudProjects(projects);
    return projects;
  } catch(e) {
    console.error('Load error:', e);
    return [];
  }
}

// ── Delete project ────────────────────────────────────────────
async function deleteCloudProject(id) {
  if(!fbDb || !confirm('Delete this project?')) return;
  const { doc, deleteDoc } = window._fb;
  await deleteDoc(doc(fbDb, 'projects', id));
  await loadUserProjects();
}

// ── Render cloud project list ─────────────────────────────────
function renderCloudProjects(projects) {
  const list = document.getElementById('cloud-project-list');
  if(!list) return;
  list.innerHTML = '';
  if(!projects.length) {
    list.innerHTML = '<div style="padding:12px;font-size:12px;color:var(--text3)">No saved projects yet</div>';
    return;
  }
  projects.forEach(p => {
    const item = document.createElement('div');
    item.className = 'cloud-proj-item';
    item.innerHTML = `
      <div class="cloud-proj-name">${p.name}</div>
      <div class="cloud-proj-date">${new Date(p.updatedAt).toLocaleDateString()}</div>
      <div class="cloud-proj-actions">
        <button onclick="loadCloudProject('${p.id}')">📂 Open</button>
        <button onclick="deleteCloudProject('${p.id}')" style="color:var(--red)">🗑</button>
      </div>
    `;
    list.appendChild(item);
  });
}

// ── Load a cloud project into workspace ───────────────────────
async function loadCloudProject(id) {
  if(!fbDb) return;
  try {
    const projects = await loadUserProjects();
    const p = projects.find(x => x.id === id);
    if(!p) return;
    const data = JSON.parse(p.data);
    if(typeof loadProjectData === 'function') loadProjectData(data);
    document.getElementById('proj-name').textContent = p.name;
    closeCloudPanel();
  } catch(e) {
    console.error('Load project error:', e);
  }
}

// ── Load a Shared project by ID ───────────────────────────────
async function loadSharedProject(id) {
  if(!fbDb) return;
  try {
    const { doc, getDoc } = window._fb;
    const docSnap = await getDoc(doc(fbDb, 'projects', id));
    if (docSnap.exists()) {
      const p = docSnap.data();
      const data = JSON.parse(p.data);
      if(typeof loadProjectData === 'function') loadProjectData(data);
      document.getElementById('proj-name').textContent = p.name || 'Shared Project';
      console.log('Loaded shared project:', id);
    } else {
      alert("Shared project not found. It may have been deleted.");
    }
  } catch(e) {
    console.error('Load shared project error:', e);
    alert("Error loading shared project: " + e.message);
  }
}

// ── Init ──────────────────────────────────────────────────────
loadFirebase();
