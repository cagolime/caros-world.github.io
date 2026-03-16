import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Activity, Hand, X, Minus, Sparkles, Zap, Waves, Music, Video, Terminal, AlertTriangle, Eye, Info, Search, Globe, Shield, ChevronDown, HelpCircle } from 'lucide-react';

// --- Specialized Synthesis Engines ---

const playGlassHarp = (ctx, time, output, freq) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, time);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, time);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.2, time + 0.4);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 2.0);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(output);
  osc.start(time);
  osc.stop(time + 2.1);
};

const playLiquidLead = (ctx, time, output, freq) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, time);
  filter.type = 'lowpass';
  filter.Q.value = 15;
  filter.frequency.setValueAtTime(200, time);
  filter.frequency.exponentialRampToValueAtTime(4000, time + 0.1);
  gain.gain.setValueAtTime(0.1, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(output);
  osc.start(time);
  osc.stop(time + 0.2);
};

const playSuperSaw = (ctx, time, output, freq) => {
  const group = ctx.createGain();
  group.gain.setValueAtTime(0.12, time);
  group.gain.exponentialRampToValueAtTime(0.001, time + 0.6);
  
  [0, 8, -8].forEach(detune => {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    osc.detune.setValueAtTime(detune, time);
    osc.connect(group);
    osc.start(time);
    osc.stop(time + 0.6);
  });
  group.connect(output);
};

const playMetalPluck = (ctx, time, output, freq) => {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc1.type = 'square';
  osc2.type = 'sawtooth';
  osc1.frequency.setValueAtTime(freq, time);
  osc2.frequency.setValueAtTime(freq * 1.01, time);

  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2000, time);
  filter.frequency.exponentialRampToValueAtTime(400, time + 0.1);

  gain.gain.setValueAtTime(0.2, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(output);

  osc1.start(time);
  osc2.start(time);
  osc1.stop(time + 0.15);
  osc2.stop(time + 0.15);
};

// --- Classical Synthesis ---

const playViolin = (ctx, time, output, freq) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, time);
  
  // Vibrato
  lfo.frequency.setValueAtTime(5, time);
  lfoGain.gain.setValueAtTime(freq * 0.01, time);
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.15, time + 0.1);
  gain.gain.linearRampToValueAtTime(0.1, time + 0.4);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);
  
  osc.connect(gain);
  gain.connect(output);
  lfo.start(time);
  osc.start(time);
  osc.stop(time + 0.8);
  lfo.stop(time + 0.8);
};

const playPiano = (ctx, time, output, freq) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, time);
  gain.gain.setValueAtTime(0.2, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 1.0);
  osc.connect(gain);
  gain.connect(output);
  osc.start(time);
  osc.stop(time + 1.0);
};

const playFrenchHorn = (ctx, time, output, freq) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, time);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(200, time);
  filter.frequency.exponentialRampToValueAtTime(800, time + 0.2);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.2, time + 0.1);
  gain.gain.linearRampToValueAtTime(0.001, time + 0.6);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(output);
  osc.start(time);
  osc.stop(time + 0.6);
};

const playDrum = (ctx, time, output, type, variant = 'standard') => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  if (type === 'kick') {
    osc.frequency.setValueAtTime(variant === 'brutal' ? 110 : 150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + (variant === 'brutal' ? 0.6 : 0.5));
    gain.gain.setValueAtTime(variant === 'brutal' ? 1.2 : 0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + (variant === 'brutal' ? 0.6 : 0.5));
  } else if (type === 'snare') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(variant === 'fast' ? 300 : 200, time);
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
  }
  
  osc.connect(gain);
  gain.connect(output);
  osc.start(time);
  osc.stop(time + 0.8);
};

const PRESETS = {
  p1: {
    label: "Preset 1: Trance",
    bpm: 138,
    scales: {
      kick: [55, 55],
      hat: [659, 880, 987, 1318],
      clap: [220, 220],
      bass: [55, 55, 65, 73, 55, 55, 49, 41]
    },
    tracks: [
      { id: 'kick', name: 'kick', color: 'bg-[#FF69B4]', engine: 'kick' }, 
      { id: 'hat', name: 'lead', color: 'bg-[#00CED1]', engine: 'supersaw' }, 
      { id: 'clap', name: 'snare', color: 'bg-[#98FF98]', engine: 'snare' }, 
      { id: 'bass', name: 'bass', color: 'bg-[#3D1C02]', engine: 'bass' }, 
    ],
    grid: {
      kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      hat:  [1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1],
      clap: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      bass: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    }
  },
  p2: {
    label: "Preset 2: Ambient",
    bpm: 75,
    scales: {
      kick: [65.4, 87.3],
      hat:  [523.25, 659.25, 783.99, 1046.5],
      clap: [261.63, 329.63],
      bass: [65.41, 65.41, 49.00, 43.65]
    },
    tracks: [
      { id: 'kick', name: 'pulse', color: 'bg-[#00CED1]', engine: 'harp' }, 
      { id: 'hat', name: 'shimmer', color: 'bg-[#FFC0CB]', engine: 'harp' }, 
      { id: 'clap', name: 'glow', color: 'bg-[#98FF98]', engine: 'harp' }, 
      { id: 'bass', name: 'deep', color: 'bg-[#3D1C02]', engine: 'deep-bass' }, 
    ],
    grid: {
      kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      hat:  [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1],
      clap: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
      bass: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    }
  },
  p3: {
    label: "Preset 3: Industrial",
    bpm: 174,
    scales: {
      kick: [150, 150],
      hat: [440, 466, 440, 349],
      clap: [1000, 1000],
      bass: [41.2, 41.2, 41.2, 46.2, 41.2, 41.2, 55.0, 36.7]
    },
    tracks: [
      { id: 'kick', name: 'kick', color: 'bg-[#3D1C02]', engine: 'kick' }, 
      { id: 'hat', name: 'acid', color: 'bg-[#FF69B4]', engine: 'liquid' }, 
      { id: 'clap', name: 'break', color: 'bg-[#00CED1]', engine: 'snare-fast' }, 
      { id: 'bass', name: 'reese', color: 'bg-[#98FF98]', engine: 'bass' }, 
    ],
    grid: {
      kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hat:  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      clap: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      bass: [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0],
    }
  },
  p4: {
    label: "Preset 4: Techno",
    bpm: 128,
    scales: {
      kick: [35, 35],
      hat: [440, 440, 466, 349],
      clap: [880, 880],
      bass: [32.7, 32.7, 36.7, 32.7, 32.7, 32.7, 31.0, 32.7]
    },
    tracks: [
      { id: 'kick', name: 'kick', color: 'bg-[#3D1C02]', engine: 'kick-brutal' }, 
      { id: 'hat', name: 'perc', color: 'bg-[#00CED1]', engine: 'metal-pluck' }, 
      { id: 'clap', name: 'rim', color: 'bg-[#FF69B4]', engine: 'snare' }, 
      { id: 'bass', name: 'sub', color: 'bg-[#98FF98]', engine: 'deep-bass' }, 
    ],
    grid: {
      kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
      hat:  [0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1],
      clap: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      bass: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    }
  },
  p5: {
    label: "Preset 5: Classical",
    bpm: 90,
    scales: {
      kick: [293.66, 329.63, 349.23, 392.00], // D4 Major
      hat: [587.33, 659.25, 698.46, 783.99],
      clap: [440.00, 493.88],
      bass: [146.83, 146.83, 196.00, 174.61]
    },
    tracks: [
      { id: 'kick', name: 'violin', color: 'bg-[#A0522D]', engine: 'violin' }, 
      { id: 'hat', name: 'harp', color: 'bg-[#FFD700]', engine: 'harp' }, 
      { id: 'clap', name: 'piano', color: 'bg-[#FFFFFF]', engine: 'piano' }, 
      { id: 'bass', name: 'horn', color: 'bg-[#CD7F32]', engine: 'horn' }, 
    ],
    grid: {
      kick: [1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 0],
      hat:  [1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
      clap: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0],
      bass: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    }
  }
};

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(138);
  const [currentStep, setCurrentStep] = useState(0);
  const [grid, setGrid] = useState(PRESETS.p1.grid);
  const [tracks, setTracks] = useState(PRESETS.p1.tracks);
  const [activePreset, setActivePreset] = useState('p1');
  const [isTracking, setIsTracking] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [handPresent, setHandPresent] = useState(false);
  const [mixerHandPresent, setMixerHandPresent] = useState(false);
  const [mutes, setMutes] = useState({ kick: false, hat: false, clap: false, bass: false });
  const [showPresetsMenu, setShowPresetsMenu] = useState(false);
  const [showInfoMenu, setShowInfoMenu] = useState(false);
  const [activeQuadrant, setActiveQuadrant] = useState(null);

  const audioCtxRef = useRef(null);
  const nextNoteTimeRef = useRef(0);
  const current16thNoteRef = useRef(0);
  const timerIDRef = useRef(null);
  const notesInQueueRef = useRef([]);

  // FX Nodes
  const masterGainRef = useRef(null);
  const filterNodeRef = useRef(null);
  const crunchNodeRef = useRef(null);
  const cleanPassRef = useRef(null);
  const distortionGainRef = useRef(null);
  const reverbNodeRef = useRef(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraInstRef = useRef(null);
  const handsInstRef = useRef(null);

  const stateRef = useRef({ bpm, grid, mutes, activePreset, isTracking, handPresent, activeQuadrant });
  useEffect(() => {
    stateRef.current = { bpm, grid, mutes, activePreset, isTracking, handPresent, activeQuadrant };
  }, [bpm, grid, mutes, activePreset, isTracking, handPresent, activeQuadrant]);

  // Audio Engine Initialization with FX Chain
  const initAudio = () => {
    if (!audioCtxRef.current) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.8;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 20000;
      filter.Q.value = 1;

      // Parallel crunch routing: signal -> filter -> split(clean vs distortion) -> master
      const crunch = ctx.createWaveShaper();
      const makeDistortionCurve = (amount) => {
        let k = amount, n_samples = 44100, curve = new Float32Array(n_samples), i = 0, x;
        for ( ; i < n_samples; ++i ) {
          x = i * 2 / n_samples - 1;
          curve[i] = ( (3 + k) * x * 20 * (Math.PI / 180) ) / ( Math.PI + k * Math.abs(x) );
        }
        return curve;
      };
      crunch.curve = makeDistortionCurve(400); 

      const cleanPass = ctx.createGain();
      cleanPass.gain.value = 1.0;
      
      const distGain = ctx.createGain();
      distGain.gain.value = 0; // Off by default

      const delay = ctx.createDelay();
      delay.delayTime.value = 0.25;
      const feedback = ctx.createGain();
      feedback.gain.value = 0; 
      delay.connect(feedback);
      feedback.connect(delay);

      // routing chain: source -> filter
      filter.connect(cleanPass);
      filter.connect(crunch);
      crunch.connect(distGain);
      
      cleanPass.connect(masterGain);
      distGain.connect(masterGain);
      
      masterGain.connect(ctx.destination);
      
      filter.connect(delay);
      delay.connect(masterGain);

      masterGainRef.current = masterGain;
      filterNodeRef.current = filter;
      crunchNodeRef.current = crunch;
      cleanPassRef.current = cleanPass;
      distortionGainRef.current = distGain;
      reverbNodeRef.current = feedback;
    }
    return audioCtxRef.current;
  };

  const scheduleNote = useCallback((stepNumber, time) => {
    notesInQueueRef.current.push({ note: stepNumber, time: time });
    const { grid: curGrid, mutes: curMutes, activePreset: curKey } = stateRef.current;
    const ctx = audioCtxRef.current;
    const output = filterNodeRef.current;
    const preset = PRESETS[curKey];

    const getFreq = (trackId) => {
      const scale = preset.scales[trackId];
      return scale[stepNumber % scale.length];
    };

    // Note: preset.tracks indexing matches current tracks array order
    if (curGrid.kick[stepNumber] && !curMutes.kick) {
      const engine = preset.tracks[0].engine;
      if (engine === 'kick') playDrum(ctx, time, output, 'kick');
      if (engine === 'kick-brutal') playDrum(ctx, time, output, 'kick', 'brutal');
      if (engine === 'harp') playGlassHarp(ctx, time, output, getFreq('kick'));
      if (engine === 'violin') playViolin(ctx, time, output, getFreq('kick'));
    }
    if (curGrid.hat[stepNumber] && !curMutes.hat) {
      const engine = preset.tracks[1].engine;
      const freq = getFreq('hat');
      if (engine === 'supersaw') playSuperSaw(ctx, time, output, freq);
      if (engine === 'harp') playGlassHarp(ctx, time, output, freq);
      if (engine === 'liquid') playLiquidLead(ctx, time, output, freq);
      if (engine === 'metal-pluck') playMetalPluck(ctx, time, output, freq);
    }
    if (curGrid.clap[stepNumber] && !curMutes.clap) {
      const engine = preset.tracks[2].engine;
      if (engine === 'snare') playDrum(ctx, time, output, 'snare');
      if (engine === 'snare-fast') playDrum(ctx, time, output, 'snare', 'fast');
      if (engine === 'harp') playGlassHarp(ctx, time, output, getFreq('clap'));
      if (engine === 'piano') playPiano(ctx, time, output, getFreq('clap'));
    }
    if (curGrid.bass[stepNumber] && !curMutes.bass) {
      const engine = preset.tracks[3].engine;
      const freq = getFreq('bass');
      if (engine === 'horn') {
        playFrenchHorn(ctx, time, output, freq);
      } else {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = engine === 'deep-bass' ? 'sine' : 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        g.gain.setValueAtTime(0.3, time);
        g.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        osc.connect(g);
        g.connect(output);
        osc.start(time);
        osc.stop(time + 0.2);
      }
    }
  }, []);

  const scheduler = useCallback(() => {
    while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + 0.1) {
      scheduleNote(current16thNoteRef.current, nextNoteTimeRef.current);
      const secondsPerBeat = 60.0 / stateRef.current.bpm;
      nextNoteTimeRef.current += 0.25 * secondsPerBeat;
      current16thNoteRef.current = (current16thNoteRef.current + 1) % 16;
    }
    timerIDRef.current = setTimeout(scheduler, 25);
  }, [scheduleNote]);

  const startEngine = () => {
    const ctx = initAudio();
    ctx.resume();
    nextNoteTimeRef.current = ctx.currentTime + 0.05;
    scheduler();
    setIsPlaying(true);
  };

  const stopEngine = () => {
    if (timerIDRef.current) clearTimeout(timerIDRef.current);
    setIsPlaying(false);
    setCurrentStep(0);
    current16thNoteRef.current = 0;
    notesInQueueRef.current = [];
  };

  // HAND START LOGIC: Left Hand Mixer
  useEffect(() => {
    if (isTracking) {
      if (mixerHandPresent && !isPlaying) {
        startEngine();
      } else if (!mixerHandPresent && isPlaying) {
        stopEngine();
      }
    }
  }, [mixerHandPresent, isTracking, isPlaying]);

  // Audio Filter Logic
  useEffect(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const fNode = filterNodeRef.current;
    const rNode = reverbNodeRef.current;
    const cleanNode = cleanPassRef.current;
    const distGainNode = distortionGainRef.current;

    // Reset Defaults
    fNode.frequency.setTargetAtTime(20000, ctx.currentTime, 0.1);
    fNode.Q.setTargetAtTime(1, ctx.currentTime, 0.1);
    fNode.type = 'lowpass';
    rNode.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
    cleanNode.gain.setTargetAtTime(1, ctx.currentTime, 0.1);
    distGainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
    
    if (activeQuadrant === 1) { // ECHO: Top Left
      rNode.gain.setTargetAtTime(0.7, ctx.currentTime, 0.1);
    } else if (activeQuadrant === 2) { // CRUNCH: Top Right
      fNode.type = 'bandpass';
      fNode.frequency.setTargetAtTime(1200, ctx.currentTime, 0.1);
      fNode.Q.setTargetAtTime(20, ctx.currentTime, 0.1);
      cleanNode.gain.setTargetAtTime(0, ctx.currentTime, 0.1); 
      distGainNode.gain.setTargetAtTime(1.2, ctx.currentTime, 0.1); 
    } else if (activeQuadrant === 3) { // LOWPASS: Bottom Left
      fNode.frequency.setTargetAtTime(400, ctx.currentTime, 0.1);
    } else if (activeQuadrant === 4) { // RESO: Bottom Right
      fNode.frequency.setTargetAtTime(3000, ctx.currentTime, 0.1);
      fNode.Q.setTargetAtTime(30, ctx.currentTime, 0.1);
    }
  }, [activeQuadrant]);

  useEffect(() => {
    let animationFrame;
    const updateUI = () => {
      if (isPlaying && audioCtxRef.current) {
        const currentTime = audioCtxRef.current.currentTime;
        while (notesInQueueRef.current.length && notesInQueueRef.current[0].time < currentTime) {
          setCurrentStep(notesInQueueRef.current[0].note);
          notesInQueueRef.current.splice(0, 1);
        }
      }
      animationFrame = requestAnimationFrame(updateUI);
    };
    updateUI();
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying]);

  useEffect(() => {
    let camera = null;
    let handsModule = null;

    const setupCamera = async () => {
      if (!isTracking || !videoRef.current) return;

      try {
        handsModule = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        handsModule.setOptions({ 
          maxNumHands: 2, 
          modelComplexity: 1, 
          minDetectionConfidence: 0.5, 
          minTrackingConfidence: 0.5 
        });
        
        handsModule.onResults((results) => {
          if (!canvasRef.current) return;
          const canvasCtx = canvasRef.current.getContext('2d');
          canvasCtx.save();
          canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
          
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            setHandPresent(true);
            let localQuadrant = null;
            let currentMutes = { kick: false, hat: false, clap: false, bass: false };
            let foundMixerHand = false;

            results.multiHandLandmarks.forEach((landmarks, index) => {
              const label = results.multiHandedness[index].label; 
              
              window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, {
                color: label === 'Left' ? '#FF69B4' : '#00CED1', 
                lineWidth: 2
              });
              window.drawLandmarks(canvasCtx, landmarks, {color: '#FFFFFF', lineWidth: 1, radius: 3});
              
              if (label === 'Left') {
                foundMixerHand = true;
                currentMutes = {
                  kick: landmarks[8].y > landmarks[6].y,
                  hat: landmarks[12].y > landmarks[10].y,
                  clap: landmarks[16].y > landmarks[14].y,
                  bass: landmarks[20].y > landmarks[18].y
                };
              } else {
                const x = landmarks[9].x; 
                const y = landmarks[9].y;
                if (x < 0.5 && y < 0.5) localQuadrant = 1;
                else if (x >= 0.5 && y < 0.5) localQuadrant = 2;
                else if (x < 0.5 && y >= 0.5) localQuadrant = 3;
                else if (x >= 0.5 && y >= 0.5) localQuadrant = 4;
              }
            });
            
            setMixerHandPresent(foundMixerHand);
            setMutes(currentMutes);
            setActiveQuadrant(localQuadrant);
          } else {
            setHandPresent(false);
            setMixerHandPresent(false);
            setActiveQuadrant(null);
          }
          canvasCtx.restore();
        });

        camera = new window.Camera(videoRef.current, {
          onFrame: async () => { 
            if (handsModule) await handsModule.send({image: videoRef.current}); 
          },
          width: 320, 
          height: 240
        });

        await camera.start();
        cameraInstRef.current = camera;
        handsInstRef.current = handsModule;
      } catch (err) {
        console.error("Camera setup failed:", err);
      }
    };

    if (isTracking) {
      setupCamera();
    }

    return () => {
      if (camera) camera.stop();
      if (handsModule) handsModule.close();
      setHandPresent(false);
      setMixerHandPresent(false);
      setActiveQuadrant(null);
    };
  }, [isTracking]);

  const toggleTracking = async () => {
    if (isTracking) {
      setIsTracking(false);
      if (isPlaying) stopEngine();
    } else {
      setTrackingLoading(true);
      const loadScript = (src) => new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });

      try {
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');
        setIsTracking(true);
      } catch (e) {
        console.error("Script load failed", e);
      } finally {
        setTrackingLoading(false);
      }
    }
  };

  const applyPreset = (key) => {
    const p = PRESETS[key];
    setGrid(p.grid);
    setTracks(p.tracks);
    setBpm(p.bpm);
    setActivePreset(key);
    setShowPresetsMenu(false);
  };

  return (
    <div className="min-h-screen bg-[#00CED1] text-[#3D1C02] font-sans p-4 flex flex-col items-center justify-center overflow-hidden">
      
      {/* Main Container */}
      <div className="relative w-full max-w-3xl bg-[#F5DEB3] border-t-2 border-l-2 border-white border-b-2 border-r-2 border-[#3D1C02] shadow-[4px_4px_10px_rgba(61,28,2,0.5)] flex flex-col">
        
        {/* Windows Title Bar */}
        <div className="bg-[#FF69B4] text-white px-2 py-1 flex items-center justify-between font-bold text-sm">
          <div className="flex items-center gap-2">
            <Globe size={14} className="text-white" /> 
            <span className="tracking-tight">caro's candy mixer v1 [BETA]</span>
          </div>
          <div className="flex gap-1">
            <div className="w-4 h-4 bg-[#F5DEB3] border-t border-l border-white border-b border-r border-[#3D1C02] flex items-center justify-center text-black cursor-pointer active:shadow-inner"><Minus size={10} /></div>
            <div className="w-4 h-4 bg-[#F5DEB3] border-t border-l border-white border-b border-r border-[#3D1C02] flex items-center justify-center text-black cursor-pointer active:shadow-inner">□</div>
            <div className="w-4 h-4 bg-[#F5DEB3] border-t border-l border-white border-b border-r border-[#3D1C02] flex items-center justify-center text-black font-black cursor-pointer active:shadow-inner hover:bg-[#3D1C02] hover:text-[#98FF98]"><X size={10} /></div>
          </div>
        </div>

        {/* Menu Bar */}
        <div className="relative flex px-2 py-0.5 bg-[#F5DEB3] border-b border-[#3D1C02] gap-1">
          {/* Presets Dropdown */}
          <div className="relative">
            <button 
              onClick={() => { setShowPresetsMenu(!showPresetsMenu); setShowInfoMenu(false); }}
              className={`flex items-center gap-1 px-2 py-0.5 text-xs hover:bg-[#FF69B4] hover:text-white group ${showPresetsMenu ? 'bg-[#FF69B4] text-white' : ''}`}
            >
              <span className="underline decoration-1 underline-offset-2">P</span>resets
              <ChevronDown size={10} className={showPresetsMenu ? 'text-white' : 'text-[#3D1C02] group-hover:text-white'} />
            </button>
            
            {showPresetsMenu && (
              <div className="absolute top-full left-0 z-50 w-48 bg-[#F5DEB3] border-t border-l border-white border-b-2 border-r-2 border-[#3D1C02] shadow-lg">
                {Object.keys(PRESETS).map((key) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className={`w-full text-left px-4 py-1.5 text-xs hover:bg-[#FF69B4] hover:text-white flex items-center justify-between
                      ${activePreset === key ? 'bg-[#98FF98] font-bold' : ''}`}
                  >
                    {PRESETS[key].label}
                    {activePreset === key && <div className="w-2 h-2 rounded-full bg-[#3D1C02]"></div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info Dropdown */}
          <div className="relative">
            <button 
              onClick={() => { setShowInfoMenu(!showInfoMenu); setShowPresetsMenu(false); }}
              className={`flex items-center gap-1 px-2 py-0.5 text-xs hover:bg-[#FF69B4] hover:text-white group ${showInfoMenu ? 'bg-[#FF69B4] text-white' : ''}`}
            >
              <span className="underline decoration-1 underline-offset-2">I</span>nstructions
              <ChevronDown size={10} className={showInfoMenu ? 'text-white' : 'text-[#3D1C02] group-hover:text-white'} />
            </button>
            
            {showInfoMenu && (
              <div className="absolute top-full left-0 z-50 w-64 bg-[#F5DEB3] border-t border-l border-white border-b-2 border-r-2 border-[#3D1C02] shadow-lg p-2">
                <div className="bg-white border-t border-l border-[#3D1C02] border-b border-white border-r border-white p-2 text-[10px] font-mono leading-tight text-[#3D1C02]">
                  welcome to caro's mixer. to use this interface, make sure your browser has access to your camera. when ready, activate the eye, and hold your right palm to the screen. test out lowering and raising different fingers. left hand controls the audio filters. by placing your left hand in different quadrants of the camera, you can switch the filter. your left hand will be useless without the right hand mixer controls. enjoy!
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar + Main Content */}
        <div className="flex flex-col md:flex-row gap-0">
          
          {/* Left Sidebar */}
          <div className="w-full md:w-56 bg-[#F5DEB3] border-r border-[#3D1C02] p-2">
            
            <div className="mb-4 bg-white border-t border-l border-[#3D1C02] p-1 shadow-inner">
               <div className="text-[10px] bg-[#3D1C02] text-[#98FF98] px-1 mb-1 font-bold uppercase tracking-tighter">Status</div>
               <div className="flex flex-col gap-0.5 p-1 font-mono">
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="text-[#3D1C02]/60">ENGINE:</span>
                    <span className={`font-bold ${isPlaying ? 'text-[#FF69B4]' : 'text-[#3D1C02]/40'}`}>{isPlaying ? 'CONNECTED' : 'IDLE'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="text-[#3D1C02]/60">DUAL_HAND:</span>
                    <span className="font-bold text-[#3D1C02]">{isTracking ? 'ENABLED' : 'OFF'}</span>
                  </div>
               </div>
            </div>

            {/* Camera Box */}
            <div className="relative aspect-square w-full bg-[#3D1C02] border-2 border-[#3D1C02] shadow-[inset_2px_2px_4px_rgba(0,0,0,0.8)] overflow-hidden mb-3">
              {!isTracking ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  <div className="w-full border-2 border-[#FF69B4] bg-[#FF69B4]/10 p-2 flex flex-col items-center justify-center text-center">
                    <AlertTriangle size={24} className="text-[#FF69B4] mb-2" />
                    <span className="text-[#FF69B4] text-[10px] font-bold">SIGNAL_LOST</span>
                    <span className="text-[#FF69B4] text-[14px] font-black tracking-widest leading-none">NO CANDY</span>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full grayscale-[0.2] sepia-[0.3]">
                  <video ref={videoRef} className="hidden" playsInline muted></video>
                  <canvas 
                    ref={canvasRef} 
                    width="320" 
                    height="240" 
                    className="w-full h-full scale-x-[-1]"
                    style={{ objectFit: 'cover' }} 
                  ></canvas>
                  
                  <div className="absolute inset-0 p-1 flex flex-col justify-between pointer-events-none font-mono">
                    <div className="flex justify-between">
                      <div className="border-t border-l border-[#98FF98] w-2 h-2"></div>
                      <div className="border-t border-r border-[#98FF98] w-2 h-2"></div>
                    </div>
                    <div className="flex justify-center">
                      <div className="bg-[#98FF98]/40 text-[#3D1C02] px-1 text-[8px] border border-[#98FF98]">
                        {handPresent ? 'SWEET_LOCATED' : 'SCANNING_SUGAR'}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <div className="border-b border-l border-[#98FF98] w-2 h-2"></div>
                      <div className="border-b border-r border-[#98FF98] w-2 h-2"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={toggleTracking} 
              disabled={trackingLoading}
              className={`w-full py-1 text-[11px] font-bold border-t-2 border-l-2 border-white border-b-2 border-r-2 border-[#3D1C02] flex items-center justify-center gap-2 active:shadow-inner active:border-[#3D1C02] active:border-r-white active:border-b-white
                ${isTracking ? 'bg-[#FF69B4] text-white' : 'bg-[#F5DEB3] text-[#3D1C02]'} 
                ${trackingLoading ? 'opacity-50' : ''}`}
            >
              {isTracking ? <Shield size={14} /> : <Video size={14} />}
              {isTracking ? 'SHUTDOWN' : 'ACTIVATE_EYE'}
            </button>
          </div>

          {/* Main Work Area */}
          <div className="flex-1 p-3 bg-[#98FF98]/10 shadow-[inset_1px_1px_2px_rgba(61,28,2,0.3)]">
            
            {/* Audio Filter Display */}
            <div className="mb-2">
              <div className="text-[10px] font-bold text-[#3D1C02]/60 uppercase mb-1 flex items-center gap-1">
                Audio_Filter (Left_Hand_FX)
              </div>
              <div className="grid grid-cols-4 gap-1 p-1 bg-[#F5DEB3] border-t border-l border-[#3D1C02] border-b border-white border-r border-white">
                <div className={`text-[9px] text-center p-1 border border-[#3D1C02]/20 font-mono transition-colors ${activeQuadrant === 1 ? 'bg-[#FF69B4] text-white' : 'bg-white/40 opacity-40'}`}>ECHO</div>
                <div className={`text-[9px] text-center p-1 border border-[#3D1C02]/20 font-mono transition-colors ${activeQuadrant === 2 ? 'bg-[#FF69B4] text-white' : 'bg-white/40 opacity-40'}`}>CRUNCH</div>
                <div className={`text-[9px] text-center p-1 border border-[#3D1C02]/20 font-mono transition-colors ${activeQuadrant === 3 ? 'bg-[#FF69B4] text-white' : 'bg-white/40 opacity-40'}`}>LOWPASS</div>
                <div className={`text-[9px] text-center p-1 border border-[#3D1C02]/20 font-mono transition-colors ${activeQuadrant === 4 ? 'bg-[#FF69B4] text-white' : 'bg-white/40 opacity-40'}`}>RESO</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-4 items-start sm:items-end">
              <div className="flex-1 w-full">
                <div className="text-[10px] font-bold text-[#3D1C02]/60 uppercase mb-1 flex items-center gap-1">
                  Sweet_BPM (Sync)
                </div>
                <div className="bg-[#F5DEB3] border-t border-l border-[#3D1C02] border-b border-white border-r border-white p-2 flex items-center gap-3">
                  <input 
                    type="range" min="60" max="200" value={bpm} 
                    onChange={(e) => setBpm(parseInt(e.target.value))} 
                    className="flex-1 h-1 bg-white border border-[#3D1C02] appearance-none accent-[#FF69B4]" 
                  />
                  <span className="text-xl font-mono font-bold text-[#3D1C02] w-12 text-right">
                    {bpm}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => isPlaying ? stopEngine() : startEngine()}
                  className={`px-4 py-2 text-xs font-bold border-t-2 border-l-2 border-white border-b-2 border-r-2 border-[#3D1C02] flex items-center gap-2
                    ${isPlaying ? 'bg-[#FF69B4] text-white' : 'bg-[#F5DEB3] text-[#3D1C02] active:shadow-inner'}`}
                >
                  {isPlaying ? <Square size={14} /> : <Play size={14} />}
                  {isPlaying ? 'STOP' : 'PLAY'}
                </button>
              </div>
            </div>

            {/* Matrix (The Grid) */}
            <div className="bg-white border-t-2 border-l-2 border-[#3D1C02] border-b border-white border-r border-white p-3 shadow-inner overflow-x-auto">
              <div className="mb-2 text-[10px] font-mono font-bold text-[#FF69B4] flex justify-between uppercase">
                <span>Mixer_Output: {PRESETS[activePreset].label}</span>
                <span>Right_Hand_Control</span>
              </div>
              <div className="min-w-[440px] space-y-2">
                {tracks.map((track) => (
                  <div key={track.id} className="flex items-center gap-2">
                    <div className="w-14">
                      <span className={`text-[8px] font-mono font-bold p-1 block border border-[#F5DEB3] text-center
                        ${mutes[track.id] ? 'bg-[#3D1C02] text-[#F5DEB3]' : 'bg-[#00CED1] text-white shadow-sm'}`}>
                        {track.name.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 flex gap-1">
                      {grid[track.id].map((isActive, idx) => (
                        <button 
                          key={idx}
                          onMouseDown={() => {
                            const newGrid = {...grid};
                            newGrid[track.id][idx] = isActive ? 0 : 1;
                            setGrid(newGrid);
                          }}
                          className={`flex-1 aspect-square border-t border-l border-white border-b border-r border-[#3D1C02] transition-all duration-75
                            ${idx % 4 === 0 ? 'border-[#FF69B4]/30' : ''}
                            ${isActive 
                              ? (track.color + ' shadow-[1px_1px_2px_rgba(61,28,2,0.5)] scale-105 z-10') 
                              : 'bg-[#F5DEB3]/30 hover:bg-[#FF69B4]/10'}
                            ${currentStep === idx && isPlaying ? 'ring-2 ring-[#98FF98] ring-inset brightness-110' : ''}
                          `}
                        ></button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-3 flex justify-between items-center text-[10px] font-bold text-[#3D1C02]/50 uppercase">
              <div className="flex gap-4">
                <span className="flex items-center gap-1 bg-[#F5DEB3] px-2 py-0.5 border border-[#3D1C02]"><Info size={10} /> Mode: {isTracking ? 'DUAL_HAND' : 'MOUSE'}</span>
              </div>
              <button 
                onClick={() => setGrid({kick: Array(16).fill(0), hat: Array(16).fill(0), clap: Array(16).fill(0), bass: Array(16).fill(0)})}
                className="bg-[#F5DEB3] px-4 py-1 border-t border-l border-white border-b border-r border-[#3D1C02] hover:bg-[#FFC0CB] active:shadow-inner active:border-[#3D1C02] active:border-r-white active:border-b-white transition-colors"
              >
                Reset_Grid
              </button>
            </div>
          </div>
        </div>

        {/* System Bar */}
        <div className="bg-[#F5DEB3] border-t-2 border-white px-1 py-1 flex justify-between items-center text-[10px] font-sans">
          <div className="flex gap-1 items-center">
            <div className="bg-[#F5DEB3] border-t border-l border-white border-b-2 border-r-2 border-[#3D1C02] px-2 py-0.5 font-bold italic flex items-center gap-1 cursor-pointer hover:bg-[#98FF98]">
               <Terminal size={12} /> Start
            </div>
            <div className="w-px h-4 bg-[#3D1C02]/20 mx-1"></div>
            <div className="flex gap-1">
               <div className="bg-[#98FF98]/20 border border-[#3D1C02]/20 px-3 py-0.5 shadow-inner flex items-center gap-1 text-[9px] font-mono text-[#3D1C02]">
                  {isPlaying ? 'CHURNING...' : 'PAUSED'}
               </div>
            </div>
          </div>
          
          <div className="bg-[#F5DEB3] border-t border-l border-[#3D1C02]/20 border-b border-white border-r border-white px-2 py-0.5 flex items-center gap-2">
            <span className="font-mono text-[10px]">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>

      {/* Retro Disclaimer */}
      <div className="mt-6 text-[9px] font-mono opacity-60 text-[#3D1C02] max-w-lg text-center leading-tight">
        BEST VIEWED IN INTERNET EXPLORER 3.0 CANDY EDITION. <br/>
        CANDY COATED TECHNOLOGY BY CARO.
      </div>
    </div>
  );
}