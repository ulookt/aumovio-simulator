import { useState, useEffect, useRef } from 'react';
import { getScenarios } from '../lib/api';
import { MapPin, Navigation, AlertTriangle, Clock } from 'lucide-react';

export default function SceneSimulation() {
    const [scenarios, setScenarios] = useState([]);
    const [selectedScenario, setSelectedScenario] = useState(null);
    const [loading, setLoading] = useState(false);
    const canvasRef = useRef(null);
    const [destination, setDestination] = useState(null);

    const [carPosition, setCarPosition] = useState(null);
    const [selectionStep, setSelectionStep] = useState('start'); // 'start' or 'destination'
    const [journeyStats, setJourneyStats] = useState({
        distance: 0,
        stops: 0,
        nearMisses: 0,
        crashes: 0,
        status: 'idle' // idle, driving, arrived, crashed
    });

    // Grid configuration
    const CELL_SIZE = 50;
    const GRID_ROWS = 12;
    const GRID_COLS = 12;

    // Map structure
    const gridRef = useRef([]);
    const trafficLightsRef = useRef([]);
    const pedestriansRef = useRef([]);
    const carPositionRef = useRef(null);
    const journeyStatsRef = useRef({
        distance: 0,
        stops: 0,
        nearMisses: 0,
        crashes: 0,
        status: 'idle'
    });
    const pathRef = useRef([]);
    const animationRef = useRef(null);

    useEffect(() => {
        loadScenarios();
    }, []);

    useEffect(() => {
        if (selectedScenario && canvasRef.current) {
            initializeMap();
        }
    }, [selectedScenario]);

    const loadScenarios = async () => {
        setLoading(true);
        try {
            const response = await getScenarios();
            setScenarios(response.data);
            if (response.data.length > 0 && !selectedScenario) {
                setSelectedScenario(response.data[0]);
            }
        } catch (error) {
            console.error('Failed to load scenarios:', error);
        } finally {
            setLoading(false);
        }
    };

    const initializeMap = () => {
        // Create grid: 'road', 'intersection', 'sidewalk', 'building'
        const grid = [];
        for (let row = 0; row < GRID_ROWS; row++) {
            grid[row] = [];
            for (let col = 0; col < GRID_COLS; col++) {
                // Roads every 3 cells (both horizontal and vertical)
                const isHorizontalRoad = row % 3 === 1;
                const isVerticalRoad = col % 3 === 1;

                if (isHorizontalRoad && isVerticalRoad) {
                    grid[row][col] = 'intersection';
                } else if (isHorizontalRoad || isVerticalRoad) {
                    grid[row][col] = 'road';
                } else {
                    // Buildings
                    grid[row][col] = 'building';
                }
            }
        }

        gridRef.current = grid;

        // Initialize traffic lights at intersections
        const lights = [];
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                if (grid[row][col] === 'intersection') {
                    lights.push({
                        row,
                        col,
                        state: Math.random() > 0.5 ? 'green' : 'red',
                        direction: 'NS', // NS green means EW red
                        timer: 0
                    });
                }
            }
        }
        trafficLightsRef.current = lights;

        // Spawn pedestrians on road edges (sidewalks)
        const peds = [];
        const pedCount = Math.floor((selectedScenario.object_count || 20) * 0.3);
        for (let i = 0; i < pedCount; i++) {
            const row = Math.floor(Math.random() * GRID_ROWS);
            const col = Math.floor(Math.random() * GRID_COLS);
            if (grid[row][col] === 'road') {
                peds.push({
                    row,
                    col,
                    x: col * CELL_SIZE + CELL_SIZE / 4,
                    y: row * CELL_SIZE + CELL_SIZE / 4,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3
                });
            }
        }
        pedestriansRef.current = peds;

        // Set car starting position (center)
        const startRow = Math.floor(GRID_ROWS / 2);
        const startCol = Math.floor(GRID_COLS / 2);

        const initialCarPos = {
            row: startRow,
            col: startCol,
            x: startCol * CELL_SIZE + CELL_SIZE / 2,
            y: startRow * CELL_SIZE + CELL_SIZE / 2,
            targetX: startCol * CELL_SIZE + CELL_SIZE / 2,
            targetY: startRow * CELL_SIZE + CELL_SIZE / 2,
            pathIndex: 0
        };

        carPositionRef.current = initialCarPos;
        setCarPosition(initialCarPos);

        const initialStats = { distance: 0, stops: 0, nearMisses: 0, crashes: 0, status: 'idle', isStopped: false };
        journeyStatsRef.current = initialStats;
        setJourneyStats(initialStats);

        startAnimation();
    };

    const handleCanvasClick = (e) => {
        if (!canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const col = Math.floor(x / CELL_SIZE);
        const row = Math.floor(y / CELL_SIZE);

        // Check if clicked on road or intersection
        if (gridRef.current[row] && (gridRef.current[row][col] === 'road' || gridRef.current[row][col] === 'intersection')) {
            if (selectionStep === 'start') {
                // Set Car Position
                const newPos = {
                    row,
                    col,
                    x: col * CELL_SIZE + CELL_SIZE / 2,
                    y: row * CELL_SIZE + CELL_SIZE / 2,
                    targetX: col * CELL_SIZE + CELL_SIZE / 2,
                    targetY: row * CELL_SIZE + CELL_SIZE / 2,
                    pathIndex: 0
                };
                carPositionRef.current = newPos;
                setCarPosition(newPos);
                setSelectionStep('destination');
            } else {
                // Set Destination
                setDestination({ row, col });

                // Calculate path using A*
                if (carPositionRef.current) {
                    const path = findPath(
                        { row: carPositionRef.current.row, col: carPositionRef.current.col },
                        { row, col },
                        gridRef.current
                    );
                    pathRef.current = path;

                    const newStats = {
                        ...journeyStatsRef.current,
                        distance: path.length,
                        status: 'idle'
                    };
                    journeyStatsRef.current = newStats;
                    setJourneyStats(newStats);
                }
            }
        }
    };

    const findPath = (start, goal, grid) => {
        // A* pathfinding implementation
        const openSet = [start];
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        const key = (node) => `${node.row},${node.col}`;
        gScore.set(key(start), 0);
        fScore.set(key(start), heuristic(start, goal));

        while (openSet.length > 0) {
            // Find node with lowest fScore
            let current = openSet[0];
            let currentIdx = 0;
            for (let i = 1; i < openSet.length; i++) {
                if (fScore.get(key(openSet[i])) < fScore.get(key(current))) {
                    current = openSet[i];
                    currentIdx = i;
                }
            }

            if (current.row === goal.row && current.col === goal.col) {
                return reconstructPath(cameFrom, current);
            }

            openSet.splice(currentIdx, 1);

            // Check neighbors
            const neighbors = getNeighbors(current, grid);
            for (const neighbor of neighbors) {
                const tentativeGScore = gScore.get(key(current)) + 1;

                if (!gScore.has(key(neighbor)) || tentativeGScore < gScore.get(key(neighbor))) {
                    cameFrom.set(key(neighbor), current);
                    gScore.set(key(neighbor), tentativeGScore);
                    fScore.set(key(neighbor), tentativeGScore + heuristic(neighbor, goal));

                    if (!openSet.some(n => n.row === neighbor.row && n.col === neighbor.col)) {
                        openSet.push(neighbor);
                    }
                }
            }
        }

        return []; // No path found
    };

    const heuristic = (a, b) => {
        return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
    };

    const getNeighbors = (node, grid) => {
        const neighbors = [];
        const directions = [
            { row: -1, col: 0 },
            { row: 1, col: 0 },
            { row: 0, col: -1 },
            { row: 0, col: 1 }
        ];

        for (const dir of directions) {
            const newRow = node.row + dir.row;
            const newCol = node.col + dir.col;

            if (newRow >= 0 && newRow < GRID_ROWS && newCol >= 0 && newCol < GRID_COLS) {
                const cellType = grid[newRow][newCol];
                if (cellType === 'road' || cellType === 'intersection') {
                    neighbors.push({ row: newRow, col: newCol });
                }
            }
        }

        return neighbors;
    };

    const reconstructPath = (cameFrom, current) => {
        const path = [current];
        const key = (node) => `${node.row},${node.col}`;

        while (cameFrom.has(key(current))) {
            current = cameFrom.get(key(current));
            path.unshift(current);
        }

        return path;
    };

    const handleStart = () => {
        if (pathRef.current.length > 0) {
            journeyStatsRef.current.status = 'driving';
            setJourneyStats(prev => ({ ...prev, status: 'driving' }));
        }
    };

    const handleReset = () => {
        setDestination(null);
        setSelectionStep('start');

        // Use default center position but allow user to change it immediately
        const resetPos = {
            row: Math.floor(GRID_ROWS / 2),
            col: Math.floor(GRID_COLS / 2),
            x: Math.floor(GRID_COLS / 2) * CELL_SIZE + CELL_SIZE / 2,
            y: Math.floor(GRID_ROWS / 2) * CELL_SIZE + CELL_SIZE / 2,
            pathIndex: 0,
            targetX: Math.floor(GRID_COLS / 2) * CELL_SIZE + CELL_SIZE / 2,
            targetY: Math.floor(GRID_ROWS / 2) * CELL_SIZE + CELL_SIZE / 2
        };

        carPositionRef.current = resetPos;
        setCarPosition(resetPos);

        pathRef.current = [];

        const resetStats = { distance: 0, stops: 0, nearMisses: 0, crashes: 0, status: 'idle', isStopped: false };
        journeyStatsRef.current = resetStats;
        setJourneyStats(resetStats);
    };



    const startAnimation = () => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }

        const animate = (timestamp) => {
            updateSimulation(timestamp);
            drawScene();
            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);
    };

    const updateSimulation = (timestamp) => {
        const dt = 16; // ~60fps

        // Update traffic lights
        trafficLightsRef.current.forEach(light => {
            light.timer += dt;
            if (light.state === 'green' && light.timer > 300) {
                light.state = 'yellow';
                light.timer = 0;
            } else if (light.state === 'yellow' && light.timer > 100) {
                light.state = 'red';
                light.direction = light.direction === 'NS' ? 'EW' : 'NS';
                light.timer = 0;
            } else if (light.state === 'red' && light.timer > 300) {
                light.state = 'green';
                light.timer = 0;
            }
        });

        // Update pedestrians
        pedestriansRef.current.forEach(ped => {
            ped.x += ped.vx;
            ped.y += ped.vy;
            if (ped.x < 0 || ped.x > GRID_COLS * CELL_SIZE) ped.vx *= -1;
            if (ped.y < 0 || ped.y > GRID_ROWS * CELL_SIZE) ped.vy *= -1;
        });

        // Update car position along path
        // Use refs for calculations
        if (carPositionRef.current && pathRef.current.length > 0 && journeyStatsRef.current.status === 'driving') {
            const path = pathRef.current;
            const currentPos = { ...carPositionRef.current };
            const currentPathIndex = currentPos.pathIndex;

            if (currentPathIndex < path.length) {
                const target = path[currentPathIndex];
                const targetX = target.col * CELL_SIZE + CELL_SIZE / 2;
                const targetY = target.row * CELL_SIZE + CELL_SIZE / 2;

                // Check if at intersection with red light
                const isAtIntersection = gridRef.current[target.row][target.col] === 'intersection';
                let stoppedAtLight = false;

                if (isAtIntersection) {
                    const light = trafficLightsRef.current.find(l => l.row === target.row && l.col === target.col);
                    if (light && light.state === 'red') {
                        // Stop at red light
                        if (!journeyStatsRef.current.isStopped) {
                            journeyStatsRef.current.stops += 1;
                            journeyStatsRef.current.isStopped = true;
                            // Update UI immediately for stops
                            setJourneyStats({ ...journeyStatsRef.current });
                        }
                        stoppedAtLight = true;
                    }
                }

                if (!stoppedAtLight) {
                    journeyStatsRef.current.isStopped = false;
                    // Move towards target
                    const dx = targetX - currentPos.x;
                    const dy = targetY - currentPos.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 3) {
                        // Reached waypoint
                        currentPos.row = target.row;
                        currentPos.col = target.col;
                        currentPos.x = targetX;
                        currentPos.y = targetY;
                        currentPos.pathIndex = currentPathIndex + 1;

                        if (currentPos.pathIndex >= path.length) {
                            journeyStatsRef.current.status = 'arrived';
                        }
                    } else {
                        // Move towards target
                        const speed = 3;
                        currentPos.x += (dx / dist) * speed;
                        currentPos.y += (dy / dist) * speed;
                    }

                    // Check for pedestrian collisions
                    pedestriansRef.current.forEach(ped => {
                        const pedDist = Math.sqrt(
                            Math.pow(currentPos.x - ped.x, 2) +
                            Math.pow(currentPos.y - ped.y, 2)
                        );

                        if (pedDist < 20) { // Increased hit radius
                            const crashRoll = Math.random();
                            let crashProb = 0.008; // Increased base probability (was 0.001)

                            // Weather multipliers
                            if (selectedScenario.weather === 'fog') crashProb *= 3;
                            if (selectedScenario.weather === 'rain') crashProb *= 2.5;
                            if (selectedScenario.weather === 'snow') crashProb *= 4;
                            if (selectedScenario.time_of_day === 'night') crashProb *= 2;

                            // Traffic density multiplier
                            const density = selectedScenario.traffic_density || 20;
                            if (density > 50) {
                                crashProb *= (1 + (density - 50) / 40); // Significant boost for high traffic
                            }

                            if (crashRoll < crashProb) {
                                journeyStatsRef.current.crashes += 1;
                                journeyStatsRef.current.status = 'crashed';
                            } else if (pedDist < 30) { // Increased near-miss radius
                                journeyStatsRef.current.nearMisses += 1;
                            }
                        }
                    });
                }

                // Update refs (no state update for performance)
                carPositionRef.current = currentPos;

                // Only update journey stats state if changed meaningfully or crashed/arrived
                if (journeyStatsRef.current.status !== 'driving') {
                    setJourneyStats({ ...journeyStatsRef.current });
                }
            }
        }
    };

    const drawScene = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw grid
        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const x = col * CELL_SIZE;
                const y = row * CELL_SIZE;
                const cellType = gridRef.current[row][col];

                if (cellType === 'road' || cellType === 'intersection') {
                    ctx.fillStyle = '#2a2a2a';
                    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

                    // Road markings
                    ctx.strokeStyle = '#ffeb3b';
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 5]);
                    ctx.beginPath();
                    ctx.moveTo(x, y + CELL_SIZE / 2);
                    ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE / 2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                } else {
                    // Building
                    ctx.fillStyle = '#1a1a1a';
                    ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                }

                // Grid lines
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
            }
        }

        // Draw traffic lights
        trafficLightsRef.current.forEach(light => {
            const x = light.col * CELL_SIZE + CELL_SIZE - 8;
            const y = light.row * CELL_SIZE + 8;

            const color = light.state === 'green' ? '#22c55e' :
                light.state === 'yellow' ? '#eab308' : '#ef4444';

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw path
        if (pathRef.current.length > 0) {
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            pathRef.current.forEach((node, i) => {
                const x = node.col * CELL_SIZE + CELL_SIZE / 2;
                const y = node.row * CELL_SIZE + CELL_SIZE / 2;
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw destination
        if (destination) {
            const x = destination.col * CELL_SIZE + CELL_SIZE / 2;
            const y = destination.row * CELL_SIZE + CELL_SIZE / 2;

            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('B', x, y + 4);
        }

        // Draw pedestrians
        pedestriansRef.current.forEach(ped => {
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(ped.x, ped.y, 5, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw car
        if (carPositionRef.current) {
            const pos = carPositionRef.current;
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(
                pos.x - 12,
                pos.y - 12,
                24,
                24
            );

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('YOU', pos.x, pos.y + 3);
        }
    };

    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);





    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Autonomous Navigation Simulator</h1>
                    <p className="text-muted mt-1">
                        {selectionStep === 'start'
                            ? "1. Click Map to set Start Position"
                            : !destination
                                ? "2. Click Map to set Destination"
                                : "3. Ready to Start Journey"}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 rounded-lg border border-border hover:bg-card-hover transition-colors"
                    >
                        Reset
                    </button>
                    <button
                        onClick={handleStart}
                        disabled={journeyStats.status === 'driving' || !destination}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <Navigation className="w-4 h-4" />
                        Start Journey
                    </button>
                </div>
            </div>

            {scenarios.length > 0 && (
                <div className="metric-card">
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium">Select Scenario</label>
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 metric-card relative">
                    <canvas
                        ref={canvasRef}
                        width={GRID_COLS * CELL_SIZE}
                        height={GRID_ROWS * CELL_SIZE}
                        onClick={handleCanvasClick}
                        className="border border-border rounded-lg cursor-crosshair w-full h-auto"
                    />
                    {!destination && (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-4 py-2 rounded-full pointer-events-none">
                            Click on any road to set destination
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="metric-card">
                        <h3 className="text-lg font-semibold mb-4">Journey Stats</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-muted">Status:</span>
                                <span className={`font-semibold ${journeyStats.status === 'driving' ? 'text-blue-400' :
                                    journeyStats.status === 'arrived' ? 'text-green-400' :
                                        journeyStats.status === 'crashed' ? 'text-red-400' :
                                            'text-gray-400'
                                    }`}>
                                    {journeyStats.status.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted">Distance:</span>
                                <span className="font-semibold">{journeyStats.distance} cells</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted">Stops:</span>
                                <span className="font-semibold">{journeyStats.stops}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted">Near Misses:</span>
                                <span className="font-semibold text-yellow-400">{journeyStats.nearMisses}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted">Crashes:</span>
                                <span className="font-semibold text-red-400">{journeyStats.crashes}</span>
                            </div>
                        </div>
                    </div>

                    <div className="metric-card">
                        <h3 className="text-lg font-semibold mb-4">Legend</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-blue-500"></div>
                                <span>Your Car</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                                <span>Destination (B)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                                <span>Green Light</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full bg-red-500"></div>
                                <span>Red Light</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                                <span>Pedestrians</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* Simulation Result Overlay */}
            {
                (journeyStats.status === 'arrived' || journeyStats.status === 'crashed') && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full shadow-2xl">
                            <div className="text-center mb-6">
                                {journeyStats.status === 'arrived' ? (
                                    <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                                        <Navigation className="w-8 h-8 text-green-500" />
                                    </div>
                                ) : (
                                    <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                                        <AlertTriangle className="w-8 h-8 text-red-500" />
                                    </div>
                                )}

                                <h2 className="text-2xl font-bold">
                                    {journeyStats.status === 'arrived'
                                        ? (Math.max(0, 100 - (journeyStats.nearMisses * 10) - (journeyStats.crashes * 50)) >= 80 ? 'Safety Certificate Issued' : 'Safety Validation Failed')
                                        : 'Crash Analysis Report'}
                                </h2>
                                <p className="text-muted mt-2">
                                    {journeyStats.status === 'arrived'
                                        ? (Math.max(0, 100 - (journeyStats.nearMisses * 10) - (journeyStats.crashes * 50)) >= 80
                                            ? `Simulation completed successfully under ${selectedScenario.weather} conditions.`
                                            : `Safety score too low (${Math.max(0, 100 - (journeyStats.nearMisses * 10) - (journeyStats.crashes * 50))}/100) for certification.`)
                                        : `Collision detected during ${selectedScenario.weather} scenario validation.`}
                                </p>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="p-4 bg-background rounded-lg border border-border">
                                    <h3 className="font-medium mb-3">Performance Metrics</h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted">Safety Score</span>
                                            <span className={`font-bold ${journeyStats.nearMisses > 0 ? 'text-yellow-500' : 'text-green-500'}`}>
                                                {Math.max(0, 100 - (journeyStats.nearMisses * 10) - (journeyStats.crashes * 50))}/100
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted">Reaction Time</span>
                                            <span className="font-mono">{(Math.random() * 0.2 + 0.1).toFixed(3)}s</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted">Stops made</span>
                                            <span>{journeyStats.stops}</span>
                                        </div>
                                    </div>
                                </div>

                                {journeyStats.status === 'crashed' && (
                                    <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                                        <h3 className="font-medium text-red-400 mb-2">Root Cause Analysis</h3>
                                        <ul className="list-disc list-inside text-sm space-y-1 text-red-200/80">
                                            <li>Visibility reduction due to {selectedScenario.weather}</li>
                                            <li>Potential sensor occlusion</li>
                                            <li>Emergency braking failure</li>
                                        </ul>
                                    </div>
                                )}

                                {journeyStats.status === 'arrived' && (
                                    <div className={`p-4 rounded-lg border ${Math.max(0, 100 - (journeyStats.nearMisses * 10) - (journeyStats.crashes * 50)) >= 80 ? 'bg-green-500/10 border-green-500/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
                                        <h3 className={`font-medium mb-2 ${Math.max(0, 100 - (journeyStats.nearMisses * 10) - (journeyStats.crashes * 50)) >= 80 ? 'text-green-400' : 'text-yellow-400'}`}>Validation Status</h3>
                                        <p className={`text-sm ${Math.max(0, 100 - (journeyStats.nearMisses * 10) - (journeyStats.crashes * 50)) >= 80 ? 'text-green-200/80' : 'text-yellow-200/80'}`}>
                                            {Math.max(0, 100 - (journeyStats.nearMisses * 10) - (journeyStats.crashes * 50)) >= 80
                                                ? `Algorithm verified safe for deployment in ${selectedScenario.road_type} environments.`
                                                : `Behavior too risky. Too many near misses detected.`}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleReset}
                                    className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors"
                                >
                                    Run New Simulation
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
