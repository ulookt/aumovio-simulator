import { useState, useEffect } from 'react';
import { getJobs, getInsights } from '../lib/api';
import { Sparkles, Brain, TrendingUp } from 'lucide-react';

export default function InsightPanel() {
    const [jobs, setJobs] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState(null);
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadJobs();
    }, []);

    useEffect(() => {
        if (selectedJobId) {
            loadInsights(selectedJobId);
        }
    }, [selectedJobId]);

    const loadJobs = async () => {
        try {
            const response = await getJobs();
            const completedJobs = response.data.filter(j => j.status === 'completed');
            setJobs(completedJobs);
            if (completedJobs.length > 0 && !selectedJobId) {
                setSelectedJobId(completedJobs[0].id);
            }
        } catch (error) {
            console.error('Failed to load jobs:', error);
        }
    };

    const loadInsights = async (jobId) => {
        setLoading(true);
        try {
            const response = await getInsights(jobId);
            setInsights(response.data);
        } catch (error) {
            console.error('Failed to load insights:', error);
            setInsights([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <Sparkles className="w-8 h-8 text-secondary" />
                    AI Insights
                </h1>
                <p className="text-gray-400">ChatGPT-powered experiment analysis and recommendations</p>
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
                                Job {job.id.substring(0, 8)} - {job.compute_tier}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {loading && (
                <div className="metric-card text-center py-12">
                    <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-400">Generating AI insights...</p>
                </div>
            )}

            {!loading && insights.length > 0 && (
                <div className="space-y-4">
                    {insights.map((insight, idx) => (
                        <div key={insight.id} className="glass-card rounded-lg p-6 border-l-4 border-secondary">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-secondary/20 rounded-lg">
                                    {idx === 0 ? (
                                        <TrendingUp className="w-6 h-6 text-secondary" />
                                    ) : (
                                        <Brain className="w-6 h-6 text-secondary" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="text-sm font-semibold bg-secondary/20 text-secondary px-3 py-1 rounded-full">
                                            {idx === 0 ? 'Performance Analysis' : 'Safety Assessment'}
                                        </div>
                                        <div className="text-sm text-gray-400">
                                            {new Date(insight.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                    <p className="text-gray-200 leading-relaxed">
                                        {insight.insight_text}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && insights.length === 0 && selectedJobId && (
                <div className="metric-card text-center py-12 text-gray-400">
                    <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No AI insights generated for this job yet.</p>
                    <p className="text-sm mt-2">Insights are generated automatically when a job completes.</p>
                </div>
            )}

            {!selectedJobId && (
                <div className="metric-card text-center py-12 text-gray-400">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No completed jobs available.</p>
                    <p className="text-sm mt-2">Complete a simulation job to receive AI-powered insights.</p>
                </div>
            )}

            {/* Info Panel */}
            <div className="metric-card bg-primary/5 border-primary/30">
                <div className="flex items-start gap-3">
                    <Brain className="w-6 h-6 text-primary mt-1" />
                    <div>
                        <h3 className="font-semibold mb-2">About AI Insights</h3>
                        <p className="text-sm text-gray-300 leading-relaxed">
                            Our platform uses OpenAI's ChatGPT to analyze your simulation results and provide
                            engineering recommendations. Insights cover performance quality, compute utilization,
                            safety concerns, and optimization strategies tailored to your autonomous driving scenarios.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
