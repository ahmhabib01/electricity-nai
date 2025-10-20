import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState(6);
  const [timer, setTimer] = useState(90);
  const [running, setRunning] = useState(false);
  const [found, setFound] = useState({ fuse: false, cat: false, meter: false, pole: false });
  const [soundsOn, setSoundsOn] = useState(true);
  const [overlay, setOverlay] = useState({ show: true, title: 'শুরু করুন', text: 'খেলাটি শুরু করতে START চাপুন' });
  const [hint, setHint] = useState('মাউস/আঙুল দ্বারা ফ্ল্যাশলাইট নিয়ন্ত্রণ করুন');

  const flashRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const particleStore = useRef<any[]>([]);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const hintTimer = useRef<NodeJS.Timeout | null>(null);

  // Audio setup
  useEffect(() => {
    ambientRef.current = new Audio('/assets/ambient_loop.mp3');
    ambientRef.current.loop = true;
    return () => ambientRef.current?.pause();
  }, []);

  // Timer
  useEffect(() => {
    if (!running) return;
    if (timer <= 0) {
      endGame(false, 'সময় শেষ — প্রজেক্ট সেভ হয়নি');
      return;
    }
    const t = setInterval(() => setTimer(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [running, timer]);

  // Mood auto-increase
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setMood(m => Math.min(100, m + 2)), 1500);
    if (mood >= 90) endGame(false, 'রাগ এত বেড়ে গেল ল্যাপটপ ক্র্যাশ করলো!');
    return () => clearInterval(id);
  }, [running, mood]);

  // Canvas particles
  useEffect(() => {
    const canvas = particlesRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; };
    resize();
    window.addEventListener('resize', resize);
    const tick = () => {
      ctx!.clearRect(0, 0, canvas.width, canvas.height);
      const arr = particleStore.current;
      for (let i = arr.length - 1; i >= 0; i--) {
        const p = arr[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.life--;
        ctx!.beginPath(); ctx!.globalAlpha = Math.max(0, p.life / 60); ctx!.fillStyle = p.color;
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx!.fill();
        if (p.life <= 0) arr.splice(i, 1);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(rafRef.current!); window.removeEventListener('resize', resize); };
  }, []);

  // Flashlight follow
  function onMove(e: React.MouseEvent | React.TouchEvent) {
    const el = flashRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    el.style.background = `radial-gradient(circle 160px at ${x}px ${y}px, rgba(255,255,230,0.95), rgba(0,0,0,0) 40%), radial-gradient(circle 360px at ${x}px ${y}px, rgba(255,255,255,0.04), rgba(0,0,0,0.92) 60%)`;
    checkProximity(x, y);
  }

  // Proximity helpers
  function centerOfEl(el: HTMLElement) {
    const parent = flashRef.current!.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - parent.left + r.width / 2, y: r.top - parent.top + r.height / 2 };
  }
  function isNear(x: number, y: number, el: HTMLElement, threshold = 120) {
    const c = centerOfEl(el);
    return Math.hypot(x - c.x, y - c.y) < threshold;
  }

  // Hint & proximity
  function checkProximity(x: number, y: number) {
    const fuse = document.getElementById('fuse');
    const cat = document.getElementById('cat');
    const meter = document.getElementById('meter');
    const pole = document.getElementById('pole');
    [fuse, cat, meter, pole].forEach(it => it && it.classList.remove('lit'));
    if (step === 1 && fuse && isNear(x, y, fuse)) { fuse.classList.add('lit'); showHint('ফিউজ বক্স - ক্লিক করুন'); }
    else if (step === 1.5 && cat && isNear(x, y, cat)) { cat.classList.add('lit'); showHint('বিড়াল- ক্লিক করে সরান'); }
    else if (step === 2 && meter && isNear(x, y, meter)) { meter.classList.add('lit'); showHint('মিটার - ক্লিক করুন'); }
    else if (step === 3 && pole && isNear(x, y, pole)) { pole.classList.add('lit'); showHint('খুঁটি - ক্লিক করুন'); }
    else showHint('ফ্ল্যাশলাইট ঘোরান এবং গুরুত্বপূর্ণ জিনিস খুঁজুন');
  }

  function spawnSparks(x: number, y: number, n = 12) {
    for (let i = 0; i < n; i++) {
      particleStore.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 1.8) * 3,
        life: 30 + Math.random() * 30,
        size: 1 + Math.random() * 2,
        color: `rgba(255,${150 + Math.floor(Math.random() * 100)},0,1)`
      });
    }
  }

  function showHint(t: string, ms = 2500) {
    setHint(t);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(''), ms);
  }

  // Game controls
  function start() {
    setOverlay({ show: false });
    setRunning(true); setStep(0);
    ambientRef.current?.play().catch(()=>{});
    let pre = 4; showHint(`লোডশেডিং শুরু হতে আর ${pre} সেকেন্ড`);
    const p = setInterval(() => {
      pre -= 1; if (pre > 0) showHint(`লোডশেডিং শুরু হতে আর ${pre} সেকেন্ড`);
      else { clearInterval(p); beginMission(); }
    }, 1000);
  }
  function beginMission(){ setStep(1); showHint('লোডশেডিং হয়েছে — ফিউজ খুঁজুন!'); }
  function endGame(success: boolean, message: string) {
    setRunning(false);
    ambientRef.current?.pause();
    setOverlay({ show: true, title: success ? 'বিজয়!' : 'মিশন ব্যর্থ!', text: message });
  }
  function win() { setFound(f => ({ ...f, power:true })); setMood(m => Math.max(0,m-30)); endGame(true, 'বিদ্যুৎ ফিরে এসেছে — কাজ সেভ হয়েছে (কিন্তু ব্যাটারি কম)'); }

  // Click handlers
  const clickFuse = (e: React.MouseEvent) => { e.stopPropagation(); if (step!==1) return; playClick(); setFound(f=>({...f,fuse:true})); setStep(1.5); setMood(m=>Math.min(100,m+8)); document.getElementById('cat')?.classList.remove('hidden'); spawnSparks(e.clientX - flashRef.current!.getBoundingClientRect().left, e.clientY - flashRef.current!.getBoundingClientRect().top, 20); }
  const clickCat = (e: React.MouseEvent) => { e.stopPropagation(); if (step!==1.5) return; playClick(); setFound(f=>({...f,cat:true})); setStep(2); setMood(m=>Math.max(0,m-10)); document.getElementById('cat')?.classList.add('hidden'); document.getElementById('meter')?.classList.remove('hidden'); spawnSparks(e.clientX - flashRef.current!.getBoundingClientRect().left, e.clientY - flashRef.current!.getBoundingClientRect().top, 14); }
  const clickMeter = (e: React.MouseEvent) => { e.stopPropagation(); if (step!==2) return; playClick(); setFound(f=>({...f,meter:true})); setStep(3); document.getElementById('pole')?.classList.remove('hidden'); showPhonePrompt(); }
  const clickPole = (e: React.MouseEvent) => { e.stopPropagation(); if (step!==3) return; playClick(); setFound(f=>({...f,pole:true})); setTimeout(()=>{ setStep(4); win(); }, 2500); }

  function showPhonePrompt() {
    const num = prompt('অফিসে কল করুন — নম্বর ৩ সংখ্যায় লিখুন (টিপ: 555)', '');
    if (num==='555') { setMood(m=>Math.max(0,m-8)); showHint('কল হয়েছে — মাঠে গিয়ে ফিউজ আনুন'); }
    else { setMood(m=>m+12); playError(); showHint('ভুল নম্বর — মেজাজ বাড়ল'); }
  }

  // Audio
  const playClick = () => { if (!soundsOn) return; new Audio('/assets/click.mp3').play().catch(()=>{}); }
  const playSpark = () => { if (!soundsOn) return; new Audio('/assets/spark.mp3').play().catch(()=>{}); }
  const playError = () => { if (!soundsOn) return; new Audio('/assets/error_buzz.mp3').play().catch(()=>{}); }

  // Save/Load
  function saveGame() { const s = { mood,timer,step,running,found }; localStorage.setItem('ls_save', JSON.stringify(s)); showHint('সেভ করা হয়েছে'); }
  function loadGame() { const raw = localStorage.getItem('ls_save'); if (!raw) return showHint('কোনো সেভ ফাইল পাওয়া যায় নি'); try{ const s = JSON.parse(raw); setMood(s.mood||0); setTimer(s.timer||90); setStep(s.step||0); setRunning(s.running||false); setFound(s.found||found); showHint('সেভ লোড হয়েছে'); }catch(e){ showHint('সেভ লোডে সমস্যা'); } }

  function formatTime(sec: number){ const m=Math.floor(sec/60).toString().padStart(2,'0'); const s=(sec%60).toString().padStart(2,'0'); return `${m}:${s}`; }

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if(e.key==='s') saveGame();
      if(e.key==='r') { if(confirm('রিসেট করবেন?')) { localStorage.removeItem('ls_save'); window.location.reload(); } }
      if(e.key==='m') setSoundsOn(s=>!s);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Render
  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_20%_10%,#071126_0%,#000_35%)]">
      <div className="w-[92vw] max-w-[1100px] bg-gradient-to-b from-[#02060a] to-[#071426] rounded-xl shadow-2xl overflow-hidden">

        {/* TOP BAR */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-900">
          <div className="flex items-center gap-3">
            <img src="/assets/icon_power.png" alt="logo" className="w-10 h-10 rounded-md drop-shadow-xl" />
            <div>
              <div className="text-cyan-300 font-bold text-lg font-orbitron">লোডশেডিং রিকভারি</div>
              <div className="text-sm text-cyan-100">অসম্পূর্ণ প্রজেক্ট → শেষ ক্লিক বাঁচাবেন?</div>
            </div>
          </div>

          {/* BUTTONS */}
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 rounded-md bg-cyan-400 text-black font-bold" onClick={()=>{ setSoundsOn(s=>!s); if(soundsOn) ambientRef.current?.pause(); else ambientRef.current?.play().catch(()=>{}); }}>
              {soundsOn ? '🎧 সাউন্ড: ON' : '🔇 সাউন্ড: OFF'}
            </button>
            <button className="px-3 py-1 rounded-md bg-transparent border border-cyan-700 text-cyan-200" onClick={saveGame}>💾 সেভ</button>
            <button className="px-3 py-1 rounded-md bg-transparent border border-cyan-700 text-cyan-200" onClick={()=>{ if(confirm('রিসেট করবেন?')){ localStorage.removeItem('ls_save'); window.location.reload(); } }}>♻️ রিসেট</button>
            <button className="px-3 py-1 rounded-md bg-transparent border border-cyan-700 text-cyan-200" onClick={()=>window.open('https://www.facebook.com/ahm.habib.39','_blank')}>
              Developed by AHSAN HABIB
            </button>
          </div>
        </div>

        {/* --- Remaining UI like LEFT HUD, PLAY AREA, OVERLAY --- */}
        {/* Copy the rest of your code as it was, no changes needed here */}

      </div>
    </div>
  );
}

