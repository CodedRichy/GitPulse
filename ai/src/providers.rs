//! AI Provider implementations

use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};

/// OpenRouter API request body
#[derive(Debug, Serialize)]
struct OpenRouterRequest {
    model: String,
    messages: Vec<Message>,
}

/// OpenRouter/Ollama message format
#[derive(Debug, Serialize, Deserialize)]
struct Message {
    role: String,
    content: String,
}

/// OpenRouter API response
#[derive(Debug, Deserialize)]
struct OpenRouterResponse {
    choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
struct Choice {
    message: Message,
}

/// Ollama generate request
#[derive(Debug, Serialize)]
struct OllamaRequest {
    model: String,
    prompt: String,
    stream: bool,
}

/// Ollama generate response
#[derive(Debug, Deserialize)]
struct OllamaResponse {
    response: String,
}

/// Provider configuration
#[derive(Debug, Clone)]
pub struct ProviderConfig {
    pub name: String,
    pub endpoint: String,
    pub api_key: Option<String>,
    pub model: String,
}

/// AI Provider - enum-based for compile-time dispatch
#[derive(Debug, Clone)]
pub enum Provider {
    Ollama(ProviderConfig),
    OpenRouter(ProviderConfig),
}

impl Provider {
    /// Create Ollama provider
    pub fn ollama(model: &str) -> Self {
        Provider::Ollama(ProviderConfig {
            name: "Ollama".to_string(),
            endpoint: "http://localhost:11434".to_string(),
            api_key: None,
            model: model.to_string(),
        })
    }
    
    /// Create OpenRouter provider
    pub fn openrouter(api_key: &str, model: &str) -> Self {
        Provider::OpenRouter(ProviderConfig {
            name: "OpenRouter".to_string(),
            endpoint: "https://openrouter.ai/api/v1".to_string(),
            api_key: Some(api_key.to_string()),
            model: model.to_string(),
        })
    }
    
    /// Check if provider is available
    pub async fn is_available(&self) -> bool {
        match self {
            Provider::Ollama(config) => {
                // Check if Ollama is running
                match reqwest::Client::new()
                    .get(format!("{}/api/tags", config.endpoint))
                    .timeout(std::time::Duration::from_secs(2))
                    .send()
                    .await
                {
                    Ok(resp) => resp.status().is_success(),
                    Err(_) => false,
                }
            }
            Provider::OpenRouter(config) => config.api_key.is_some(),
        }
    }
    
    /// Get provider name
    pub fn name(&self) -> &str {
        match self {
            Provider::Ollama(config) => &config.name,
            Provider::OpenRouter(config) => &config.name,
        }
    }
    
    /// Get model name
    pub fn model(&self) -> &str {
        match self {
            Provider::Ollama(config) => &config.model,
            Provider::OpenRouter(config) => &config.model,
        }
    }
    
    /// Generate text from prompt (async)
    pub async fn generate(&self, prompt: &str) -> Result<String> {
        match self {
            Provider::Ollama(config) => {
                Self::call_ollama(config, prompt).await
            }
            Provider::OpenRouter(config) => {
                Self::call_openrouter(config, prompt).await
            }
        }
    }
    
    /// Call Ollama API
    async fn call_ollama(config: &ProviderConfig, prompt: &str) -> Result<String> {
        let client = reqwest::Client::new();
        let url = format!("{}/api/generate", config.endpoint);
        
        let request_body = OllamaRequest {
            model: config.model.clone(),
            prompt: prompt.to_string(),
            stream: false,
        };
        
        let response = client
            .post(&url)
            .json(&request_body)
            .send()
            .await
            .context("Failed to connect to Ollama")?;
        
        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!("Ollama API error {}: {}", status, text));
        }
        
        let ollama_response: OllamaResponse = response
            .json()
            .await
            .context("Failed to parse Ollama response")?;
        
        Ok(ollama_response.response)
    }
    
    /// Call OpenRouter API
    async fn call_openrouter(config: &ProviderConfig, prompt: &str) -> Result<String> {
        let client = reqwest::Client::new();
        let api_key = config.api_key.as_ref()
            .ok_or_else(|| anyhow::anyhow!("OpenRouter API key not configured"))?;
        
        let request_body = OpenRouterRequest {
            model: config.model.clone(),
            messages: vec![Message {
                role: "user".to_string(),
                content: prompt.to_string(),
            }],
        };
        
        let response = client
            .post(&format!("{}/chat/completions", config.endpoint))
            .header("Authorization", format!("Bearer {}", api_key))
            .header("HTTP-Referer", "https://gitpulse.dev")
            .header("X-OpenRouter-Title", "GitPulse")
            .json(&request_body)
            .send()
            .await
            .context("Failed to connect to OpenRouter")?;
        
        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!("OpenRouter API error {}: {}", status, text));
        }
        
        let openrouter_response: OpenRouterResponse = response
            .json()
            .await
            .context("Failed to parse OpenRouter response")?;
        
        let content = openrouter_response
            .choices
            .first()
            .map(|c| c.message.content.clone())
            .unwrap_or_default();
        
        Ok(content)
    }
}

/// Provider selector based on availability and task type
pub struct ProviderSelector;

impl ProviderSelector {
    /// Select best available provider (async)
    pub async fn select(providers: &[Provider]) -> Option<&Provider> {
        // Check each provider's availability
        for provider in providers {
            if provider.is_available().await {
                return Some(provider);
            }
        }
        None
    }
    
    /// Select provider based on user preference, fallback to available
    pub async fn select_with_preference<'a>(
        providers: &'a [Provider],
        preferred: &str,
    ) -> Option<&'a Provider> {
        // First try to find preferred provider
        if let Some(preferred) = providers.iter().find(|p| {
            p.name().to_lowercase() == preferred.to_lowercase()
        }) {
            if preferred.is_available().await {
                return Some(preferred);
            }
        }
        // Fallback to any available
        Self::select(providers).await
    }
}

/// Create default providers from environment
pub fn default_providers() -> Vec<Provider> {
    let mut providers = Vec::new();
    
    // Try Ollama with common models
    let ollama_models = ["codellama", "llama3.1", "qwen2.5-coder"];
    for model in ollama_models {
        providers.push(Provider::ollama(model));
    }
    
    // Try OpenRouter if API key is set
    if let Ok(api_key) = std::env::var("OPENROUTER_API_KEY") {
        // Default to a good free/cheap model
        providers.push(Provider::openrouter(
            &api_key,
            "meta-llama/llama-3.1-8b-instruct"
        ));
        // Also add a stronger model for complex tasks
        providers.push(Provider::openrouter(
            &api_key,
            "anthropic/claude-3.5-sonnet"
        ));
    }
    
    providers
}

/// Task complexity levels
#[derive(Debug, Clone, Copy)]
pub enum TaskComplexity {
    Simple,   // 1-5 line changes
    Medium,   // Small feature or fix
    Complex,  // Large refactor or feature
    Critical, // Security, performance
}

/// Simple text-based provider for testing
pub struct SimpleProvider {
    name: String,
}

impl SimpleProvider {
    pub fn new(name: &str) -> Self {
        Self {
            name: name.to_string(),
        }
    }
    
    pub fn generate(&self, _prompt: &str) -> String {
        format!("[SimpleProvider {}] Mock response", self.name)
    }
}
