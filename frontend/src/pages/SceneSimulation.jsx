import { useEffect, useRef, useState } from 'react';
import { getScenarios } from '../lib/api';

export default function SceneSimulation() {
    const canvasRef = useRef(null);
    const [scenarios, setScenarios] = useState([]);
    const [selectedScenario, setSelectedScenario] = useState(null);
    const [vehicles, setVehicles] = useState([]);

    useEffect(() => {
        loadScenarios();
    }, []);

    useEffect(() => {
        if (selectedScenario) {
            initializeSimulation();
        }
    }, [selectedScenario]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !selectedScenario) return;

        const ctx = canvas.getContext('2d');
        let animationId;

        const animate = () => {
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw grid
            ctx.strokeStyle = '#262626';
            ctx.lineWidth = 1;
            for (let i = 0; i < canvas.width; i += 40) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, canvas.height);
                ctx.stroke();
            }
            for (let i = 0; i < canvas.height; i += 40) {
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(canvas.width, i);
                ctx.stroke();
            }

            // Update and draw vehicles
            vehicles.forEach((vehicle, idx) => {
                // Update position
                vehicle.x += vehicle.vx;
                vehicle.y += vehicle.vy;

                // Bounce at edges
                if (vehicle.x < 0 || vehicle.x > canvas.width) vehicle.vx *= -1;
                if (vehicle.y < 0 || vehicle.y > canvas.height) vehicle.vy *= -1;

                // Draw vehicle
                ctx.fillStyle = vehicle.color;
                ctx.fillRect(vehicle.x - 10, vehicle.y - 15, 20, 30);

                // Draw direction indicator
                ctx.fillStyle = '#fff';
                ctx.fillRect(vehicle.x - 8, vehicle.y - 10, 16, 5);
            });

            // Draw ego vehicle (center, blue)
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(canvas.width / 2 - 12, canvas.height / 2 - 18, 24, 36);
            ctx.fillStyle = '#fff';
            ctx.fillRect(canvas.width / 2 - 10, canvas.height / 2 - 12, 20, 8);

            animationId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationId) cancelAnimationFrame(animationId);
        };
    }, [vehicles]);

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

    const initializeSimulation = () => {
        if (!selectedScenario) return;

        const canvas = canvasRef.current;
        const vehicleCount = Math.min(selectedScenario.object_count, 20);
        const newVehicles = [];

        const colors = ['#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899'];

        for (let i = 0; i < vehicleCount; i++) {
            newVehicles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }

        setVehicles(newVehicles);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">2D Scene Simulation</h1>
                <p className="text-gray-400">Top-down visualization of autonomous driving scenarios</p>
            </div>

            {scenarios.length > 0 && (
                <div className="metric-card">
                    <label className="block text-sm font-medium mb-2">Select Scenario</label>
                    <select
                        value={selectedScenario?.id || ''}
                        onChange={(e) => {
                            const scenario = scenarios.find(s => s.id === e.target.value);
                            setSelectedScenario(scenario);
                        }}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground"
                    >
                        {scenarios.map((scenario) => (
                            <option key={scenario.id} value={scenario.id}>
                                {scenario.weather} - {scenario.time_of_day} - {scenario.road_type}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {selectedScenario && (
                <div className="grid grid-cols-4 gap-4">
                    <div className="metric-card">
                        <div className="text-sm text-gray-400">Weather</div>
                        <div className="text-xl font-semibold capitalize">{selectedScenario.weather}</div>
                    </div>
                    <div className="metric-card">
                        <div className="text-sm text-gray-400">Time</div>
                        <div className="text-xl font-semibold capitalize">{selectedScenario.time_of_day}</div>
                    </div>
                    <div className="metric-card">
                        <div className="text-sm text-gray-400">Traffic</div>
                        <div className="text-xl font-semibold">{Math.round(selectedScenario.traffic_density * 100)}%</div>
                    </div>
                    <div className="metric-card">
                        <div className="text-sm text-gray-400">Objects</div>
                        <div className="text-xl font-semibold">{selectedScenario.object_count}</div>
                    </div>
                </div>
            )}

            <div className="metric-card p-0 overflow-hidden">
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    className="w-full bg-background"
                />
            </div>

            {!selectedScenario && (
                <div className="metric-card text-center py-12 text-gray-400">
                    No scenarios available. Please create a scenario first.
                </div>
            )}
        </div>
    );
}
