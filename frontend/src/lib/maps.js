export const PRESET_MAPS = {
    oval: {
        name: "1. Beginner Oval",
        difficulty: 1,
        start: { x: 400, y: 500, angle: 0 },
        finishLine: { x1: 500, y1: 420, x2: 500, y2: 600 },
        waypoints: [
            { x: 500, y: 480 }, { x: 650, y: 450 }, { x: 750, y: 380 }, { x: 800, y: 300 }, // Right Turn
            { x: 750, y: 220 }, { x: 650, y: 150 }, { x: 500, y: 120 }, // Top
            { x: 350, y: 150 }, { x: 250, y: 220 }, { x: 200, y: 300 }, // Left Turn
            { x: 250, y: 380 }, { x: 350, y: 450 }  // Back to Start
        ],
        draw: (ctx, w, h) => {
            // Background
            ctx.fillStyle = '#2e8b57';
            ctx.fillRect(0, 0, w, h);
            // Oval
            ctx.beginPath();
            ctx.ellipse(w / 2, h / 2, 300, 180, 0, 0, 2 * Math.PI);
            ctx.lineWidth = 120;
            ctx.strokeStyle = '#555555';
            ctx.stroke();
            // Line
            ctx.beginPath();
            ctx.ellipse(w / 2, h / 2, 300, 180, 0, 0, 2 * Math.PI);
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#ffffff';
            ctx.setLineDash([20, 20]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Finish Line
            ctx.beginPath();
            ctx.moveTo(500, 420);
            ctx.lineTo(500, 600);
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#fbbf24';
            ctx.setLineDash([10, 10]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    },
    urban: {
        name: "2. Urban Grid",
        difficulty: 2,
        start: { x: 100, y: 100, angle: 0 },
        finishLine: { x1: 80, y1: 80, x2: 120, y2: 80 },
        waypoints: [{ x: 900, y: 100 }, { x: 900, y: 700 }, { x: 100, y: 700 }, { x: 100, y: 150 }],
        draw: (ctx, w, h) => {
            ctx.fillStyle = '#334155'; // City Ground
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#1e293b'; // Road
            ctx.fillRect(50, 50, 900, 100); // Top
            ctx.fillRect(850, 50, 100, 700); // Right
            ctx.fillRect(50, 650, 900, 100); // Bottom
            ctx.fillRect(50, 50, 100, 700); // Left
            ctx.fillStyle = '#fbbf24';
            ctx.fillText("Urban Grid (Coming Soon)", 400, 400);
        }
    },
    coastal: {
        name: "3. Coastal Highway",
        difficulty: 3,
        start: { x: 100, y: 400, angle: 0 },
        waypoints: [],
        draw: (ctx, w, h) => { ctx.fillStyle = '#0ea5e9'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = 'white'; ctx.fillText("Coastal (WIP)", 400, 400); }
    },
    rain: {
        name: "4. Rain Circuit (Wet)",
        difficulty: 4,
        start: { x: 400, y: 500, angle: 0 },
        waypoints: [],
        draw: (ctx) => { ctx.fillStyle = '#3f3f46'; ctx.fillRect(0, 0, 1000, 800); ctx.fillStyle = 'cyan'; ctx.fillText("Rain Circuit", 400, 400); }
    },
    drift: {
        name: "5. Drift Circuit", // Reordered
        difficulty: 5,
        start: { x: 150, y: 200, angle: 0 },
        finishLine: { x1: 200, y1: 100, x2: 200, y2: 300 },
        waypoints: [
            { x: 300, y: 200 }, { x: 500, y: 200 }, { x: 700, y: 250 },
            { x: 850, y: 350 }, { x: 800, y: 500 }, { x: 600, y: 550 },
            { x: 400, y: 500 }, { x: 300, y: 400 }, { x: 200, y: 300 },
            { x: 150, y: 200 } // Loop
        ],
        draw: (ctx, w, h) => {
            ctx.fillStyle = '#1e293b'; // Slate 800
            ctx.fillRect(0, 0, w, h);

            // Track Path (Figure 8-ish)
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Outer Track
            ctx.beginPath();
            ctx.moveTo(150, 200);
            ctx.lineTo(600, 200);
            ctx.bezierCurveTo(800, 200, 900, 300, 800, 450);
            ctx.bezierCurveTo(700, 600, 400, 500, 300, 400);
            ctx.bezierCurveTo(200, 300, 100, 300, 150, 200);
            ctx.lineWidth = 140;
            ctx.strokeStyle = '#475569'; // Slate 600
            ctx.stroke();

            // Inner Line (Apex)
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#fbbf24'; // Amber
            ctx.setLineDash([50, 50]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Finish Line
            ctx.beginPath();
            ctx.moveTo(200, 100);
            ctx.lineTo(200, 300);
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#ffffff';
            ctx.setLineDash([10, 10]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    },
    night: { name: "6. Night Metro", difficulty: 6, start: { x: 100, y: 100 }, waypoints: [], draw: (c, w, h) => { c.fillStyle = '#020617'; c.fillRect(0, 0, w, h); c.fillStyle = 'white'; c.fillText("Night Metro", 400, 400); } },
    mountain: { name: "7. Mountain Pass", difficulty: 7, start: { x: 100, y: 100 }, waypoints: [], draw: (c, w, h) => { c.fillStyle = '#365314'; c.fillRect(0, 0, w, h); c.fillStyle = 'white'; c.fillText("Mountain", 400, 400); } },
    industrial: { name: "8. Industrial Zone", difficulty: 8, start: { x: 100, y: 100 }, waypoints: [], draw: (c, w, h) => { c.fillStyle = '#78716c'; c.fillRect(0, 0, w, h); c.fillStyle = 'white'; c.fillText("Industrial", 400, 400); } },
    fog: { name: "9. Fog Valley", difficulty: 9, start: { x: 100, y: 100 }, waypoints: [], draw: (c, w, h) => { c.fillStyle = '#e2e8f0'; c.fillRect(0, 0, w, h); c.fillStyle = 'black'; c.fillText("Fog Valley", 400, 400); } },
    f1: { name: "10. F1 Grand Circuit", difficulty: 10, start: { x: 100, y: 100 }, waypoints: [], draw: (c, w, h) => { c.fillStyle = '#dc2626'; c.fillRect(0, 0, w, h); c.fillStyle = 'white'; c.fillText("F1 Circuit", 400, 400); } }
};
