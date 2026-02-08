import { useState, useEffect, useRef } from 'react';
import { getScenarios } from '../lib/api';
import { Car, User, AlertTriangle, Box, RefreshCw } from 'lucide-react';

export default function SceneSimulation() {
    const [scenarios, setScenarios] = useState([]);
    const [selectedScenario, setSelectedScenario] = useState(null);
    const canvasRef = useRef(null);
    const [objects, setObjects] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadScenarios();

        // Reload scenarios when page becomes visible (user navigates back to it)
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                loadScenarios();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    useEffect(() => {
        if (selectedScenario) {
            initializeScene();
        }
    }, [selectedScenario]);

    const objectsRef = useRef([]);

    useEffect(() => {
        if (!selectedScenario || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let isRunning = true;

        const animate = () => {
            if (!isRunning) return;

            // Clear and draw background
            ctx.fillStyle = selectedScenario.weather === 'fog' ? '#1a1a1a' : '#0a0a0a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw road lanes
            drawRoadLanes(ctx, canvas);

            // Update objects
            const updated = objectsRef.current.map(obj => {
                let newX = obj.x + obj.vx;
                let newY = obj.y + obj.vy;

                // Different movement patterns based on type
                if (obj.type === 'vehicle') {
                    // Vehicles follow lanes
                    const laneY = Math.round(obj.y / 100) * 100 + 50;
                    newY = obj.y + (laneY - obj.y) * 0.05; // Smooth lane following
                } else if (obj.type === 'pedestrian') {
                    // Pedestrians walk slower and more erratically
                    newX += (Math.random() - 0.5) * 0.5;
                    newY += (Math.random() - 0.5) * 0.5;
                }

                // Bounce off edges
                if (newX <= 0 || newX >= canvas.width - obj.width) {
                    obj.vx *= -1;
                    newX = Math.max(0, Math.min(canvas.width - obj.width, newX));
                }
                if (newY <= 0 || newY >= canvas.height - obj.height) {
                    obj.vy *= -1;
                    newY = Math.max(0, Math.min(canvas.height - obj.height, newY));
                }

                return { ...obj, x: newX, y: newY };
            });

            // Store updated objects
            objectsRef.current = updated;
            setObjects(updated);

            // Draw all objects
            updated.forEach(obj => {
                drawObject(ctx, obj);
            });

            // Draw ego vehicle (center) with car shape
            drawEgoVehicle(ctx, canvas);

            // Draw weather overlay
            drawWeatherEffect(ctx, canvas, selectedScenario.weather);

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            isRunning = false;
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [selectedScenario]); // REMOVED objects dependency to prevent infinite loop

    const drawRoadLanes = (ctx, canvas) => {
        // Draw horizontal lanes
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 1;
        ctx.setLineDash([10, 5]);
        for (let y = 100; y < canvas.height; y += 100) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        ctx.setLineDash([]);
    };

    const drawObject = (ctx, obj) => {
        ctx.save();
        ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2);

        switch (obj.type) {
            case 'vehicle':
                // Draw car shape
                ctx.fillStyle = obj.color;
                ctx.fillRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
                // Windshield
                ctx.fillStyle = 'rgba(100, 149, 237, 0.3)';
                ctx.fillRect(-obj.width / 2 + 2, -obj.height / 2 + 2, obj.width - 4, obj.height / 3);
                // Outline
                ctx.strokeStyle = obj.color;
                ctx.lineWidth = 2;
                ctx.strokeRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
                break;

            case 'pedestrian':
                // Draw person shape
                ctx.fillStyle = obj.color;
                // Head
                ctx.beginPath();
                ctx.arc(0, -obj.height / 3, obj.width / 3, 0, Math.PI * 2);
                ctx.fill();
                // Body
                ctx.fillRect(-obj.width / 4, -obj.height / 6, obj.width / 2, obj.height / 2);
                // Legs
                ctx.fillRect(-obj.width / 4, obj.height / 4, obj.width / 6, obj.height / 4);
                ctx.fillRect(obj.width / 12, obj.height / 4, obj.width / 6, obj.height / 4);
                break;

            case 'obstacle':
                // Draw triangle obstacle
                ctx.fillStyle = obj.color;
                ctx.strokeStyle = '#fbbf24';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -obj.height / 2);
                ctx.lineTo(obj.width / 2, obj.height / 2);
                ctx.lineTo(-obj.width / 2, obj.height / 2);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                // Warning stripes
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                for (let i = -obj.height / 4; i < obj.height / 2; i += 8) {
                    ctx.beginPath();
                    ctx.moveTo(-obj.width / 4, i);
                    ctx.lineTo(obj.width / 4, i);
                    ctx.stroke();
                }
                break;

            case 'static':
                // Draw box/crate
                ctx.fillStyle = obj.color;
                ctx.fillRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
                ctx.strokeStyle = '#444';
                ctx.lineWidth = 1;
                ctx.strokeRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
                // X pattern
                ctx.beginPath();
                ctx.moveTo(-obj.width / 2, -obj.height / 2);
                ctx.lineTo(obj.width / 2, obj.height / 2);
                ctx.moveTo(obj.width / 2, -obj.height / 2);
                ctx.lineTo(-obj.width / 2, obj.height / 2);
                ctx.stroke();
                break;
        }

        ctx.restore();
    };

    const drawEgoVehicle = (ctx, canvas) => {
        const egoX = canvas.width / 2;
        const egoY = canvas.height / 2;
        const width = 30;
        const height = 45;

        ctx.save();
        ctx.translate(egoX, egoY);

        // Car body
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(-width / 2, -height / 2, width, height);

        // Windshield
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(-width / 2 + 3, -height / 2 + 3, width - 6, height / 3);

        // Outline
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 3;
        ctx.strokeRect(-width / 2, -height / 2, width, height);

        // Label
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('YOU', 0, height / 2 + 15);

        ctx.restore();
    };

    const drawWeatherEffect = (ctx, canvas, weather) => {
        switch (weather.toLowerCase()) {
            case 'fog':
                ctx.fillStyle = 'rgba(200, 200, 200, 0.2)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                break;
            case 'rain':
                ctx.strokeStyle = 'rgba(150, 200, 255, 0.3)';
                ctx.lineWidth = 1;
                for (let i = 0; i < 50; i++) {
                    const x = Math.random() * canvas.width;
                    const y = Math.random() * canvas.height;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x - 2, y + 10);
                    ctx.stroke();
                }
                break;
            case 'snow':
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                for (let i = 0; i < 30; i++) {
                    const x = Math.random() * canvas.width;
                    const y = Math.random() * canvas.height;
                    ctx.beginPath();
                    ctx.arc(x, y, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
        }
    };

    const loadScenarios = async () => {
        try {
            const response = await getScenarios();
            setScenarios(response.data);
            if (response.data.length > 0) {
                setSelectedScenario(response.data[0]);
            }
        } catch (error) {
            console.error('Failed to load scenarios:', error);
        }
    };

    const initializeScene = () => {
        if (!selectedScenario) return;

        const canvas = canvasRef.current;
        const objectCount = selectedScenario.object_count || 20;
        const trafficDensity = selectedScenario.traffic_density || 50;

        // Calculate object type distribution
        const vehicleCount = Math.floor(objectCount * (trafficDensity / 100) * 0.7);
        const pedestrianCount = Math.floor(objectCount * 0.2);
        const obstacleCount = Math.floor(objectCount * 0.1);
        const staticCount = objectCount - vehicleCount - pedestrianCount - obstacleCount;

        const newObjects = [];

        // Add vehicles
        for (let i = 0; i < vehicleCount; i++) {
            const lane = Math.floor(Math.random() * 6);
            newObjects.push({
                type: 'vehicle',
                x: Math.random() * (canvas.width - 40),
                y: lane * 100 + 40 + Math.random() * 20,
                width: 25,
                height: 40,
                vx: (Math.random() + 0.5) * (Math.random() > 0.5 ? 1 : -1) * 1.5,
                vy: 0,
                color: ['#ef4444', '#f59e0b', '#10b981', '#06b6d4'][Math.floor(Math.random() * 4)]
            });
        }

        // Add pedestrians
        for (let i = 0; i < pedestrianCount; i++) {
            newObjects.push({
                type: 'pedestrian',
                x: Math.random() * (canvas.width - 20),
                y: Math.random() * (canvas.height - 30),
                width: 15,
                height: 25,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                color: '#f59e0b'
            });
        }

        // Add obstacles
        for (let i = 0; i < obstacleCount; i++) {
            newObjects.push({
                type: 'obstacle',
                x: Math.random() * (canvas.width - 30),
                y: Math.random() * (canvas.height - 30),
                width: 25,
                height: 25,
                vx: 0,
                vy: 0,
                color: '#eab308'
            });
        }

        // Add static objects
        for (let i = 0; i < staticCount; i++) {
            newObjects.push({
                type: 'static',
                x: Math.random() * (canvas.width - 25),
                y: Math.random() * (canvas.height - 25),
                width: 20,
                height: 20,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                color: '#8b5cf6'
            });
        }

        objectsRef.current = newObjects;
        setObjects(newObjects);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">2D Scene Simulation</h1>
                <p className="text-gray-400">Top-down visualization of autonomous driving scenarios</p>
            </div>

            {scenarios.length > 0 && (
                <div className="metric-card">
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium">Select Scenario</label>
                        <button
                            onClick={() => loadScenarios()}
                            disabled={loading}
                            className="p-2 hover:bg-card-hover rounded-lg transition-colors disabled:opacity-50"
                            title="Refresh scenarios"
                        >
                            <RefreshCw className={`w - 4 h - 4 ${loading ? 'animate-spin' : ''} `} />
                        </button>
                    </div>
                    <select
                        value={selectedScenario?.id || ''}
                        onChange={(e) => {
                            const scenario = scenarios.find(s => s.id === e.target.value);
                            setSelectedScenario(scenario);
                        }}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                    >
                        {scenarios.map((scenario) => (
                            <option key={scenario.id} value={scenario.id}>
                                {scenario.weather} · {scenario.time_of_day} · {scenario.traffic_density}% traffic · {scenario.road_type}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {selectedScenario && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <div className="metric-card">
                            <canvas
                                ref={canvasRef}
                                width={800}
                                height={600}
                                className="w-full border border-border rounded-lg"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="metric-card">
                            <h3 className="text-lg font-semibold mb-4">Scenario Details</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Weather:</span>
                                    <span className="font-medium capitalize">{selectedScenario.weather}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Time:</span>
                                    <span className="font-medium capitalize">{selectedScenario.time_of_day}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Traffic Density:</span>
                                    <span className="font-medium">{selectedScenario.traffic_density}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Road Type:</span>
                                    <span className="font-medium capitalize">{selectedScenario.road_type}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Objects:</span>
                                    <span className="font-medium">{selectedScenario.object_count}</span>
                                </div>
                            </div>
                        </div>

                        <div className="metric-card">
                            <h3 className="text-lg font-semibold mb-4">Legend</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-3">
                                    <Car className="w-5 h-5 text-blue-500" />
                                    <div className="w-6 h-8 bg-blue-500 border-2 border-blue-700 rounded-sm"></div>
                                    <span className="font-medium">Ego Vehicle (YOU)</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Car className="w-5 h-5 text-red-500" />
                                    <div className="w-6 h-8 bg-red-500 border border-red-700 rounded-sm"></div>
                                    <span>Traffic Vehicles</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <User className="w-5 h-5 text-orange-500" />
                                    <div className="w-4 h-6 bg-orange-500 rounded-sm"></div>
                                    <span>Pedestrians</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                                    <div className="w-6 h-6 bg-yellow-500" style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }}></div>
                                    <span>Obstacles / Hazards</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Box className="w-5 h-5 text-purple-500" />
                                    <div className="w-6 h-6 bg-purple-500 border border-purple-700"></div>
                                    <span>Static Objects</span>
                                </div>
                            </div>
                        </div>

                        <div className="metric-card bg-warning/10 border-warning/30">
                            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-warning">
                                <AlertTriangle className="w-5 h-5" />
                                Danger Tips
                            </h3>
                            <p className="text-sm text-gray-300 leading-relaxed">
                                To create dangerous scenarios: use <strong className="text-warning">fog/snow</strong> weather,
                                <strong className="text-warning"> night/dusk</strong> time,
                                <strong className="text-warning"> 80%+</strong> traffic density, and
                                <strong className="text-warning"> 50+ objects</strong>. This simulates low visibility, high congestion,
                                and complex decision-making scenarios.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {!selectedScenario && (
                <div className="metric-card text-center py-12 text-gray-400">
                    No scenarios available. Create one in the Scenario Builder first.
                </div>
            )}
        </div>
    );
}
