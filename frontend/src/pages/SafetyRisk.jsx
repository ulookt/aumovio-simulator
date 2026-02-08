import { useState, useEffect } from 'react';
import { getJobs, getRiskAnalysis } from '../lib/api';
import { AlertTriangle, Shield, Eye, Car } from 'lucide-react';

export default function SafetyRisk() {
    const [jobs, setJobs] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState(null);
    const [riskData, setRiskData] = useState(null);

    useEffect(() => {
        loadJobs();
    }, []);

    useEffect(() => {
        if (selectedJobId) {
            loadRiskAnalysis(selectedJobId);
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

    const loadRiskAnalysis = async (jobId) => {
        try {
            const response = await getRiskAnalysis(jobId);
            setRiskData(response.data);
        } catch (error) {
            console.error('Failed to load risk analysis:', error);
            setRiskData(null);
        }
    };

    const getRiskLevel = (value) => {
        if (value < 0.3) return { label: 'Low', color: 'text-success' };
        if (value < 0.6) return { label: 'Medium', color: 'text-warning' };
        return { label: 'High', color: 'text-danger' };
    };

    const RiskGauge = ({ value, title, icon: Icon }) => {
        const percentage = (value * 100).toFixed(1);
        const risk = getRiskLevel(value);

        return (
            <div className="metric-card">
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-3 rounded-lg ${risk.color === 'text-success' ? 'bg-success/20' : risk.color === 'text-warning' ? 'bg-warning/20' : 'bg-danger/20'}`}>
                        <Icon className={`w-6 h-6 ${risk.color}`} />
                    </div>
                    <div>
                        <div className="text-sm text-gray-400">{title}</div>
                        <div className="text-xl font-bold">{percentage}%</div>
                    </div>
                </div>

                <div className="relative">
                    <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${risk.color === 'text-success' ? 'bg-success' :
                                risk.color === 'text-warning' ? 'bg-warning' : 'bg-danger'
                                }`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                    <div className={`mt-2 text-sm font-semibold ${risk.color}`}>
                        {risk.label} Risk
                    </div>
                </div>
            </div>
        );
    };

    const SafetyScoreCircle = ({ score }) => {
        const radius = 80;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (score / 100) * circumference;

        const getScoreColor = () => {
            if (score >= 80) return '#22c55e';
            if (score >= 60) return '#f59e0b';
            return '#ef4444';
        };

        return (
            <div className="flex flex-col items-center">
                <div className="relative">
                    <svg width="200" height="200" className="transform -rotate-90">
                        <circle
                            cx="100"
                            cy="100"
                            r={radius}
                            stroke="#262626"
                            strokeWidth="12"
                            fill="none"
                        />
                        <circle
                            cx="100"
                            cy="100"
                            r={radius}
                            stroke={getScoreColor()}
                            strokeWidth="12"
                            fill="none"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            className="transition-all duration-1000"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-4xl font-bold">{score.toFixed(1)}</div>
                        <div className="text-sm text-gray-400">Safety Score</div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">Safety Risk Analysis</h1>
                <p className="text-gray-400">Autonomous driving safety validation metrics</p>
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
                                Job #{job.index} | {job.scenario ? `${job.scenario.weather === 'sunny' ? 'Clear' : job.scenario.weather} · ${job.scenario.time_of_day} · ${job.compute_tier}` : `Job ${job.id.substring(0, 8)}`} — {new Date(job.created_at).toLocaleDateString()}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {riskData && (
                <>
                    {/* Overall Safety Score */}
                    <div className="metric-card flex justify-center py-8">
                        <SafetyScoreCircle score={riskData.safety_score} />
                    </div>

                    {/* Risk Gauges */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <RiskGauge
                            value={riskData.collision_probability}
                            title="Collision Probability"
                            icon={Car}
                        />
                        <RiskGauge
                            value={riskData.pedestrian_risk}
                            title="Pedestrian Risk"
                            icon={AlertTriangle}
                        />
                        <RiskGauge
                            value={riskData.visibility_risk}
                            title="Visibility Risk"
                            icon={Eye}
                        />
                    </div>

                    {/* Risk Summary */}
                    <div className="metric-card">
                        <div className="flex items-center gap-3 mb-4">
                            <Shield className="w-6 h-6 text-primary" />
                            <h3 className="text-lg font-semibold">Risk Assessment</h3>
                        </div>
                        <div className="space-y-3 text-gray-300">
                            <p>
                                This autonomous driving model demonstrates a safety score of <span className="font-bold text-foreground">{riskData.safety_score.toFixed(1)}/100</span>.
                            </p>
                            <p>
                                Key concerns include a {getRiskLevel(riskData.collision_probability).label.toLowerCase()} collision risk
                                ({(riskData.collision_probability * 100).toFixed(1)}%), {getRiskLevel(riskData.pedestrian_risk).label.toLowerCase()} pedestrian
                                risk ({(riskData.pedestrian_risk * 100).toFixed(1)}%), and {getRiskLevel(riskData.visibility_risk).label.toLowerCase()} visibility
                                challenges ({(riskData.visibility_risk * 100).toFixed(1)}%).
                            </p>
                            <p>
                                {riskData.safety_score >= 80
                                    ? '✓ This model meets safety thresholds for limited deployment scenarios.'
                                    : riskData.safety_score >= 60
                                        ? '⚠ Additional validation and testing recommended before deployment.'
                                        : '⚠ Critical safety concerns identified. Further training and validation required.'}
                            </p>
                        </div>
                    </div>
                </>
            )}

            {!riskData && selectedJobId && (
                <div className="metric-card text-center py-12 text-gray-400">
                    Loading risk analysis...
                </div>
            )}

            {!selectedJobId && (
                <div className="metric-card text-center py-12 text-gray-400">
                    No completed jobs available. Please complete a job first.
                </div>
            )}
        </div>
    );
}
