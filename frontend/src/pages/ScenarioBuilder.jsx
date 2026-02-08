import { useState } from 'react';
import { createScenario } from '../lib/api';
import { Cloudy, Sun, Cloud, Snowflake, Moon, Sunrise, MapPin } from 'lucide-react';

export default function ScenarioBuilder() {
    const [formData, setFormData] = useState({
        weather: 'sunny',
        time_of_day: 'day',
        traffic_density: 0.5,
        road_type: 'city',
        object_count: 20,
        dataset_size_mb: 500
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);
        try {
            await createScenario(formData);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error('Failed to create scenario:', error);
        } finally {
            setLoading(false);
        }
    };

    const weatherOptions = [
        { value: 'sunny', icon: Sun, color: 'text-yellow-400' },
        { value: 'rain', icon: Cloud, color: 'text-blue-400' },
        { value: 'fog', icon: Cloudy, color: 'text-gray-400' },
        { value: 'snow', icon: Snowflake, color: 'text-cyan-300' }
    ];

    const timeOptions = [
        { value: 'day', icon: Sun, label: 'Day' },
        { value: 'night', icon: Moon, label: 'Night' },
        { value: 'dawn', icon: Sunrise, label: 'Dawn' },
        { value: 'dusk', icon: Sunrise, label: 'Dusk' }
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">Scenario Builder</h1>
                <p className="text-gray-400">Generate synthetic autonomous driving test environments</p>
            </div>

            {success && (
                <div className="bg-success/20 border border-success text-success px-4 py-3 rounded-lg">
                    ✓ Scenario created successfully!
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Weather Selection */}
                <div className="metric-card">
                    <label className="block text-sm font-medium mb-3">Weather Conditions</label>
                    <div className="grid grid-cols-4 gap-4">
                        {weatherOptions.map(({ value, icon: Icon, color }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setFormData({ ...formData, weather: value })}
                                className={`p-4 rounded-lg border-2 transition-all ${formData.weather === value
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border hover:border-gray-500'
                                    }`}
                            >
                                <Icon className={`w-8 h-8 mx-auto mb-2 ${color}`} />
                                <div className="text-sm capitalize">{value}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Time of Day */}
                <div className="metric-card">
                    <label className="block text-sm font-medium mb-3">Time of Day</label>
                    <div className="grid grid-cols-4 gap-4">
                        {timeOptions.map(({ value, icon: Icon, label }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setFormData({ ...formData, time_of_day: value })}
                                className={`p-4 rounded-lg border-2 transition-all ${formData.time_of_day === value
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border hover:border-gray-500'
                                    }`}
                            >
                                <Icon className="w-8 h-8 mx-auto mb-2" />
                                <div className="text-sm">{label}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Traffic Density Slider */}
                <div className="metric-card">
                    <label className="block text-sm font-medium mb-3">
                        Traffic Density: <span className="text-primary">{Math.round(formData.traffic_density * 100)}%</span>
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={formData.traffic_density}
                        onChange={(e) => setFormData({ ...formData, traffic_density: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                </div>

                {/* Road Type */}
                <div className="metric-card">
                    <label className="block text-sm font-medium mb-3">Road Type</label>
                    <div className="grid grid-cols-2 gap-4">
                        {['city', 'highway'].map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setFormData({ ...formData, road_type: type })}
                                className={`p-4 rounded-lg border-2 transition-all ${formData.road_type === type
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border hover:border-gray-500'
                                    }`}
                            >
                                <MapPin className="w-8 h-8 mx-auto mb-2" />
                                <div className="text-sm capitalize">{type}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Object Count */}
                <div className="metric-card">
                    <label className="block text-sm font-medium mb-3">
                        Object Count: <span className="text-primary">{formData.object_count}</span>
                    </label>
                    <input
                        type="range"
                        min="5"
                        max="100"
                        value={formData.object_count}
                        onChange={(e) => setFormData({ ...formData, object_count: parseInt(e.target.value) })}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-semibold py-4 rounded-lg transition-colors"
                >
                    {loading ? 'Generating...' : 'Generate Scenario'}
                </button>
            </form>
        </div>
    );
}
