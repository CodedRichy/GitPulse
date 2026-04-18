'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Tier, getTierBadge, canUseFeature, getMaxCustomGates, isFeatureLimited } from '@/lib/tier';

interface QualityGate {
  name: string;
  enabled: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface CustomGate {
  name: string;
  description: string;
  pattern: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  include?: string[];
  exclude?: string[];
}

interface Config {
  tier: Tier;
  quality_gates: Record<string, QualityGate>;
  custom_gates: CustomGate[];
}

export default function GatesPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) throw new Error('Failed to load config');
      const data = await response.json();
      setConfig(data.config);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    if (!config) return;

    const emeraldEdit = canUseFeature(config.tier, 'configEditing');
    if (!emeraldEdit) {
      setMessage('Config editing requires Pro or Team tier');
      return;
    }

    try {
      setSaving(true);
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrf_token='))
        ?.split('=')[1];
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || '',
        },
        credentials: 'include',
        body: JSON.stringify({
          quality_gates: config.quality_gates,
          custom_gates: config.custom_gates,
        }),
      });

      if (!response.ok) throw new Error('Failed to save');
      setMessage('Configuration saved successfully');
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }

  function toggleGate(gateName: string) {
    if (!config) return;
    setConfig({
      ...config,
      quality_gates: {
        ...config.quality_gates,
        [gateName]: {
          ...config.quality_gates[gateName],
          enabled: !config.quality_gates[gateName].enabled,
        },
      },
    });
  }

  function updateSeverity(gateName: string, severity: 'critical' | 'high' | 'medium' | 'low') {
    if (!config) return;
    setConfig({
      ...config,
      quality_gates: {
        ...config.quality_gates,
        [gateName]: {
          ...config.quality_gates[gateName],
          severity,
        },
      },
    });
  }

  function addCustomGate() {
    if (!config) return;
    const maxGates = getMaxCustomGates(config.tier);
    if (config.custom_gates.length >= maxGates) {
      setMessage(`Maximum ${maxGates} custom gates allowed on ${config.tier} tier`);
      return;
    }
    
    setConfig({
      ...config,
      custom_gates: [
        ...config.custom_gates,
        {
          name: `custom-${config.custom_gates.length + 1}`,
          description: 'New custom gate',
          pattern: 'TODO',
          severity: 'medium',
        },
      ],
    });
  }

  function removeCustomGate(index: number) {
    if (!config) return;
    setConfig({
      ...config,
      custom_gates: config.custom_gates.filter((_, i) => i !== index),
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-stone-400 font-light">Loading...</div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-red-500">Failed to load configuration</div>
      </div>
    );
  }

  const tierBadge = getTierBadge(config.tier);
  const emeraldEdit = canUseFeature(config.tier, 'configEditing');
  const maxCustomGates = getMaxCustomGates(config.tier);
  const customGateLimit = isFeatureLimited(config.tier, 'maxCustomGates', config.custom_gates.length);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl tracking-tight font-serif font-medium text-foreground">
              Git<span className="text-stone-400 dark:text-stone-500 italic">Pulse</span>
            </Link>
            <span className="text-stone-300 dark:text-stone-700">/</span>
            <Link href="/dashboard" className="text-sm text-stone-500 dark:text-stone-400 hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <span className="text-stone-300 dark:text-stone-700">/</span>
            <span className="text-sm text-foreground">Quality Gates</span>
          </div>
          <div className="flex items-center gap-6">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${tierBadge.color}`}>
              {tierBadge.text}
            </span>
            <Link href="/settings" className="text-sm text-stone-500 hover:text-foreground transition-colors">
              Settings
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Free tier upsell */}
        {!emeraldEdit && (
          <div className="mb-8 p-6 border border-stone-200 dark:border-stone-800 rounded-xl bg-stone-50 dark:bg-stone-800/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg text-foreground mb-1">Configuration is read-only</h3>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Upgrade to Pro to customize quality gates and create custom rules.
                </p>
              </div>
              <Link
                href="/subscription"
                className="px-5 py-2.5 bg-foreground text-background rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
              >
                Upgrade to Pro
              </Link>
            </div>
          </div>
        )}

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${message.includes('success') ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
            {message}
          </div>
        )}

        {/* Built-in Gates */}
        <div className="mb-8">
          <h2 className="font-serif text-xl text-foreground mb-6">Built-in Quality Gates</h2>
          <div className="space-y-4">
            {Object.entries(config.quality_gates).map(([name, gate]) => (
              <div
                key={name}
                className={`p-4 border rounded-xl ${gate.enabled ? 'border-stone-200 dark:border-stone-800' : 'border-stone-100 dark:border-stone-800/50 bg-stone-50/50 dark:bg-stone-800/20'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => emeraldEdit && toggleGate(name)}
                      disabled={!emeraldEdit}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        gate.enabled ? 'bg-foreground' : 'bg-stone-200 dark:bg-stone-700'
                      } ${!emeraldEdit ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          gate.enabled ? 'left-7' : 'left-1'
                        }`}
                      />
                    </button>
                    <div>
                      <h3 className={`font-medium ${gate.enabled ? 'text-foreground' : 'text-stone-400 dark:text-stone-500'}`}>
                        {name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        {gate.enabled ? 'Enabled' : 'Disabled'}
                      </p>
                    </div>
                  </div>
                  <select
                    value={gate.severity}
                    onChange={(e) => emeraldEdit && updateSeverity(name, e.target.value as any)}
                    disabled={!emeraldEdit || !gate.enabled}
                    className="px-3 py-1.5 text-sm border border-stone-200 dark:border-stone-700 rounded-lg bg-background disabled:opacity-50"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Gates */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl text-foreground">Custom Gates</h2>
            <span className="text-sm text-stone-500 dark:text-stone-400">
              {config.custom_gates.length} / {maxCustomGates === -1 ? '∞' : maxCustomGates}
            </span>
          </div>

          {config.custom_gates.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-stone-200 dark:border-stone-800 rounded-xl">
              <p className="text-stone-500 dark:text-stone-400 mb-4">No custom gates yet</p>
              {emeraldEdit && !customGateLimit && (
                <button
                  onClick={addCustomGate}
                  className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Add Custom Gate
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {config.custom_gates.map((gate, idx) => (
                <div key={idx} className="p-4 border border-stone-200 dark:border-stone-800 rounded-xl">
                  {emeraldEdit ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="text"
                          value={gate.name}
                          onChange={(e) => {
                            const newGates = [...config.custom_gates];
                            newGates[idx].name = e.target.value;
                            setConfig({ ...config, custom_gates: newGates });
                          }}
                          placeholder="Gate name"
                          className="px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg bg-background text-sm"
                        />
                        <select
                          value={gate.severity}
                          onChange={(e) => {
                            const newGates = [...config.custom_gates];
                            newGates[idx].severity = e.target.value as any;
                            setConfig({ ...config, custom_gates: newGates });
                          }}
                          className="px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg bg-background text-sm"
                        >
                          <option value="critical">Critical</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                      <input
                        type="text"
                        value={gate.description}
                        onChange={(e) => {
                          const newGates = [...config.custom_gates];
                          newGates[idx].description = e.target.value;
                          setConfig({ ...config, custom_gates: newGates });
                        }}
                        placeholder="Description"
                        className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg bg-background text-sm"
                      />
                      <input
                        type="text"
                        value={gate.pattern}
                        onChange={(e) => {
                          const newGates = [...config.custom_gates];
                          newGates[idx].pattern = e.target.value;
                          setConfig({ ...config, custom_gates: newGates });
                        }}
                        placeholder="Regex pattern"
                        className="w-full px-3 py-2 border border-stone-200 dark:border-stone-700 rounded-lg bg-background text-sm font-mono"
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={() => removeCustomGate(idx)}
                          className="text-red-500 hover:text-red-600 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-foreground">{gate.name}</h3>
                        <span className="px-2 py-1 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 text-xs rounded capitalize">
                          {gate.severity}
                        </span>
                      </div>
                      <p className="text-sm text-stone-500 dark:text-stone-400 mb-2">{gate.description}</p>
                      <code className="text-xs bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded font-mono">
                        {gate.pattern}
                      </code>
                    </div>
                  )}
                </div>
              ))}
              
              {emeraldEdit && !customGateLimit && (
                <button
                  onClick={addCustomGate}
                  className="w-full py-3 border border-dashed border-stone-300 dark:border-stone-700 rounded-xl text-stone-500 dark:text-stone-400 hover:border-stone-400 dark:hover:border-stone-600 transition-colors text-sm"
                >
                  + Add Custom Gate
                </button>
              )}
            </div>
          )}
        </div>

        {/* Save Button */}
        {emeraldEdit && (
          <div className="flex justify-end">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="px-6 py-2.5 bg-foreground text-background rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
