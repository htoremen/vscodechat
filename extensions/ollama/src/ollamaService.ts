/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface OllamaModel {
	name: string;
	size: number;
	modified_at: string;
}

export interface OllamaResponse {
	response: string;
	done: boolean;
	context?: number[];
}

export interface OllamaGenerateRequest {
	model: string;
	prompt: string;
	stream?: boolean;
	options?: {
		temperature?: number;
		num_predict?: number;
		stop?: string[];
		top_k?: number;
		top_p?: number;
	};
}

export class OllamaService {
	private serverUrl: string;
	private model: string;
	private readonly timeout = 30000; // 30 seconds

	constructor(serverUrl: string, model: string) {
		this.serverUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
		this.model = model;
	}

	updateConfig(serverUrl: string, model: string): void {
		this.serverUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
		this.model = model;
	}

	async testConnection(): Promise<boolean> {
		try {
			const response = await fetch(`${this.serverUrl}/api/tags`, {
				method: 'GET',
				signal: AbortSignal.timeout(5000)
			});
			return response.ok;
		} catch (error) {
			console.error('Ollama connection test failed:', error);
			return false;
		}
	}

	async getAvailableModels(): Promise<string[]> {
		try {
			const response = await fetch(`${this.serverUrl}/api/tags`, {
				signal: AbortSignal.timeout(5000)
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json() as { models: OllamaModel[] };
			return data.models?.map(model => model.name) || [];
		} catch (error) {
			console.error('Failed to get models:', error);
			return [];
		}
	}

	async generateCompletion(prompt: string, options?: {
		temperature?: number;
		maxTokens?: number;
		stop?: string[];
	}): Promise<string> {
		const request: OllamaGenerateRequest = {
			model: this.model,
			prompt: prompt,
			stream: false,
			options: {
				temperature: options?.temperature || 0.1,
				num_predict: options?.maxTokens || 100,
				stop: options?.stop || []
			}
		};

		try {
			const response = await fetch(`${this.serverUrl}/api/generate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(request),
				signal: AbortSignal.timeout(this.timeout)
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data = await response.json() as OllamaResponse;
			return data.response.trim();
		} catch (error) {
			console.error('Ollama completion failed:', error);
			throw new Error(`Failed to generate completion: ${error}`);
		}
	}

	async *streamCompletion(prompt: string, options?: {
		temperature?: number;
		maxTokens?: number;
		stop?: string[];
	}): AsyncGenerator<string, void, unknown> {
		const request: OllamaGenerateRequest = {
			model: this.model,
			prompt: prompt,
			stream: true,
			options: {
				temperature: options?.temperature || 0.1,
				num_predict: options?.maxTokens || 100,
				stop: options?.stop || []
			}
		};

		try {
			const response = await fetch(`${this.serverUrl}/api/generate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(request)
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const reader = response.body?.getReader();
			const decoder = new TextDecoder();

			if (!reader) {
				throw new Error('No response body reader available');
			}

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value);
				const lines = chunk.split('\n').filter(line => line.trim());

				for (const line of lines) {
					try {
						const json = JSON.parse(line) as OllamaResponse;
						if (json.response) {
							yield json.response;
						}
						if (json.done) {
							return;
						}
					} catch (e) {
						// Skip invalid JSON lines
						continue;
					}
				}
			}
		} catch (error) {
			console.error('Ollama streaming failed:', error);
			throw new Error(`Failed to stream completion: ${error}`);
		}
	}

	async explainCode(code: string, language: string): Promise<string> {
		const prompt = `Explain the following ${language} code in detail. Be clear and concise:

\`\`\`${language}
${code}
\`\`\`

Explanation:`;

		return await this.generateCompletion(prompt, {
			temperature: 0.3,
			maxTokens: 300
		});
	}

	async refactorCode(code: string, language: string): Promise<string> {
		const prompt = `Refactor the following ${language} code to improve readability, performance, and maintainability. Only return the refactored code without explanations:

\`\`\`${language}
${code}
\`\`\`

Refactored code:`;

		const response = await this.generateCompletion(prompt, {
			temperature: 0.2,
			maxTokens: 500
		});

		// Extract code from response (remove markdown formatting if present)
		const codeMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/);
		return codeMatch ? codeMatch[1].trim() : response.trim();
	}

	async generateTests(code: string, language: string): Promise<string> {
		const prompt = `Generate comprehensive unit tests for the following ${language} code. Include edge cases and use appropriate testing framework:

\`\`\`${language}
${code}
\`\`\`

Unit tests:`;

		return await this.generateCompletion(prompt, {
			temperature: 0.2,
			maxTokens: 500
		});
	}

	async generateDocumentation(code: string, language: string): Promise<string> {
		const prompt = `Generate comprehensive documentation for the following ${language} code. Use appropriate comment syntax for ${language}:

\`\`\`${language}
${code}
\`\`\`

Documentation:`;

		return await this.generateCompletion(prompt, {
			temperature: 0.2,
			maxTokens: 300
		});
	}

	async optimizeCode(code: string, language: string): Promise<string> {
		const prompt = `Optimize the following ${language} code for better performance. Only return the optimized code without explanations:

\`\`\`${language}
${code}
\`\`\`

Optimized code:`;

		const response = await this.generateCompletion(prompt, {
			temperature: 0.2,
			maxTokens: 500
		});

		const codeMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/);
		return codeMatch ? codeMatch[1].trim() : response.trim();
	}

	async translateCode(code: string, fromLanguage: string, toLanguage: string): Promise<string> {
		const prompt = `Translate the following ${fromLanguage} code to ${toLanguage}. Only return the translated code without explanations:

\`\`\`${fromLanguage}
${code}
\`\`\`

${toLanguage} code:`;

		const response = await this.generateCompletion(prompt, {
			temperature: 0.2,
			maxTokens: 500
		});

		const codeMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/);
		return codeMatch ? codeMatch[1].trim() : response.trim();
	}

	buildCompletionPrompt(context: string, language: string): string {
		return `Complete the following ${language} code. Only provide the completion, no explanations:

${context}`;
	}

	getModel(): string {
		return this.model;
	}

	getServerUrl(): string {
		return this.serverUrl;
	}
}