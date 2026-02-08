import { useState, useEffect } from 'react';
import { getJobs, getScenarios, createJob } from '../lib/api';
import { Play, Clock, CheckCircle, XCircle, Cpu } from 'lucide-react';

export default function JobDashboard() {
    const [jobs, setJobs] = useState([]);
    const [scenarios, setScenarios] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newJob, setNewJob] = useState({
        scenario_id: '',
        compute_tier: 'medium',
        epochs: 20
    });

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 3000); // Refresh every 3 seconds
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            const [jobsRes, scenariosRes] = await Promise.all([
                getJobs(),
                getScenarios()
            ]);
            setJobs(jobsRes.data);
            setScenarios(scenariosRes.data);
            if (scenariosRes.data.length > 0 && !newJob.scenario_id) {
                setNewJob({ ...newJob, scenario_id: scenariosRes.data[0].id });
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    };

    const handleCreateJob = async (e) => {
        e.preventDefault();
        try {
            await createJob(newJob);
            setShowCreateModal(false);
            loadData();
        } catch (error) {
            console.error('Failed to create job:', error);
        }
    };

    const getStatusBadge = (status) => {
        const configs = {
            pending: { color: 'bg-warning/20 text-warning border-warning', icon: Clock },
            running: { color: 'bg-primary/20 text-primary border-primary', icon: Play },
            completed: { color: 'bg-success/20 text-success border-success', icon: CheckCircle },
            failed: { color: 'bg-danger/20 text-danger border-danger', icon: XCircle }
        };
        const config = configs[status] || configs.pending;
        const Icon = config.icon;
        return (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-sm ${config.color}`}>
                <Icon className="w-4 h-4" />
                {status}
            </span>
        );
    };

    const getTierBadge = (tier) => {
        const colors = {
            small: 'bg-gray-600',
            medium: 'bg-blue-600',
            large: 'bg-purple-600'
        };
        return (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm text-white ${colors[tier.toLowerCase()] || colors.medium}`}>
                <Cpu className="w-4 h-4" />
                {tier}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Jobs Dashboard</h1>
                    <p className="text-gray-400">Manage AI simulation jobs</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                    + Launch New Job
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-4">
                <div className="metric-card">
                    <div className="text-sm text-gray-400">Total Jobs</div>
                    <div className="text-3xl font-bold">{jobs.length}</div>
                </div>
                <div className="metric-card">
                    <div className="text-sm text-gray-400">Running</div>
                    <div className="text-3xl font-bold text-primary">
                        {jobs.filter(j => j.status === 'running').length}
                    </div>
                </div>
                <div className="metric-card">
                    <div className="text-sm text-gray-400">Completed</div>
                    <div className="text-3xl font-bold text-success">
                        {jobs.filter(j => j.status === 'completed').length}
                    </div>
                </div>
                <div className="metric-card">
                    <div className="text-sm text-gray-400">Total Cost</div>
                    <div className="text-3xl font-bold">${jobs.reduce((sum, j) => sum + j.cost_estimate, 0).toFixed(2)}</div>
                </div>
            </div>

            {/* Jobs Table */}
            <div className="metric-card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-card-hover">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold">Job ID</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold">Compute Tier</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold">Progress</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold">Epochs</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold">Runtime</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold">Cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {jobs.map((job) => (
                                <tr key={job.id} className="hover:bg-card-hover transition-colors">
                                    <td className="px-6 py-4 text-sm font-mono text-gray-400">
                                        <span className="font-bold text-white block">Job #{job.index}</span>
                                        <span className="text-xs">
                                            {job.scenario ? `(Scenario #${job.scenario.index})` : job.id.substring(0, 8)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{getStatusBadge(job.status)}</td>
                                    <td className="px-6 py-4">{getTierBadge(job.compute_tier)}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="bg-primary h-full transition-all duration-300"
                                                    style={{ width: `${job.progress}%` }}
                                                />
                                            </div>
                                            <span className="text-sm font-medium">{Math.round(job.progress)}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">{job.epochs}</td>
                                    <td className="px-6 py-4 text-sm">{job.runtime_sec.toFixed(1)}s</td>
                                    <td className="px-6 py-4 text-sm font-semibold">${job.cost_estimate}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Job Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full m-4">
                        <h2 className="text-2xl font-bold mb-6">Create New Job</h2>
                        <form onSubmit={handleCreateJob} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Scenario</label>
                                <select
                                    value={newJob.scenario_id}
                                    onChange={(e) => setNewJob({ ...newJob, scenario_id: e.target.value })}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                                    required
                                >
                                    {scenarios.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            Scenario #{s.index} | {s.weather === 'sunny' ? 'Clear' : s.weather} - {s.time_of_day} - {s.road_type}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Compute Tier</label>
                                <select
                                    value={newJob.compute_tier}
                                    onChange={(e) => setNewJob({ ...newJob, compute_tier: e.target.value })}
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg"
                                >
                                    <option value="small">Small (T4 GPU)</option>
                                    <option value="medium">Medium (A100 GPU)</option>
                                    <option value="large">Large (H100 GPU)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Epochs: {newJob.epochs}</label>
                                <input
                                    type="range"
                                    min="5"
                                    max="50"
                                    value={newJob.epochs}
                                    onChange={(e) => setNewJob({ ...newJob, epochs: parseInt(e.target.value) })}
                                    className="w-full accent-primary"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-card-hover transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg font-semibold transition-colors"
                                >
                                    Launch Job
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
