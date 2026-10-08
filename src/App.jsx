import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { addDoc, collection, deleteDoc, deleteField, doc, getDoc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore'
import { auth, db, firebaseConfigured, googleProvider } from './firebase/config'
import { areas as defaultAreas, initialSearches } from './data'

const Icon = ({ name, size = 18 }) => {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
    briefcase: <><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></>,
    chart: <><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-5 5"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.6-1.4-2.4 1.4-1.1a8 8 0 0 1 0-1.8L6.3 12l1.4-2.4 1.7.6a8 8 0 0 1 1.5-.9l.3-1.8H14l.3 1.8a8 8 0 0 1 1.5.9l1.7-.6 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 1.9Z"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    filter: <><path d="M4 7h16M7 12h10m-7 5h4"/></>,
    down: <path d="m7 10 5 5 5-5"/>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/></>,
    close: <path d="m18 6-12 12M6 6l12 12"/>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10"/></>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-.9 14H5.9L5 6m4 4v6m6-6v6"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

const mapCandidateData = (data, id) => {
  const createdAt = data.createdAt?.toDate?.() || (data.createdAt instanceof Date ? data.createdAt : null)
  const salaryAmount = data.salaryExpectation?.amount
  const salaryCurrency = data.salaryExpectation?.currency || 'ARS'
  return {
    ...data,
    id,
    name: data.name || '****',
    email: data.email || '****',
    phone: data.phone || '****',
    role: data.role || '****',
    area: data.area || '****',
    location: data.location || '****',
    experience: Number.isFinite(data.experienceYears) ? `${data.experienceYears} años` : '****',
    salary: Number.isFinite(salaryAmount) ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: salaryCurrency, maximumFractionDigits: 0 }).format(salaryAmount) : '****',
    skills: Array.isArray(data.skills) && data.skills.length ? data.skills : ['****'],
    comments: data.comments || '****',
    initials: data.name ? data.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() : '****',
    color: 'lilac',
    date: createdAt ? new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).format(createdAt) : '****',
    candidateCode: '****',
    cv: '****',
  }
}

const mapCandidate = snapshot => mapCandidateData(snapshot.data(), snapshot.id)

const searchDeadlineInput = search => {
  if (!search) return ''
  if (search.deadlineISO) return search.deadlineISO
  const match = search.deadline?.match(/^(\d{1,2})\s+([a-z]{3})\s+(\d{4})$/i)
  if (!match) return ''
  const months = { ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06', jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12' }
  return months[match[2].toLowerCase()] ? `${match[3]}-${months[match[2].toLowerCase()]}-${match[1].padStart(2, '0')}` : ''
}

function App() {
  const [authUser, setAuthUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [logoutError, setLogoutError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [candidates, setCandidates] = useState([])
  const [candidatesLoading, setCandidatesLoading] = useState(false)
  const [candidatesError, setCandidatesError] = useState('')
  const [candidateMutationError, setCandidateMutationError] = useState('')
  const [savingCandidate, setSavingCandidate] = useState(false)
  const [areas, setAreas] = useState(() => {
    try { return JSON.parse(localStorage.getItem('talento-areas')) || defaultAreas } catch { return defaultAreas }
  })
  const [searches, setSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('talento-searches')) || initialSearches } catch { return initialSearches }
  })
  const [query, setQuery] = useState('')
  const [areaFilter, setAreaFilter] = useState('Todas las áreas')
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [editingCandidate, setEditingCandidate] = useState(null)
  const [activeNav, setActiveNav] = useState('Candidatos')
  const [mobileNav, setMobileNav] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchStatus, setSearchStatus] = useState('Todas')
  const [skillFilter, setSkillFilter] = useState('')
  const [newArea, setNewArea] = useState('')
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('talento-dark-mode') === 'true')
  const [editingSearch, setEditingSearch] = useState(null)

  useEffect(() => {
    if (!firebaseConfigured) {
      setAuthLoading(false)
      return undefined
    }
    return onAuthStateChanged(auth, async user => {
      setAuthLoading(true)
      setAuthUser(null)
      setAccessDenied(false)
      if (!user) {
        setAuthLoading(false)
        return
      }
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists() && userDoc.data().enabled === true) setAuthUser(user)
        else setAccessDenied(true)
      } catch (error) {
        console.error('No se pudo verificar la autorización del usuario:', error)
        setAccessDenied(true)
      } finally {
        setAuthLoading(false)
      }
    })
  }, [])

  useEffect(() => {
    if (!authUser || !db) {
      setCandidates([])
      setCandidatesLoading(false)
      return undefined
    }
    let cancelled = false
    const loadCandidates = async () => {
      setCandidatesLoading(true)
      setCandidatesError('')
      try {
        const snapshot = await getDocs(collection(db, 'candidates'))
        if (cancelled) return
        const loaded = snapshot.docs.map(mapCandidate).sort((a, b) => (b.createdAt?.toMillis?.() || b.createdAt?.getTime?.() || 0) - (a.createdAt?.toMillis?.() || a.createdAt?.getTime?.() || 0))
        setCandidates(loaded)
      } catch (error) {
        if (!cancelled) setCandidatesError('No se pudieron cargar los candidatos. Revisá la conexión y las reglas de Firestore.')
      } finally {
        if (!cancelled) setCandidatesLoading(false)
      }
    }
    loadCandidates()
    return () => { cancelled = true }
  }, [authUser])

  const filtered = useMemo(() => candidates.filter(c => {
    const q = query.trim().toLowerCase()
    const matches = !q || [c.name, c.role, c.email, c.location, c.id, ...(c.skills || [])].join(' ').toLowerCase().includes(q)
    const skills = skillFilter.split(',').map(skill => skill.trim().toLowerCase()).filter(Boolean)
    const matchesSkills = !skills.length || skills.every(skill => (c.skills || []).some(candidateSkill => candidateSkill.toLowerCase().includes(skill)))
    return matches && matchesSkills && (areaFilter === 'Todas las áreas' || c.area === areaFilter)
  }), [candidates, query, areaFilter, skillFilter])

  const persistSearches = next => { setSearches(next); localStorage.setItem('talento-searches', JSON.stringify(next)) }
  const persistAreas = next => { setAreas(next); localStorage.setItem('talento-areas', JSON.stringify(next)) }
  const addArea = e => { e.preventDefault(); const name = newArea.trim(); if (!name || areas.some(area => area.toLowerCase() === name.toLowerCase())) return; persistAreas([...areas, name]); setNewArea('') }
  const showAuthError = error => {
    const messages = {
      'auth/user-disabled': 'Esta cuenta está deshabilitada.',
      'auth/operation-not-allowed': 'Este método de acceso todavía no está habilitado en Firebase Authentication.',
      'auth/unauthorized-domain': 'Este dominio no está autorizado en Firebase Authentication.',
      'auth/popup-closed-by-user': 'Se cerró la ventana de acceso antes de terminar.',
      'auth/popup-blocked': 'El navegador bloqueó la ventana de acceso. Permití ventanas emergentes e intentá de nuevo.',
      'auth/network-request-failed': 'No se pudo conectar con Firebase. Revisá tu conexión e intentá de nuevo.',
    }
    setLoginError(messages[error.code] || 'No se pudo iniciar sesión. Revisá la configuración de Firebase e intentá de nuevo.')
  }
  const loginWithGoogle = async () => {
    setLoginError('')
    if (!firebaseConfigured) { setLoginError('Falta configurar Firebase. Revisá las variables VITE_FIREBASE en .env.local.'); return }
    setAuthBusy(true)
    try { await signInWithPopup(auth, googleProvider) } catch (error) { showAuthError(error) } finally { setAuthBusy(false) }
  }
  const logout = async () => {
    if (!auth) { setLogoutError('No se pudo conectar con Firebase Authentication.'); return }
    setLogoutError('')
    setAuthBusy(true)
    try {
      await signOut(auth)
      setAuthUser(null)
      setAccessDenied(false)
    } catch (error) {
      setLogoutError(error.message || 'No se pudo cerrar la sesión. Intentá de nuevo.')
    } finally { setAuthBusy(false) }
  }
  const saveCandidate = async e => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const name = form.get('name').trim()
    const candidateData = {
      name,
      ...(form.get('email').trim() && { email: form.get('email').trim() }),
      ...(form.get('phone').trim() && { phone: form.get('phone').trim() }),
      ...(form.get('role').trim() && { role: form.get('role').trim() }),
      ...(form.get('area') && { area: form.get('area') }),
      location: form.get('location').trim(),
      experienceYears: Number(form.get('experienceYears')),
      ...(form.get('salaryAmount') && { salaryExpectation: { amount: Number(form.get('salaryAmount')), currency: 'ARS' } }),
      skills: form.get('skills').split(',').map(skill => skill.trim()).filter(Boolean),
      comments: form.get('comments').trim(),
    }
    if (!db || !authUser) { setCandidateMutationError('Necesitás iniciar sesión para guardar candidatos.'); return }
    setCandidateMutationError('')
    setSavingCandidate(true)
    try {
      if (editingCandidate) {
        const candidateRef = doc(db, 'candidates', editingCandidate.id)
        await updateDoc(candidateRef, {
          ...candidateData,
          email: candidateData.email || deleteField(),
          phone: candidateData.phone || deleteField(),
          role: candidateData.role || deleteField(),
          area: candidateData.area || deleteField(),
          salaryExpectation: candidateData.salaryExpectation || deleteField(),
          updatedAt: serverTimestamp(),
        })
        const updatedCandidate = mapCandidateData({ ...editingCandidate, ...candidateData, email: candidateData.email, phone: candidateData.phone, role: candidateData.role, area: candidateData.area, salaryExpectation: candidateData.salaryExpectation }, editingCandidate.id)
        setCandidates(current => current.map(candidate => candidate.id === editingCandidate.id ? updatedCandidate : candidate))
        setSelected(updatedCandidate)
      } else {
        const candidateRef = await addDoc(collection(db, 'candidates'), { ...candidateData, createdAt: serverTimestamp(), createdByUid: authUser.uid, updatedAt: serverTimestamp() })
        setCandidates(current => [mapCandidateData({ ...candidateData, createdAt: new Date() }, candidateRef.id), ...current])
      }
      setModal(null)
      setEditingCandidate(null)
    } catch (error) {
      setCandidateMutationError('No se pudo guardar el candidato. Revisá las reglas de Firestore e intentá de nuevo.')
    } finally {
      setSavingCandidate(false)
    }
  }
  const deleteSelectedCandidate = async () => {
    if (!selected || !db || !confirm('¿Querés eliminar este candidato?')) return
    setCandidateMutationError('')
    try {
      await deleteDoc(doc(db, 'candidates', selected.id))
      setCandidates(current => current.filter(candidate => candidate.id !== selected.id))
      setSelected(null)
    } catch (error) {
      setCandidateMutationError('No se pudo eliminar el candidato. Revisá las reglas de Firestore e intentá de nuevo.')
    }
  }
  const saveSearch = e => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const deadlineISO = form.get('deadline') || editingSearch?.deadlineISO || ''
    const nextSearchNumber = searches.reduce((max, search) => Math.max(max, Number(search.id.match(/\d+$/)?.[0] || 0)), 0) + 1
    const newSearch = { ...editingSearch, id: editingSearch?.id || `B-${String(nextSearchNumber).padStart(3, '0')}`, title: form.get('title').trim(), area: form.get('area'), location: form.get('location') || 'A definir', type: form.get('type'), created: editingSearch?.created || new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short' }).format(new Date()), deadline: deadlineISO ? new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short' }).format(new Date(`${deadlineISO}T12:00:00`)) : editingSearch?.deadline || 'A definir', deadlineISO, status: editingSearch?.status || 'Activa', candidates: editingSearch?.candidates || 0, description: form.get('description') || '' }
    persistSearches(editingSearch ? searches.map(search => search.id === editingSearch.id ? newSearch : search) : [newSearch, ...searches]); setModal(null); setEditingSearch(null)
  }
  const userEmail = authUser?.email || ''
  const userName = authUser?.displayName || (userEmail ? userEmail.split('@')[0].split(/[._-]/).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') : 'Ana Martínez')
  const visibleSearches = searches.filter(search => (searchStatus === 'Todas' || search.status === searchStatus) && (!searchQuery || `${search.title} ${search.area} ${search.location}`.toLowerCase().includes(searchQuery.toLowerCase())))

  if (authLoading) return <main className="auth-loading" aria-label="Cargando sesión"><span className="auth-loading-mark">T</span></main>
  if (!authUser) return accessDenied
    ? <main className="login-page"><div className="login-art"><div className="brand brand-light"><img className="brand-logo" src="/assets/tyc-mark-round.png" alt="Talento y Conocimiento"/><span className="brand-wordmark">Talento y<br/>Conocimiento</span></div><div className="art-copy"><span className="eyebrow">ACCESO RESTRINGIDO</span><h1>Tu cuenta<br/>todavía no<br/><em>está habilitada.</em></h1></div><div className="art-shape shape-one"/><div className="art-shape shape-two"/></div><section className="login-side"><div className="login-box"><span className="eyebrow">USUARIO NO AUTORIZADO</span><h2>No tenés acceso</h2><p className="muted">Tu cuenta no está habilitada para ingresar. Si creés que es un error, contactá a la persona administradora.</p>{logoutError && <div className="error-msg" role="alert">{logoutError}</div>}<button type="button" className="demo-btn" onClick={logout} disabled={authBusy}>{authBusy ? 'Cerrando sesión…' : 'Cerrar sesión'}</button></div></section></main>
    : <main className="login-page"><div className="login-art"><div className="brand brand-light"><img className="brand-logo" src="/assets/tyc-mark-round.png" alt="Talento y Conocimiento"/><span className="brand-wordmark">Talento y<br/>Conocimiento</span></div><div className="art-copy"><span className="eyebrow">TALENTO, EN UN SOLO LUGAR</span><h1>Las mejores<br/>conexiones<br/><em>empiezan acá.</em></h1></div><div className="art-shape shape-one"/><div className="art-shape shape-two"/></div><section className="login-side"><div className="login-box"><span className="eyebrow">BIENVENIDO/A</span><h2>Ingresá a tu cuenta</h2><p className="muted">Continuá con tu cuenta de Google para acceder al panel.</p>{loginError && <div className="error-msg" role="alert">{loginError}</div>}<button type="button" className="demo-btn" onClick={loginWithGoogle} disabled={authBusy}>{authBusy ? 'Conectando con Google…' : 'Continuar con Google'}</button></div></section></main>

  const isAdmin = userEmail.toLowerCase().includes('admin')
  return <div className={`app-shell${darkMode ? ' dark-mode' : ''}`}>
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}><div className="brand"><img className="brand-logo" src="/assets/tyc-mark-round.png" alt="Talento y Conocimiento"/><span className="brand-wordmark">Talento y<br/>Conocimiento</span></div><div className="workspace-label">USUARIO</div><div className="workspace-switch"><div className="workspace-icon">{userName.split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase()}</div><span><strong>{userName}</strong><small>{isAdmin ? 'Administradora' : 'Recruiter'}</small></span></div><div className="nav-label">MENU PRINCIPAL</div><nav>{[['Candidatos','users'],['Búsquedas','briefcase'],['Configuración','settings']].map(([label, icon]) => <button key={label} className={`nav-item ${activeNav === label ? 'nav-active' : ''}`} onClick={() => { setActiveNav(label); setMobileNav(false) }}><Icon name={icon}/><span>{label}</span>{label === 'Candidatos' && <b className="nav-count">{candidates.length}</b>}</button>)}</nav><div className="sidebar-spacer"/><div className="sidebar-bottom">{logoutError && <div className="error-msg logout-error" role="alert">{logoutError}</div>}<button className="profile-card" onClick={logout} disabled={authBusy}><div className="avatar avatar-profile">{userName.split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase()}</div><span><strong>{userName}</strong><small>{authBusy ? 'Cerrando sesión…' : 'Cerrar sesión'}</small></span><Icon name="logout" size={17}/></button></div></aside>
    <main className="main-area"><header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)}><Icon name="grid"/></button><div className="breadcrumb">Workspace <Icon name="chevron" size={14}/><strong>{activeNav}</strong></div><div className="top-actions"><button className="top-avatar" title={userName}>{userName.split(/\s+/).slice(0,2).map(part => part[0]).join('').toUpperCase()}</button></div></header>
      <div className="page-content"><div className="page-heading"><div><div className="eyebrow heading-eyebrow">GESTIÓN DE TALENTO <span className="heading-dot"/> BASE DE DATOS</div><h1>{activeNav} <span className="heading-count">{activeNav === 'Búsquedas' ? searches.length : activeNav === 'Configuración' ? areas.length : candidates.length}</span></h1><p>{activeNav === 'Búsquedas' ? 'Creá y organizá las posiciones que tu equipo necesita cubrir.' : activeNav === 'Configuración' ? 'Personalizá cómo se ve tu espacio de trabajo.' : 'Encontrá el talento indicado para cada oportunidad.'}</p></div>{activeNav !== 'Configuración' && <button className="primary-btn add-btn" onClick={() => { setEditingSearch(null); setEditingCandidate(null); setCandidateMutationError(''); setModal(activeNav === 'Búsquedas' ? 'search' : 'add') }}><Icon name="plus" size={18}/> {activeNav === 'Búsquedas' ? 'Nueva búsqueda' : 'Cargar candidato'}</button>}</div>
      {activeNav === 'Configuración' ? <><section className="settings-panel appearance-panel"><div className="settings-heading"><div className="settings-icon"><Icon name="settings"/></div><div><h2>Apariencia</h2><p>Ajustá la visualización a tu preferencia.</p></div></div><div className="preference-row"><div><strong>Modo oscuro</strong><small>Usar tonos oscuros en el panel.</small></div><button className={`toggle-switch${darkMode ? ' toggle-on' : ''}`} role="switch" aria-checked={darkMode} aria-label="Modo oscuro" onClick={() => { const next = !darkMode; setDarkMode(next); localStorage.setItem('talento-dark-mode', String(next)) }}><span/></button></div></section><section className="settings-panel areas-settings-panel"><div className="settings-heading"><div className="settings-icon"><Icon name="users"/></div><div><h2>Áreas de trabajo</h2><p>Administrá las áreas disponibles para candidatos y búsquedas.</p></div></div><form className="add-area-form" onSubmit={addArea}><input value={newArea} onChange={e => setNewArea(e.target.value)} placeholder="Ej. Finanzas" aria-label="Nueva área"/><button className="primary-btn" disabled={!newArea.trim()} aria-label="Agregar área"><Icon name="plus" size={16}/> Agregar área</button></form><div className="area-list">{areas.map(area => { const usedBy = candidates.filter(candidate => candidate.area === area).length; return <div className="area-row" key={area}><span className="area-dot dot-other"/><strong>{area}</strong><small>{usedBy ? `${usedBy} ${usedBy === 1 ? 'candidato' : 'candidatos'}` : 'Sin candidatos'}</small><button className="remove-area" disabled={usedBy > 0} title={usedBy ? 'No se puede quitar: hay candidatos en esta área' : `Quitar ${area}`} onClick={() => persistAreas(areas.filter(item => item !== area))}><Icon name="trash" size={16}/></button></div> })}{areas.length === 0 && <div className="empty-state"><strong>Todavía no hay áreas</strong><p>Agregá la primera para usarla en tus formularios.</p></div>}</div></section></> : activeNav === 'Búsquedas' ? <section className="searches-panel"><div className="searches-toolbar"><div className="search-box"><Icon name="search" size={18}/><input placeholder="Buscar por puesto, área o ubicación..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}/></div><div className="search-status-tabs">{['Todas','Activa','Pausada','Cerrada'].map(status => <button key={status} className={searchStatus === status ? 'selected-tab' : ''} onClick={() => setSearchStatus(status)}>{status}{status === 'Activa' && <span>{searches.filter(s => s.status === 'Activa').length}</span>}</button>)}</div></div><div className="searches-list">{visibleSearches.map(search => <article className="opening-card" key={search.id}><div className="opening-main"><div className="opening-title-line"><div className="opening-title-text"><span className="search-id-badge">{search.id}</span><h2>{search.title}</h2></div><span className={`opening-status opening-${search.status.toLowerCase()}`}><i/>{search.status}</span></div><div className="opening-meta"><span>{search.area}</span><i/><span>{search.location}</span><i/><span>{search.type}</span></div><p>{search.description}</p><div className="opening-footer"><span>{search.candidates} candidatos vinculados</span><span>Alta: {search.created}</span><span>Cierre: {search.deadline}</span></div>{search.candidateNames?.length > 0 && <div className="linked-candidates">Vinculados: {search.candidateNames.join(", ")}</div>}</div><div className="opening-actions"><button type="button" className="text-action" onClick={() => { setEditingSearch(search); setModal("search") }}>Editar</button><button className="row-more delete-search" title="Eliminar búsqueda" aria-label={`Eliminar búsqueda ${search.title}`} onClick={() => { if (confirm(`¿Querés eliminar la búsqueda “${search.title}”?`)) persistSearches(searches.filter(item => item.id !== search.id)) }}><Icon name="trash" size={16}/></button></div></article>)}{visibleSearches.length === 0 && <div className="empty-state"><span>⌕</span><strong>No hay búsquedas para mostrar</strong><p>Probá con otro filtro o creá una búsqueda nueva.</p></div>}</div></section> : <>
      <section className="list-panel"><div className="list-header"><div><h2>Todos los candidatos</h2><p>Gestioná y encontrá perfiles en tu base de talento.</p></div></div><div className="toolbar"><div className="search-box"><Icon name="search" size={18}/><input placeholder="Buscar por nombre, puesto o habilidad..." value={query} onChange={e => setQuery(e.target.value)}/><kbd>⌘ K</kbd></div><div className="filters"><span className="filter-label"><Icon name="filter" size={16}/> FILTRAR POR</span><select value={areaFilter} onChange={e => setAreaFilter(e.target.value)}><option>Todas las áreas</option>{areas.map(a => <option key={a}>{a}</option>)}</select><input className="skill-filter" aria-label="Filtrar por habilidades" placeholder="Habilidades (ej. React, SQL)" value={skillFilter} onChange={e => setSkillFilter(e.target.value)}/></div></div>
      <div className="table-wrap">{candidatesError && <div className="error-msg candidate-error" role="alert">{candidatesError}</div>}{candidatesLoading ? <div className="empty-state"><strong>Cargando candidatos...</strong></div> : <><table><thead><tr><th>CANDIDATO</th><th>PUESTO</th><th>ÁREA</th><th>UBICACIÓN</th><th>FECHA DE ALTA</th><th></th></tr></thead><tbody>{filtered.map(c => <tr key={c.id} onClick={() => { setCandidateMutationError(''); setSelected(c) }} className="candidate-row"><td><div className="candidate-cell"><div className={`avatar avatar-${c.color}`}>{c.initials}</div><div><strong>{c.name}</strong><small>{c.email}</small></div></div></td><td><span className="role-name">{c.role}</span></td><td><span className="area-label"><i className={`area-dot dot-${c.area === 'Tecnología' ? 'tech' : c.area === 'Diseño' ? 'design' : c.area === 'Marketing' ? 'marketing' : 'other'}`}/>{c.area}</span></td><td className="location-cell">{c.location}</td><td className="date-cell">{c.date}</td><td><button className="row-more" aria-label="Ver candidato" onClick={e => { e.stopPropagation(); setCandidateMutationError(''); setSelected(c) }}><Icon name="more"/></button></td></tr>)}</tbody></table>{!candidatesError && filtered.length === 0 && <div className="empty-state"><span>⌕</span><strong>{candidates.length ? 'No encontramos candidatos' : 'Todavía no hay candidatos'}</strong><p>{candidates.length ? 'Probá con otra búsqueda o cambiá los filtros.' : 'Usá “Cargar candidato” para agregar el primero.'}</p>{candidates.length > 0 && <button onClick={() => {setQuery(''); setAreaFilter('Todas las áreas'); setSkillFilter('')}}>Limpiar filtros</button>}</div>}</>}</div>
      <div className="table-footer"><span>Mostrando <strong>{filtered.length ? 1 : 0}–{filtered.length}</strong> de <strong>{filtered.length}</strong> candidatos</span><div className="pagination"><button disabled>←</button><button className="page-active">1</button><button disabled>→</button></div></div></section><footer className="page-footer"><span>© 2026 Talento y Conocimiento</span></footer></>}
      </div></main>
    {modal === 'search' && <div className="modal-backdrop" onMouseDown={e => { if(e.target === e.currentTarget) setModal(null) }}><form className="candidate-modal" onSubmit={saveSearch}><div className="modal-head"><div><span className="eyebrow">NUEVA POSICIÓN</span><h2>{editingSearch ? "Editar búsqueda" : "Crear búsqueda"}</h2><p>Definí la posición y sumala a tus búsquedas activas.</p></div><button type="button" className="icon-button" onClick={() => setModal(null)}><Icon name="close"/></button></div><div className="form-grid"><label className="span-two">Nombre del puesto *<input name="title" required defaultValue={editingSearch?.title || ""} placeholder="Ej. Backend Developer SSR"/></label><label>Área<select name="area" defaultValue={editingSearch?.area || ""}><option value="" disabled>Seleccionar área</option>{areas.map(a=><option key={a}>{a}</option>)}</select></label><label>Modalidad<input name="location" defaultValue={editingSearch?.location === "A definir" ? "" : editingSearch?.location || ""} placeholder="Buenos Aires · Híbrido"/></label><label>Tipo de empleo<select name="type" defaultValue={editingSearch?.type || "Tiempo completo"}><option>Tiempo completo</option><option>Medio tiempo</option><option>Contratación freelance</option><option>Pasantía</option></select></label><label>Fecha de cierre<input name="deadline" type="date" defaultValue={searchDeadlineInput(editingSearch)}/></label><label className="span-two">Descripción<textarea name="description" rows="4" defaultValue={editingSearch?.description || ""} placeholder="Contá brevemente qué perfil están buscando..."/></label></div><div className="modal-actions"><span>* Campos obligatorios</span><button type="button" className="cancel-btn" onClick={() => { setModal(null); setEditingSearch(null) }}>Cancelar</button><button className="primary-btn">{editingSearch ? "Guardar cambios" : "Crear búsqueda"} <span>→</span></button></div></form></div>}    {(modal === 'add' || modal === 'edit-candidate') && <div className="modal-backdrop" onMouseDown={e => { if(e.target === e.currentTarget) { setModal(null); setEditingCandidate(null); setCandidateMutationError("") } }}><form className="candidate-modal" onSubmit={saveCandidate}><div className="modal-head"><div><span className="eyebrow">{editingCandidate ? 'EDITAR PERFIL' : 'NUEVO PERFIL'}</span><h2>{editingCandidate ? 'Editar candidato' : 'Cargar candidato'}</h2><p>{editingCandidate ? 'Actualizá los datos de este perfil.' : 'Completá la información para sumar un perfil a tu base.'}</p></div><button type="button" className="icon-button" onClick={() => { setModal(null); setEditingCandidate(null); setCandidateMutationError("") }}><Icon name="close"/></button></div>{candidateMutationError && <div className="error-msg candidate-error" role="alert">{candidateMutationError}</div>}<div className="form-grid"><label className="span-two">Nombre y apellido *<input name="name" required defaultValue={editingCandidate?.name === '****' ? '' : editingCandidate?.name || ''} placeholder="Ej. Martina García"/></label><label>Email<input name="email" type="email" defaultValue={editingCandidate?.email === '****' ? '' : editingCandidate?.email || ''} placeholder="nombre@email.com"/></label><label>Teléfono<input name="phone" defaultValue={editingCandidate?.phone === '****' ? '' : editingCandidate?.phone || ''} placeholder="+54 9 11..."/></label><label>Puesto<input name="role" defaultValue={editingCandidate?.role === '****' ? '' : editingCandidate?.role || ''} placeholder="Ej. Product Designer"/></label><label>Área<select name="area" defaultValue={editingCandidate?.area === '****' ? '' : editingCandidate?.area || ''}><option value="" disabled>Seleccionar área</option>{areas.map(a=><option key={a}>{a}</option>)}</select></label><label>Ubicación *<input name="location" required defaultValue={editingCandidate?.location === '****' ? '' : editingCandidate?.location || ''} placeholder="Buenos Aires"/></label><label>Experiencia (años) *<input name="experienceYears" type="number" min="0" step="0.5" required defaultValue={editingCandidate?.experienceYears ?? ''} placeholder="Ej. 5"/></label><label>Expectativa salarial (ARS)<input name="salaryAmount" type="number" min="0" step="1" defaultValue={editingCandidate?.salaryExpectation?.amount ?? ''} placeholder="Ej. 2500000"/></label><label>Habilidades<input name="skills" defaultValue={Array.isArray(editingCandidate?.skills) ? editingCandidate.skills.join(', ') : ''} placeholder="Figma, UX Research, ..."/></label><label className="span-two">Comentarios<textarea name="comments" rows="3" defaultValue={editingCandidate?.comments === '****' ? '' : editingCandidate?.comments || ''} placeholder="Notas de entrevista, referencias, observaciones..."/></label><label className="span-two upload-label">CV / portfolio<div className="upload-zone"><Icon name="upload"/><span><strong>****</strong></span><small>PDF hasta 10 MB</small><input type="file" accept=".pdf,application/pdf" disabled/></div></label></div><div className="modal-actions"><span>* Campos obligatorios</span><button type="button" className="cancel-btn" onClick={() => { setModal(null); setEditingCandidate(null); setCandidateMutationError('') }}>Cancelar</button><button className="primary-btn" disabled={savingCandidate}>{savingCandidate && <span className="button-spinner" aria-hidden="true"/>}{savingCandidate ? 'Guardando...' : editingCandidate ? 'Guardar cambios' : 'Guardar candidato'} {!savingCandidate && <span>→</span>}</button></div></form></div>}
    {selected && <div className="modal-backdrop" onMouseDown={e => { if(e.target === e.currentTarget) { setSelected(null); setCandidateMutationError('') } }}><section className="detail-modal"><div className="detail-top"><button className="icon-button detail-close" onClick={() => { setSelected(null); setCandidateMutationError('') }}><Icon name="close"/></button><div className={`avatar avatar-large avatar-${selected.color}`}>{selected.initials}</div><h2>{selected.name}</h2><p>{selected.role} <span>·</span> {selected.area}</p><span className="candidate-id">ID {selected.candidateCode}</span></div><div className="detail-content"><div className="detail-section"><h3>Información de contacto</h3><div className="detail-grid"><div><small>EMAIL</small><span>{selected.email}</span></div><div><small>TELÉFONO</small><span>{selected.phone}</span></div><div><small>UBICACIÓN</small><span>{selected.location}</span></div><div><small>EXPERIENCIA</small><span>{selected.experience}</span></div><div><small>EXPECTATIVA SALARIAL</small><span>{selected.salary}</span></div><div><small>FECHA DE ALTA</small><span>{selected.date}</span></div></div></div><div className="detail-section candidate-search-links"><h3>Búsquedas asociadas</h3><div className="search-links-list"><span className="search-link-chip">****</span></div></div><div className="detail-section"><h3>Habilidades</h3><div className="skill-list">{(selected.skills || []).map(skill=><span key={skill}>{skill}</span>)}{!selected.skills?.length && <span className="muted">Sin habilidades cargadas</span>}</div></div><div className="detail-section"><h3>Comentarios</h3><p className="detail-comment">{selected.comments}</p></div><div className="detail-section"><div className="documentation-heading"><h3>Documentación</h3><label className="replace-cv-btn">{selected.cv ? 'Reemplazar CV' : 'Adjuntar CV'}<input type="file" accept=".pdf,application/pdf" disabled/></label></div>{selected.cv ? <div className="cv-file"><span className="file-icon"><Icon name="file"/></span><span><strong>{selected.cv}</strong><small>****</small></span></div> : <p className="muted">No hay archivos adjuntos.</p>}</div></div>{candidateMutationError && <div className="error-msg candidate-error" role="alert">{candidateMutationError}</div>}<div className="detail-actions"><button className="primary-btn" onClick={() => { setEditingCandidate(selected); setSelected(null); setCandidateMutationError(""); setModal("edit-candidate") }}>Editar candidato</button><button className="cancel-btn" onClick={deleteSelectedCandidate}>Eliminar</button></div></section></div>}
  </div>
}

export default App
