import { useState, useEffect, useRef } from 'react';
import { analyzeDrivingSession } from '../lib/api';
import { Gamepad2, AlertTriangle, Gauge } from 'lucide-react';
import { PRESET_MAPS } from '../lib/maps';

export default function InteractiveDriving() {
    const canvasRef = useRef(null);
    const requestRef = useRef();
    const [telemetry, setTelemetry] = useState({ speed: 0, fps: 0, surface: 'Road' });
    const [isRecording, setIsRecording] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const telemetryLog = useRef([]);
    const frameCount = useRef(0);
    const isRecordingRef = useRef(false);

    // Analysis State
    const [analysis, setAnalysis] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleAnalyze = async () => {
        setIsLoading(true);
        try {
            // Send max 600 frames (60 seconds) to avoid token limits? 
            // Or backend handles it? Backend summarizes. 
            // 264 samples is fine. 
            const response = await analyzeDrivingSession(telemetryLog.current);
            setAnalysis(response.data);
        } catch (e) {
            console.error(e);
            alert("Analysis failed. check backend logs.");
        } finally {
            setIsLoading(false);
        }
    };

    // Game Rules State
    const sessionStats = useRef({
        startTime: 0,
        score: 100,
        safety: 100, // Reduced by collisions/off-track
        collisions: 0,
        offTrackFrames: 0,
        harshBraking: 0,
        distance: 0,
        topSpeed: 0
    });
    const [liveScore, setLiveScore] = useState(100);

    // Physics State (Mutable for performance)
    const physics = useRef({
        x: 400,
        y: 500,
        vx: 0,
        vy: 0,
        angle: -Math.PI / 2, // Facing Up
        speed: 0,
        steeringAngle: 0,
        throttle: 0,
        brake: 0,
        friction: 0.98
    });

    // Input State
    const input = useRef({
        up: false,
        down: false,
        left: false,
        right: false,
        boost: false
    });

    // Configuration
    const [currentMap, setCurrentMap] = useState('oval');
    const [gameMode, setGameMode] = useState('benchmark'); // 'benchmark', 'safety', 'time_trial', 'hazard'
    const [editorMode, setEditorMode] = useState(false);
    const [editorTool, setEditorTool] = useState('brush'); // 'brush', 'waypoint'
    const [editorData, setEditorData] = useState({
        name: 'My Track',
        strokes: [], // {x, y, r}
        waypoints: [],
        start: { x: 400, y: 300, angle: 0 },
        finish: null
    });
    const [customMaps, setCustomMaps] = useState(() => {
        // Load from LocalStorage
        const saved = localStorage.getItem('aumovio_maps');
        if (!saved) return {};
        const data = JSON.parse(saved);
        const hydrated = {};
        Object.entries(data).forEach(([key, d]) => {
            hydrated[key] = {
                ...d,
                draw: (ctx) => {
                    ctx.fillStyle = '#1e293b';
                    ctx.fillRect(0, 0, 1000, 800);
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.lineWidth = 140;
                    ctx.strokeStyle = '#334155';
                    if (d.strokes) {
                        d.strokes.forEach(s => {
                            if (s.length < 2) return;
                            ctx.beginPath();
                            ctx.moveTo(s[0].x, s[0].y);
                            for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x, s[i].y);
                            ctx.stroke();
                        });
                    }
                    // Waypoints
                    if (d.waypoints) {
                        ctx.fillStyle = '#fbbf24';
                        d.waypoints.forEach((wp, i) => {
                            ctx.beginPath();
                            ctx.arc(wp.x, wp.y, 5, 0, Math.PI * 2);
                            ctx.fill();
                        });
                    }
                }
            };
        });
        return hydrated;
    });

    const [lapData, setLapData] = useState({ current: 0, best: 0, count: 0 });
    const lastLapTime = useRef(0);
    const lastPos = useRef({ x: 0, y: 0 });

    const rivals = useRef([]); // Array of rival objects
    const mapsRef = useRef({}); // Will be synced with PRESET + Custom
    const isDrawing = useRef(false);
    const currentStroke = useRef([]); // Points in current stroke



    // Helper: Line Intersection
    const intersect = (x1, y1, x2, y2, x3, y3, x4, y4) => {
        const den = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
        if (den === 0) return false;
        const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / den;
        const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / den;
        return (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1);
    };
    const CONFIG = {
        ACCEL: 0.13,
        BRAKE: 0.35,
        FRICTION_ROAD: 0.98,
        FRICTION_GRASS: 0.90,
        TURN_SPEED: 0.05,
        MAX_SPEED: 8.0
    };
    // Sync Maps Ref
    mapsRef.current = { ...PRESET_MAPS, ...customMaps };

    useEffect(() => {
        // Input Listeners
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowUp' || e.key === 'w') input.current.up = true;
            if (e.key === 'ArrowDown' || e.key === 's') input.current.down = true;
            if (e.key === 'ArrowLeft' || e.key === 'a') input.current.left = true;
            if (e.key === 'ArrowRight' || e.key === 'd') input.current.right = true;
            if (e.code === 'Space') input.current.boost = true;
        };

        const handleKeyUp = (e) => {
            if (e.key === 'ArrowUp' || e.key === 'w') input.current.up = false;
            if (e.key === 'ArrowDown' || e.key === 's') input.current.down = false;
            if (e.key === 'ArrowLeft' || e.key === 'a') input.current.left = false;
            if (e.key === 'ArrowRight' || e.key === 'd') input.current.right = false;
            if (e.code === 'Space') input.current.boost = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Start Loop
        requestRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            cancelAnimationFrame(requestRef.current);
        };
    }, []);

    // Editor Mouse Listeners
    useEffect(() => {
        if (!editorMode) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const getPos = (e) => {
            const rect = canvas.getBoundingClientRect();
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };

        const onDown = (e) => {
            const p = getPos(e);
            if (editorTool === 'waypoint') {
                setEditorData(prev => ({ ...prev, waypoints: [...prev.waypoints, p] }));
                return;
            }
            isDrawing.current = true;
            currentStroke.current = [p];
        };
        const onMove = (e) => {
            if (editorTool === 'waypoint') return;
            if (!isDrawing.current) return;
            const p = getPos(e);
            const last = currentStroke.current[currentStroke.current.length - 1];
            if (!last || Math.abs(p.x - last.x) > 5 || Math.abs(p.y - last.y) > 5) {
                currentStroke.current.push(p);
            }
        };
        const onUp = (e) => {
            if (editorTool === 'waypoint') return;
            if (!isDrawing.current) return;
            isDrawing.current = false;
            setEditorData(prev => ({
                ...prev,
                strokes: [...prev.strokes, [...currentStroke.current]]
            }));
            currentStroke.current = [];
        };

        canvas.addEventListener('mousedown', onDown);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);

        return () => {
            canvas.removeEventListener('mousedown', onDown);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [editorMode, editorTool]);


    const animate = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const p = physics.current;

        // 1. Draw Map (and clear previous frame)
        if (editorMode) {
            // Editor Render
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Strokes
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 140;
            ctx.strokeStyle = '#334155'; // Darker Road

            editorData.strokes.forEach(stroke => {
                if (stroke.length < 2) return;
                ctx.beginPath();
                ctx.moveTo(stroke[0].x, stroke[0].y);
                for (let i = 1; i < stroke.length; i++) {
                    ctx.lineTo(stroke[i].x, stroke[i].y);
                }
                ctx.stroke();
            });

            // Draw Current Stroke (if drawing)
            if (currentStroke.current.length > 1) {
                ctx.beginPath();
                ctx.moveTo(currentStroke.current[0].x, currentStroke.current[0].y);
                for (let i = 1; i < currentStroke.current.length; i++) {
                    ctx.lineTo(currentStroke.current[i].x, currentStroke.current[i].y);
                }
                ctx.strokeStyle = '#475569'; // Lighter Road (preview)
                ctx.stroke();
            }

            // Draw Waypoints
            ctx.fillStyle = '#fbbf24';
            editorData.waypoints.forEach((wp, i) => {
                ctx.beginPath();
                ctx.arc(wp.x, wp.y, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.font = '10px monospace';
                ctx.fillText(i, wp.x + 8, wp.y);
            });

            // Finish Line (if defined)
            if (editorData.finish) {
                // Draw line
            }

            return; // Stop here for editor
        }

        if (mapsRef.current[currentMap]) {
            mapsRef.current[currentMap].draw(ctx, canvas.width, canvas.height);
        }

        // 2. Surface Detection
        // Get pixel color at car center
        // Note: getImageData is expensive, do it sparingly or optimize? 
        // For MVP, we do it every frame.
        try {
            const pixel = ctx.getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data;
            if (pixel[0] < 60) {
                p.friction = CONFIG.FRICTION_GRASS;
                setTelemetry(prev => ({ ...prev, surface: 'Grass (Low Grip)' }));
                // Rules: Off Track
                if (Math.abs(p.speed) > 1) { // Only penalty if moving
                    sessionStats.current.offTrackFrames++;
                    sessionStats.current.safety -= 0.1;
                }
            } else {
                p.friction = CONFIG.FRICTION_ROAD;
                setTelemetry(prev => ({ ...prev, surface: 'Tarmac (100%)' }));
                // Recovery (Bonus for clean driving)
                if (Math.abs(p.speed) > 2 && sessionStats.current.safety < 100) {
                    sessionStats.current.safety += 0.01;
                }
            }
        } catch (e) {
            // Off canvas
        }

        // 3. Update Physics (Player)
        if (input.current.up) p.speed += CONFIG.ACCEL;
        if (input.current.down) p.speed -= CONFIG.BRAKE;
        if (input.current.boost) p.speed += CONFIG.ACCEL * 2;

        // Rivals Logic
        if (gameMode === 'time_trial') {
            rivals.current = [];
        } else if (mapsRef.current[currentMap] && mapsRef.current[currentMap].waypoints) {
            // Init if empty (on map load)
            if (rivals.current.length === 0) {
                rivals.current = [
                    { x: 400, y: 500, rx: 0, ry: 0, wpIndex: 0, speed: 0, angle: 0, color: '#3b82f6' },
                    { x: 300, y: 500, rx: 0, ry: 0, wpIndex: 0, speed: 0, angle: 0, color: '#10b981' }
                ];
                // Use Map Start if available
                if (mapsRef.current[currentMap].start) {
                    rivals.current[0].x = mapsRef.current[currentMap].start.x - 50;
                    rivals.current[0].y = mapsRef.current[currentMap].start.y;
                    rivals.current[1].x = mapsRef.current[currentMap].start.x - 100;
                    rivals.current[1].y = mapsRef.current[currentMap].start.y;
                }
            }

            const waypoints = mapsRef.current[currentMap].waypoints;
            rivals.current.forEach(r => {
                // Target Waypoint
                const wp = waypoints[r.wpIndex];
                const dx = wp.x - r.x;
                const dy = wp.y - r.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Steering
                const targetAngle = Math.atan2(dy, dx);

                // Smooth Turn Logic
                let diff = targetAngle - r.angle;
                while (diff <= -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;

                const maxTurn = 0.08;
                if (Math.abs(diff) > maxTurn) {
                    r.angle += Math.sign(diff) * maxTurn;
                    r.speed *= 0.96; // Brake in sharp turns
                } else {
                    r.angle = targetAngle;
                    if (r.speed < CONFIG.MAX_SPEED * 0.9) r.speed += CONFIG.ACCEL * 0.4;
                }

                // Move
                r.x += Math.cos(r.angle) * r.speed;
                r.y += Math.sin(r.angle) * r.speed;

                // Check Waypoint Reached
                if (dist < 60) {
                    r.wpIndex = (r.wpIndex + 1) % waypoints.length;
                }
            });
        }

        // Friction
        p.speed *= p.friction;

        // Max Speed Cap
        if (Math.abs(p.speed) > CONFIG.MAX_SPEED) {
            p.speed = Math.sign(p.speed) * CONFIG.MAX_SPEED;
        }

        // Steering (Only turns if moving)
        if (Math.abs(p.speed) > 0.1) {
            if (input.current.left) p.angle -= CONFIG.TURN_SPEED * Math.sign(p.speed);
            if (input.current.right) p.angle += CONFIG.TURN_SPEED * Math.sign(p.speed);
        }

        // Velocity Vector
        p.vx = Math.cos(p.angle) * p.speed;
        p.vy = Math.sin(p.angle) * p.speed;

        p.x += p.vx;
        p.y += p.vy;

        // Bounds Checking (Wrap around)
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // 4. Collision Check (Rivals)
        rivals.current.forEach(r => {
            const dx = p.x - r.x;
            const dy = p.y - r.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 30) {
                // Collision!
                if (Math.abs(p.speed) > 1) {
                    p.speed *= -0.5; // Bounce / Impact
                    p.x -= Math.cos(p.angle) * 5; // Rebound
                    p.y -= Math.sin(p.angle) * 5;

                    sessionStats.current.collisions++;
                    sessionStats.current.safety -= 10;

                    if (gameMode === 'safety' && isRecordingRef.current) {
                        // Fail immediately
                        setIsRecording(false);
                        isRecordingRef.current = false;
                        setShowReport(true);
                        setAnalysis({
                            safety_score: 0,
                            analysis_text: "CERTIFICATION FAILED: Collision detected.",
                            coach_tip: "In Safety Certification, any collision results in immediate failure. Maintain safe distance."
                        });
                    }
                }
            }
        });

        // Clamp Safety Score
        if (sessionStats.current.safety < 0) sessionStats.current.safety = 0;
        sessionStats.current.score = Math.floor(sessionStats.current.safety);

        // Draw Rivals
        rivals.current.forEach(r => {
            ctx.save();
            ctx.translate(r.x, r.y);
            ctx.rotate(r.angle);
            ctx.fillStyle = r.color;
            ctx.fillRect(-15, -8, 30, 16);
            ctx.restore();
        });

        // 4. Draw Car (Player)
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        // Shadows
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;

        // Body
        ctx.fillStyle = '#ef4444'; // Red Car
        ctx.fillRect(-15, -8, 30, 16);

        // Windshield
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(2, -7, 6, 14);

        // Headlights
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(14, -7, 4, 4);
        ctx.fillRect(14, 3, 4, 4);

        ctx.restore();

        // 5. Update Telemetry UI (throttled)

        frameCount.current++;
        if (frameCount.current % 6 === 0) { // 10Hz log
            if (isRecordingRef.current) {
                telemetryLog.current.push({
                    t: Date.now(),
                    speed: p.speed,
                    angle: p.angle,
                    surface: telemetry.surface,
                    input: { ...input.current }
                });
            }
            // Update UI less frequently (every 10 frames)
            if (frameCount.current % 10 === 0) {
                setTelemetry(prev => ({
                    ...prev,
                    speed: Math.abs(p.speed * 10).toFixed(0)
                }));
                // Live Score Update
                setLiveScore(Math.floor(sessionStats.current.score));
            }
        }

        // Lap Timing Check
        const currentMapObj = mapsRef.current[currentMap];
        if (currentMapObj && currentMapObj.finishLine) {
            const { x1, y1, x2, y2 } = currentMapObj.finishLine;
            // Check cross
            if (intersect(lastPos.current.x, lastPos.current.y, p.x, p.y, x1, y1, x2, y2)) {
                const now = Date.now();
                if (lastLapTime.current > 0) {
                    const lapTime = (now - lastLapTime.current) / 1000;
                    if (lapTime > 1.0) { // Debounce (min lap 1s)
                        setLapData(prev => ({
                            count: prev.count + 1,
                            current: lapTime,
                            best: (prev.best === 0 || lapTime < prev.best) ? lapTime : prev.best
                        }));
                        lastLapTime.current = now;
                    }
                } else {
                    // Start Line Crossed
                    lastLapTime.current = now;
                    setLapData(prev => ({ ...prev, count: 0 })); // Start lap 0? Or 1?
                }
            }
        }

        lastPos.current = { x: p.x, y: p.y };



        lastPos.current = { x: p.x, y: p.y };

        requestRef.current = requestAnimationFrame(animate);
    };

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                        <Gamepad2 className="w-8 h-8 text-primary" />
                        Interactive Driving Simulator
                    </h1>
                    <p className="text-gray-400">Manual control mode for human baseline data collection</p>
                </div>
                <div className="flex gap-4 items-center">
                    <select
                        value={currentMap}
                        onChange={(e) => {
                            const mapKey = e.target.value;
                            if (mapKey === 'create_new') {
                                setEditorMode(true);
                                setEditorData({
                                    name: `Custom Map ${Object.keys(customMaps).length + 1}`,
                                    strokes: [],
                                    waypoints: [],
                                    start: { x: 400, y: 300, angle: 0 },
                                    finish: null
                                });
                                return;
                            }
                            setEditorMode(false);
                            setCurrentMap(mapKey);
                            const m = mapsRef.current[mapKey];
                            if (physics.current && m) {
                                physics.current.x = m.start.x;
                                physics.current.y = m.start.y;
                                physics.current.angle = m.start.angle;
                                physics.current.speed = 0;
                            }
                            // Reset Logs
                            telemetryLog.current = [];
                            rivals.current = []; // Reset Rivals
                            setAnalysis(null);
                        }}
                        className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-gray-300 font-mono focus:outline-none focus:border-primary"
                        disabled={isRecording}
                    >
                        {Object.entries(mapsRef.current).map(([key, map]) => (
                            <option key={key} value={key}>{map.name}</option>
                        ))}
                        <option value="create_new" className="text-primary font-bold">+ Create New Map</option>
                    </select>
                    <select
                        value={gameMode}
                        onChange={(e) => setGameMode(e.target.value)}
                        className="bg-card border border-border rounded-lg px-3 py-2 text-sm text-gray-300 font-mono focus:outline-none focus:border-primary"
                        disabled={isRecording}
                    >
                        <option value="benchmark">AI Benchmark</option>
                        <option value="safety">Safety Certification</option>
                        <option value="time_trial">Time Trial</option>
                        <option value="hazard">Hazard Survival</option>
                    </select>
                    <button
                        onClick={() => {
                            if (isRecording) {
                                setIsRecording(false);
                                isRecordingRef.current = false;
                                setShowReport(true);
                            } else {
                                telemetryLog.current = [];
                                setAnalysis(null); // Reset analysis
                                setIsRecording(true);
                                isRecordingRef.current = true;
                            }
                        }}
                        className={`px-4 py-2 rounded-lg font-bold transition-all ${isRecording ? 'bg-danger animate-pulse' : 'bg-primary'}`}
                    >
                        {isRecording ? 'STOP REC' : 'START REC'}
                    </button>
                    <div className="glass-card px-4 py-2 flex items-center gap-3">
                        <Gauge className="w-5 h-5 text-secondary" />
                        <div>
                            <div className="text-xs text-gray-400">SPEED</div>
                            <div className="text-xl font-mono font-bold">{telemetry.speed} km/h</div>
                        </div>
                    </div>
                    <div className="glass-card px-4 py-2 flex items-center gap-3">
                        <AlertTriangle className={`w-5 h-5 ${telemetry.surface.includes('Grass') ? 'text-warning animate-pulse' : 'text-success'}`} />
                        <div>
                            <div className="text-xs text-gray-400">SURFACE</div>
                            <div className="text-sm font-mono font-bold">{telemetry.surface}</div>
                        </div>
                    </div>

                    {/* Lap Timer */}
                    <div className="glass-card px-4 py-2 flex items-center gap-3">
                        <div className="text-right">
                            <div className="text-xs text-gray-400">LAP {lapData.count}</div>
                            <div className="text-xl font-mono font-bold text-primary">
                                {lapData.current.toFixed(2)}s
                            </div>
                        </div>
                        <div className="text-right border-l border-white/10 pl-3">
                            <div className="text-xs text-gray-400">BEST</div>
                            <div className="text-sm font-mono text-secondary">
                                {lapData.best > 0 ? lapData.best.toFixed(2) : '--.--'}s
                            </div>
                        </div>
                    </div>

                    {/* Score Panel */}
                    <div className="glass-card px-4 py-2 flex items-center gap-3 border-l-2 border-primary/50">
                        <div className="text-right">
                            <div className="text-xs text-secondary font-bold tracking-wider">SAFETY SCORE</div>
                            <div className={`text-2xl font-mono font-black ${liveScore < 60 ? 'text-danger' : liveScore < 80 ? 'text-warning' : 'text-success'}`}>
                                {liveScore}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Editor Overlay */}
            {editorMode && (
                <div className="absolute inset-0 pointer-events-none z-50">
                    <div className="absolute top-4 left-4 pointer-events-auto bg-card p-4 rounded-xl border border-border shadow-xl">
                        <h3 className="font-bold mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            Map Editor
                        </h3>
                        <div className="space-y-2 mb-4">
                            <div className="text-xs text-gray-400">TOOLS</div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setEditorTool('brush')}
                                    className={`flex-1 py-1 text-xs rounded border ${editorTool === 'brush' ? 'bg-primary border-primary text-white' : 'border-gray-600 text-gray-400'}`}
                                >
                                    Brush
                                </button>
                                <button
                                    onClick={() => setEditorTool('waypoint')}
                                    className={`flex-1 py-1 text-xs rounded border ${editorTool === 'waypoint' ? 'bg-secondary border-secondary text-white' : 'border-gray-600 text-gray-400'}`}
                                >
                                    Waypoint
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <button onClick={() => setEditorData(p => ({ ...p, strokes: [], waypoints: [] }))} className="block w-full text-xs bg-gray-700 hover:bg-gray-600 px-2 py-2 rounded transition-colors">Clear All</button>
                            <button onClick={() => {
                                // Save Logic
                                const id = `custom_${Date.now()}`;
                                const newMap = {
                                    name: editorData.name,
                                    start: editorData.start,
                                    strokes: editorData.strokes, // Important for save
                                    waypoints: editorData.waypoints,
                                    finishLine: null, // User didn't define finish line in MVP
                                    draw: (ctx) => {
                                        // Redraw Logic (Duplicate of hydration)
                                        // Simplify: Just clear and draw strokes/waypoints
                                        ctx.fillStyle = '#1e293b';
                                        ctx.fillRect(0, 0, 1000, 800);
                                        ctx.lineCap = 'round';
                                        ctx.lineJoin = 'round';
                                        ctx.lineWidth = 140;
                                        ctx.strokeStyle = '#334155';
                                        if (editorData.strokes) {
                                            editorData.strokes.forEach(s => {
                                                if (s.length < 2) return;
                                                ctx.beginPath();
                                                ctx.moveTo(s[0].x, s[0].y);
                                                for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x, s[i].y);
                                                ctx.stroke();
                                            });
                                        }
                                        // Waypoints
                                        if (editorData.waypoints) {
                                            ctx.fillStyle = '#fbbf24';
                                            editorData.waypoints.forEach((wp, i) => {
                                                ctx.beginPath();
                                                ctx.arc(wp.x, wp.y, 5, 0, Math.PI * 2);
                                                ctx.fill();
                                            });
                                        }
                                    }
                                };

                                setCustomMaps(prev => {
                                    const next = { ...prev, [id]: newMap };
                                    // Save Data Only to LS
                                    const toSave = {};
                                    Object.entries(next).forEach(([k, v]) => {
                                        toSave[k] = {
                                            name: v.name,
                                            start: v.start,
                                            strokes: v.strokes,
                                            waypoints: v.waypoints
                                        };
                                    });
                                    localStorage.setItem('aumovio_maps', JSON.stringify(toSave));
                                    return next;
                                });

                                setEditorMode(false);
                                setCurrentMap(id);
                                // Trigger sync in effect
                            }} className="block w-full text-xs bg-primary hover:bg-primary/90 px-2 py-2 rounded font-bold transition-all transform active:scale-95">Save & Play</button>
                            <button onClick={() => setEditorMode(false)} className="block w-full text-xs bg-danger/20 text-danger border border-danger/50 hover:bg-danger/30 px-2 py-2 rounded transition-colors">Cancel</button>
                        </div>
                    </div>

                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur px-4 py-2 rounded-full text-sm text-white">
                        {editorTool === 'brush' ? 'Drag to paint road' : 'Click to place AI waypoints'}
                    </div>
                </div>
            )}

            {/* Session Report Modal */}
            {
                showReport && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                        <div className="bg-card border border-border p-8 rounded-2xl max-w-md w-full animate-in fade-in zoom-in">
                            <h2 className="text-2xl font-bold mb-4">Driving Session Report</h2>
                            <div className="space-y-4 mb-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="metric-card">
                                        <span className="text-gray-400">Duration</span>
                                        <div className="text-xl font-mono">{(telemetryLog.current.length / 60).toFixed(1)}s</div>
                                    </div>
                                    <div className="metric-card">
                                        <span className="text-gray-400">Max Speed</span>
                                        <div className="text-xl font-mono">
                                            {telemetryLog.current.length > 0
                                                ? Math.max(...telemetryLog.current.map(d => Math.abs(d.speed * 10))).toFixed(0)
                                                : 0} km/h
                                        </div>
                                    </div>
                                </div>

                                <div className="metric-card bg-black/40 border-l-4 border-primary">
                                    <span className="text-gray-400">Safety Score</span>
                                    <div className={`text-xl font-mono font-bold ${sessionStats.current.score >= 80 ? 'text-success' : 'text-warning'}`}>
                                        {sessionStats.current.score}/100
                                    </div>
                                </div>
                                <div className="metric-card bg-black/40 border-l-4 border-danger">
                                    <span className="text-danger font-bold text-xs uppercase">Penalties</span>
                                    <div className="text-sm font-mono text-gray-300">
                                        Collisions: {sessionStats.current.collisions}<br />
                                        Off-Track: {(sessionStats.current.offTrackFrames / 60).toFixed(1)}s
                                    </div>
                                </div>
                            </div>

                            {analysis && (
                                <div className="mb-4 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="bg-primary/10 border border-primary/30 p-4 rounded-xl">
                                        <div className="flex justify-between items-end mb-2">
                                            <h3 className="font-bold text-primary flex items-center gap-2">
                                                AI COACH FEEDBACK
                                            </h3>
                                            <div className="text-2xl font-bold">{analysis.safety_score}/100 Safe</div>
                                        </div>
                                        <p className="text-sm text-gray-300 mb-3 italic">"{analysis.analysis_text}"</p>
                                        <div className="bg-black/40 p-3 rounded-lg border-l-4 border-secondary">
                                            <div className="text-xs text-gray-500 uppercase font-bold mb-1">PRO TIP</div>
                                            <p className="text-sm text-secondary font-medium">{analysis.coach_tip}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowReport(false)}
                                    className="flex-1 py-3 bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                                {!analysis && (
                                    <button
                                        onClick={handleAnalyze}
                                        disabled={isLoading}
                                        className="flex-1 py-3 bg-primary hover:bg-primary/90 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Analyzing...
                                            </>
                                        ) : (
                                            'Send to AI Coach'
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            <div className="flex-1 bg-black rounded-xl overflow-hidden relative border border-gray-800 shadow-2xl">
                <canvas
                    ref={canvasRef}
                    width={1000}
                    height={600}
                    className="w-full h-full object-contain"
                />

                {/* Controls HUD */}
                <div className="absolute bottom-6 right-6 flex flex-col items-center gap-2 pointer-events-none opacity-50">
                    <div className="w-10 h-10 border border-white rounded flex items-center justify-center font-bold">W</div>
                    <div className="flex gap-2">
                        <div className="w-10 h-10 border border-white rounded flex items-center justify-center font-bold">A</div>
                        <div className="w-10 h-10 border border-white rounded flex items-center justify-center font-bold">S</div>
                        <div className="w-10 h-10 border border-white rounded flex items-center justify-center font-bold">D</div>
                    </div>
                </div>

                {/* Physics Info */}
                <div className="absolute top-6 left-6 pointer-events-none">
                    <div className="bg-black/50 p-3 rounded-lg backdrop-blur-sm text-xs font-mono space-y-1">
                        <div className="text-gray-400">PHYSICS ENGINE V1.0</div>
                        <div>VECTOR MODE: ENABLED</div>
                        <div>COLOR DETECTION: ACTIVE</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="metric-card bg-primary/10 border-primary/20">
                    <h3 className="text-sm font-bold text-primary mb-1">CONTROLS</h3>
                    <p className="text-xs text-gray-400">WASD to Drive • SPACE for Boost</p>
                </div>
                <div className="metric-card">
                    <h3 className="text-sm font-bold mb-1">MAP: BEGINNER OVAL</h3>
                    <p className="text-xs text-gray-400">High friction tarmac with grass run-off areas.</p>
                </div>
                <div className="metric-card">
                    <h3 className="text-sm font-bold mb-1">AI COACH</h3>
                    <p className="text-xs text-gray-400">Recording telemetry for analysis...</p>
                </div>
            </div>
        </div >
    );
}
