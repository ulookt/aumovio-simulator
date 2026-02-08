import { useState, useRef, useEffect } from 'react';
import {
    MousePointer, Brush, Eraser, TrafficCone, Lightbulb,
    Octagon, Users, Play, Save, Settings, ZoomIn, ZoomOut
} from 'lucide-react';

export default function ScenarioBuilder() {
    // Canvas & State
    const canvasRef = useRef(null);
    const [tool, setTool] = useState('select'); // select, road, eraser, light, stop, ped
    const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
    const [isPreviewing, setIsPreviewing] = useState(false);

    // Scenario Data
    const [scenario, setScenario] = useState({
        name: 'New Scenario',
        strokes: [], // Renamed from roads to match InteractiveDriving
        objects: []
    });

    // Config
    const [config, setConfig] = useState({
        gridSize: 50,
        snap: true,
        showGrid: true
    });

    // Drawing Ref (for current stroke)
    const currentPath = useRef([]);
    const isDrawing = useRef(false);
    const agents = useRef([]); // Simulation Agents

    // Render Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;

        const render = () => {
            // Resize (Responsive)
            if (canvas.width !== canvas.parentElement.clientWidth || canvas.height !== canvas.parentElement.clientHeight) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight;
            }

            const { width, height } = canvas;

            // Clear
            ctx.fillStyle = '#0f172a'; // Slate 900
            ctx.fillRect(0, 0, width, height);

            ctx.save();
            // Camera Transform
            ctx.translate(width / 2, height / 2);
            ctx.scale(camera.zoom, camera.zoom);
            ctx.translate(-width / 2 + camera.x, -height / 2 + camera.y);

            // Draw Grid
            if (config.showGrid) {
                ctx.strokeStyle = '#1e293b';
                ctx.lineWidth = 1;
                ctx.beginPath();
                const step = config.gridSize;
                const limit = 2000; // Big area
                for (let x = -limit; x <= limit; x += step) {
                    ctx.moveTo(x, -limit);
                    ctx.lineTo(x, limit);
                }
                for (let y = -limit; y <= limit; y += step) {
                    ctx.moveTo(-limit, y);
                    ctx.lineTo(limit, y);
                }
                ctx.stroke();
            }

            // Draw Roads
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            scenario.strokes.forEach(road => {
                if (road.points.length < 2) return;
                ctx.beginPath();
                ctx.moveTo(road.points[0].x, road.points[0].y);
                for (let i = 1; i < road.points.length; i++) ctx.lineTo(road.points[i].x, road.points[i].y);
                ctx.lineWidth = road.width;
                ctx.strokeStyle = '#334155'; // Road Base
                ctx.stroke();

                // markings
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#fbbf24'; // Yellow center
                ctx.setLineDash([10, 10]);
                ctx.stroke();
                ctx.setLineDash([]);
            });

            // Draw Current Stroke (Preview)
            if (isDrawing.current && currentPath.current.length > 0) {
                ctx.beginPath();
                ctx.moveTo(currentPath.current[0].x, currentPath.current[0].y);
                for (let i = 1; i < currentPath.current.length; i++) ctx.lineTo(currentPath.current[i].x, currentPath.current[i].y);
                ctx.lineWidth = 40;
                ctx.strokeStyle = '#475569'; // Preview Road
                ctx.stroke();
            }

            // Draw Objects
            scenario.objects.forEach(obj => {
                ctx.save();
                ctx.translate(obj.x, obj.y);
                if (obj.type === 'light') {
                    ctx.fillStyle = '#1f2937';
                    ctx.fillRect(-5, -20, 10, 40);
                    ctx.fillStyle = obj.state === 'red' ? '#ef4444' : '#10b981';
                    ctx.beginPath(); ctx.arc(0, -10, 4, 0, Math.PI * 2); ctx.fill();
                } else if (obj.type === 'stop') {
                    ctx.fillStyle = '#ef4444';
                    ctx.beginPath();
                    for (let i = 0; i < 8; i++) {
                        const ang = i * Math.PI / 4;
                        ctx.lineTo(Math.cos(ang) * 15, Math.sin(ang) * 15);
                    }
                    ctx.closePath();
                    ctx.fill();
                    ctx.fillStyle = 'white'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('STOP', 0, 3);
                } else if (obj.type === 'ped') {
                    ctx.fillStyle = '#a855f7'; // Purple
                    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
                    // Walking animation indicator
                    const t = Date.now() / 200;
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(t) * 10, Math.sin(t) * 10); ctx.stroke();
                } else if (obj.type === 'obs') {
                    ctx.fillStyle = '#f97316'; // Orange Cone
                    ctx.beginPath();
                    ctx.moveTo(-6, 6); ctx.lineTo(6, 6); ctx.lineTo(0, -10);
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.restore();
            });

            // Preview Simulation Agents
            if (isPreviewing) {
                // Spawner
                if (Math.random() < 0.02 && scenario.strokes.length > 0) {
                    const road = scenario.strokes[Math.floor(Math.random() * scenario.strokes.length)];
                    if (road.points.length > 1) {
                        agents.current.push({
                            x: road.points[0].x, y: road.points[0].y,
                            roadIndex: scenario.strokes.indexOf(road),
                            ptIndex: 0,
                            speed: 2 + Math.random(),
                            progress: 0
                        });
                    }
                }

                // Update & Draw Agents
                agents.current.forEach((agent, i) => {
                    const road = scenario.strokes[agent.roadIndex];
                    if (!road) return;

                    // Move
                    const p1 = road.points[agent.ptIndex];
                    const p2 = road.points[agent.ptIndex + 1];

                    if (p1 && p2) {
                        const dx = p2.x - p1.x;
                        const dy = p2.y - p1.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        agent.progress += agent.speed;
                        const t = agent.progress / dist;

                        agent.x = p1.x + dx * t;
                        agent.y = p1.y + dy * t;

                        if (t >= 1) {
                            agent.ptIndex++;
                            agent.progress = 0;
                            if (agent.ptIndex >= road.points.length - 1) {
                                // End of road
                                agents.current[i] = null; // Mark for removal
                            }
                        }

                        // Draw Agent
                        ctx.fillStyle = '#3b82f6';
                        ctx.fillRect(agent.x - 6, agent.y - 3, 12, 6);
                    }
                });
                // Cleanup
                agents.current = agents.current.filter(a => a !== null);
            }

            ctx.restore();
            animationFrameId = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [camera, scenario, config, tool]);

    // Mouse Handlers
    const getPos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) / camera.zoom + rect.width / 2 - camera.x;
        const y = (e.clientY - rect.top - rect.height / 2) / camera.zoom + rect.height / 2 - camera.y;
        return { x, y };
    };

    const handleMouseDown = (e) => {
        if (tool === 'select') {
            setIsDragging(true);
            setLastPos({ x: e.clientX, y: e.clientY });
        } else if (tool === 'road') {
            isDrawing.current = true;
            currentPath.current = [getPos(e)];
        } else if (['light', 'stop', 'ped', 'obs'].includes(tool)) {
            const p = getPos(e);
            setScenario(prev => ({
                ...prev,
                objects: [...prev.objects, { type: tool, x: p.x, y: p.y, state: tool === 'light' ? 'red' : 'active' }]
            }));
        } else if (tool === 'eraser') {
            const p = getPos(e);
            // Simple erase radius 20
            setScenario(prev => ({
                strokes: prev.strokes.filter(r => r.points.every(pt => Math.hypot(pt.x - p.x, pt.y - p.y) > 30)),
                objects: prev.objects.filter(o => Math.hypot(o.x - p.x, o.y - p.y) > 30)
            }));
        }
    };

    const handleMouseMove = (e) => {
        if (isDragging && tool === 'select') {
            const dx = e.clientX - lastPos.x;
            const dy = e.clientY - lastPos.y;
            setCamera(p => ({ ...p, x: p.x + dx / p.zoom, y: p.y + dy / p.zoom }));
            setLastPos({ x: e.clientX, y: e.clientY });
        } else if (isDrawing.current && tool === 'road') {
            currentPath.current.push(getPos(e));
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        if (isDrawing.current) {
            isDrawing.current = false;
            // Commit Road
            if (currentPath.current.length > 1) {
                setScenario(prev => ({
                    ...prev,
                    strokes: [...prev.strokes, { points: [...currentPath.current], width: 40 }]
                }));
            }
            currentPath.current = [];
        }
    };

    const handleSave = () => {
        const id = `scenario_${Date.now()}`;
        const saved = JSON.parse(localStorage.getItem('aumovio_maps') || '{}');
        saved[id] = {
            name: scenario.name || 'Untitled Scenario',
            strokes: scenario.strokes,
            objects: scenario.objects,
            start: { x: 400, y: 500, angle: 0 },
            finishLine: null,
            created: Date.now()
        };
        localStorage.setItem('aumovio_maps', JSON.stringify(saved));
        alert('Scenario Saved to LocalStorage!');
    };

    return (
        <div className="flex h-[calc(100vh-100px)] gap-4">
            {/* Center Canvas */}
            <div className="flex-1 bg-black rounded-xl overflow-hidden relative shadow-2xl border border-gray-800">
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className="w-full h-full cursor-crosshair"
                />

                {/* Overlay Controls */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <button onClick={() => setCamera(p => ({ ...p, zoom: p.zoom * 1.2 }))} className="p-2 bg-gray-800 rounded hover:bg-gray-700"><ZoomIn size={20} /></button>
                    <button onClick={() => setCamera(p => ({ ...p, zoom: p.zoom / 1.2 }))} className="p-2 bg-gray-800 rounded hover:bg-gray-700"><ZoomOut size={20} /></button>
                </div>

                <div className="absolute top-4 left-4 bg-black/50 backdrop-blur px-3 py-1 rounded text-xs text-gray-300 pointer-events-none">
                    {tool === 'select' ? 'Pan Mode (Drag to Move)' : `${tool} Tool Active`}
                </div>
            </div>

            {/* Right Tools Panel */}
            <div className="w-80 bg-card rounded-xl border border-border flex flex-col overflow-hidden">
                <div className="p-4 border-b border-border bg-black/20">
                    <h2 className="font-bold flex items-center gap-2">
                        <Settings className="w-4 h-4 text-primary" />
                        Scenario Tools
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Road Tools */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Infrastructure</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setTool('road')} className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${tool === 'road' ? 'bg-primary/20 border-primary text-primary' : 'border-gray-700 hover:bg-gray-800'}`}>
                                <Brush size={20} />
                                <span className="text-xs">Draw Road</span>
                            </button>
                            <button onClick={() => setTool('eraser')} className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${tool === 'eraser' ? 'bg-red-500/20 border-red-500 text-red-500' : 'border-gray-700 hover:bg-gray-800'}`}>
                                <Eraser size={20} />
                                <span className="text-xs">Eraser</span>
                            </button>
                        </div>
                    </div>

                    {/* Objects */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Traffic Controls</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setTool('light')} className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${tool === 'light' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' : 'border-gray-700 hover:bg-gray-800'}`}>
                                <Lightbulb size={20} />
                                <span className="text-xs">Traffic Light</span>
                            </button>
                            <button onClick={() => setTool('stop')} className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${tool === 'stop' ? 'bg-red-500/20 border-red-500 text-red-500' : 'border-gray-700 hover:bg-gray-800'}`}>
                                <Octagon size={20} />
                                <span className="text-xs">Stop Sign</span>
                            </button>
                        </div>
                    </div>

                    {/* Objects */}
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Hazards</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setTool('ped')} className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${tool === 'ped' ? 'bg-purple-500/20 border-purple-500 text-purple-500' : 'border-gray-700 hover:bg-gray-800'}`}>
                                <Users size={20} />
                                <span className="text-xs">Pedestrians</span>
                            </button>
                            <button onClick={() => setTool('obs')} className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${tool === 'obs' ? 'bg-orange-500/20 border-orange-500 text-orange-500' : 'border-gray-700 hover:bg-gray-800'}`}>
                                <TrafficCone size={20} />
                                <span className="text-xs">Obstacles</span>
                            </button>
                        </div>
                    </div>

                    {/* Sim Controls */}
                    <div className="pt-4 border-t border-gray-700">
                        <button onClick={() => setIsPreviewing(!isPreviewing)} className={`w-full py-3 hover:opacity-90 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${isPreviewing ? 'bg-red-500 text-white' : 'bg-secondary text-white'}`}>
                            <Play size={18} fill="currentColor" />
                            {isPreviewing ? 'Stop Preview' : 'Run Preview'}
                        </button>
                        <button onClick={handleSave} className="w-full mt-2 py-3 bg-primary hover:bg-primary/90 rounded-lg font-bold flex items-center justify-center gap-2 transition-all">
                            <Save size={18} />
                            Save Scenario
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
