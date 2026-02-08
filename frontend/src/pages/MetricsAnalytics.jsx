import { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getJobs, getJobMetrics, getComputeMetrics } from '../lib/api';

export default function MetricsAnalytics() {
    const [jobs, setJobs] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState(null);
    const [trainingMetrics, setTrainingMetrics] = useState([]);
    const [computeMetrics, setComputeMetrics] = useState([]);

    useEffect(() => {
        loadJobs();
    }, []);

    useEffect(() => {
        if (selectedJobId) {
            loadMetrics(selectedJobId);
        }
    }, [selectedJobId]);

    const loadJobs = async () => {
        try {
            const response = await getJobs();
            const completedJobs = response.data.filter(j => j.status === 'completed' || j.status === 'running');
            setJobs(completedJobs);
            if (completedJobs.length > 0 && !selectedJobId) {
                setSelectedJobId(completedJobs[0].id);
            }
        } catch (error) {
            console.error('Failed to load jobs:', error);
        }
    };

    const loadMetrics = async (jobId) => {
        try {
            const [trainingRes, computeRes] = await Promise.all([
                getJobMetrics(jobId),
                getComputeMetrics(jobId)
            ]);
            setTrainingMetrics(trainingRes.data);
            setComputeMetrics(computeRes.data.map((m, idx) => ({ ...m, index: idx + 1 })));
        } catch (error) {
            console.error('Failed to load metrics:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">Metrics & Analytics</h1>
                <p className="text-gray-400">Training performance and compute telemetry</p>
            </div>

            {jobs.length > 0 && (
                <div className="metric-card">
                    <label className="block text-sm font-medium mb-2">Select Job</label>
                    <select
                        value={selectedJobId || ''}
                        onChange={(e) => setSelectedJobId(e.target.value)}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                    >
                        {jobs.map((job) => (
                            <option key={job.id} value={job.id}>
                                Job {job.id.substring(0, 8)} - {job.compute_tier} - {job.status}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {trainingMetrics.length > 0 && (
                <>
                    {/* Loss Chart */}
                    <div className="metric-card">
                        <h3 className="text-lg font-semibold mb-4">Training Loss</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={trainingMetrics}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                                <XAxis dataKey="epoch" stroke="#9ca3af" />
                                <YAxis stroke="#9ca3af" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#141414', border: '1px solid #262626' }}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="loss"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    dot={{ fill: '#ef4444', r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Accuracy Chart */}
                    <div className="metric-card">
                        <h3 className="text-lg font-semibold mb-4">Accuracy & Detection Score</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={trainingMetrics}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                                <XAxis dataKey="epoch" stroke="#9ca3af" />
                                <YAxis stroke="#9ca3af" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#141414', border: '1px solid #262626' }}
                                />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="accuracy"
                                    stroke="#22c55e"
                                    fill="#22c55e33"
                                    strokeWidth={2}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="detection_score"
                                    stroke="#3b82f6"
                                    fill="#3b82f633"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}

            {computeMetrics.length > 0 && (
                <>
                    {/* GPU Utilization */}
                    <div className="metric-card">
                        <h3 className="text-lg font-semibold mb-4">GPU Utilization</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={computeMetrics}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                                <XAxis dataKey="index" stroke="#9ca3af" />
                                <YAxis stroke="#9ca3af" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#141414', border: '1px solid #262626' }}
                                />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="gpu_utilization"
                                    stroke="#8b5cf6"
                                    fill="#8b5cf633"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Resource Usage Comparison */}
                    <div className="metric-card">
                        <h3 className="text-lg font-semibold mb-4">Resource Usage Comparison</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={computeMetrics.slice(-10)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                                <XAxis dataKey="index" stroke="#9ca3af" />
                                <YAxis stroke="#9ca3af" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#141414', border: '1px solid #262626' }}
                                />
                                <Legend />
                                <Bar dataKey="gpu_utilization" fill="#8b5cf6" />
                                <Bar dataKey="vram_usage" fill="#3b82f6" />
                                <Bar dataKey="cpu_usage" fill="#22c55e" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}

            {!selectedJobId && (
                <div className="metric-card text-center py-12 text-gray-400">
                    No jobs available. Please create and run a job first.
                </div>
            )}
        </div>
    );
}
