/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { OllamaService } from './ollamaService';

interface CompletionCache {
	key: string;
	completion: string;
	timestamp: number;
}

export class OllamaInlineCompletionProvider implements vscode.InlineCompletionItemProvider {
	private ollamaService: OllamaService;
	private cache: CompletionCache[] = [];
	private isGenerating = false;
	private readonly maxCacheSize = 50;
	private readonly cacheExpiryMs = 300000; // 5 minutes
	private completionDelay = 500;
	private debounceTimer: NodeJS.Timeout | undefined;

	constructor(ollamaService: OllamaService) {
		this.ollamaService = ollamaService;
		this.updateConfig();

		// Listen for configuration changes
		vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('ollama')) {
				this.updateConfig();
			}
		});
	}

	private updateConfig(): void {
		const config = vscode.workspace.getConfiguration('ollama');
		this.completionDelay = config.get<number>('completionDelay', 500);
	}

	async provideInlineCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		context: vscode.InlineCompletionContext,
		token: vscode.CancellationToken
	): Promise<vscode.InlineCompletionItem[]> {
		// Check if completion is enabled
		const config = vscode.workspace.getConfiguration('ollama');
		const isEnabled = config.get<boolean>('enabled', false);
		const autoCompletionEnabled = config.get<boolean>('enableAutoCompletion', true);

		if (!isEnabled || !autoCompletionEnabled || this.isGenerating) {
			return [];
		}

		// Check if we should provide completion based on context
		if (!this.shouldProvideCompletion(document, position, context)) {
			return [];
		}

		// Use debouncing to avoid too frequent requests
		return new Promise((resolve) => {
			if (this.debounceTimer) {
				clearTimeout(this.debounceTimer);
			}

			this.debounceTimer = setTimeout(async () => {
				try {
					const completions = await this.generateCompletions(document, position, token);
					resolve(completions);
				} catch (error) {
					console.error('Completion generation error:', error);
					resolve([]);
				}
			}, this.completionDelay);
		});
	}

	private shouldProvideCompletion(
		document: vscode.TextDocument,
		position: vscode.Position,
		context: vscode.InlineCompletionContext
	): boolean {
		// Don't provide completions in comments (basic check)
		const line = document.lineAt(position.line);
		const linePrefix = line.text.substring(0, position.character);

		// Skip if in comments
		if (this.isInComment(linePrefix, document.languageId)) {
			return false;
		}

		// Skip if line is too short
		if (linePrefix.trim().length < 3) {
			return false;
		}

		// Skip if cursor is at the beginning of a word
		const charBefore = position.character > 0 ? line.text[position.character - 1] : '';
		const charAfter = position.character < line.text.length ? line.text[position.character] : '';

		if (charAfter && /\w/.test(charAfter) && /\w/.test(charBefore)) {
			return false; // In the middle of a word
		}

		return true;
	}

	private isInComment(linePrefix: string, languageId: string): boolean {
		const commentPatterns: { [key: string]: string[] } = {
			'javascript': ['//', '/*'],
			'typescript': ['//', '/*'],
			'python': ['#'],
			'java': ['//', '/*'],
			'csharp': ['//', '/*'],
			'go': ['//', '/*'],
			'rust': ['//', '/*'],
			'cpp': ['//', '/*'],
			'c': ['//', '/*']
		};

		const patterns = commentPatterns[languageId] || [];
		return patterns.some(pattern => linePrefix.trim().startsWith(pattern));
	}

	private async generateCompletions(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken
	): Promise<vscode.InlineCompletionItem[]> {
		// Get context around cursor
		const contextRange = this.getContextRange(document, position);
		const contextText = document.getText(contextRange);

		// Check cache first
		const cacheKey = this.createCacheKey(contextText, document.languageId);
		const cachedCompletion = this.getCachedCompletion(cacheKey);

		if (cachedCompletion) {
			return [{
				insertText: cachedCompletion,
				range: new vscode.Range(position, position)
			}];
		}

		// Generate new completion
		try {
			this.isGenerating = true;

			if (token.isCancellationRequested) {
				return [];
			}

			const config = vscode.workspace.getConfiguration('ollama');
			const prompt = this.ollamaService.buildCompletionPrompt(contextText, document.languageId);

			const completion = await this.ollamaService.generateCompletion(prompt, {
				temperature: config.get<number>('temperature', 0.1),
				maxTokens: config.get<number>('maxTokens', 100),
				stop: this.getStopSequences(document.languageId)
			});

			if (token.isCancellationRequested) {
				return [];
			}

			// Clean and validate completion
			const cleanedCompletion = this.cleanCompletion(completion, document.languageId);

			if (cleanedCompletion.length === 0) {
				return [];
			}

			// Cache the result
			this.setCachedCompletion(cacheKey, cleanedCompletion);

			return [{
				insertText: cleanedCompletion,
				range: new vscode.Range(position, position)
			}];

		} catch (error) {
			console.error('Completion generation failed:', error);
			return [];
		} finally {
			this.isGenerating = false;
		}
	}

	private getContextRange(document: vscode.TextDocument, position: vscode.Position): vscode.Range {
		// Get 20 lines of context before the cursor
		const startLine = Math.max(0, position.line - 20);
		const endLine = Math.min(document.lineCount - 1, position.line + 5);

		return new vscode.Range(
			new vscode.Position(startLine, 0),
			position
		);
	}

	private getStopSequences(languageId: string): string[] {
		const commonStop = ['\n\n', '```', '---'];

		const languageSpecificStop: { [key: string]: string[] } = {
			'javascript': [';', '}', ')', ']'],
			'typescript': [';', '}', ')', ']'],
			'python': ['def ', 'class ', 'if __name__'],
			'java': [';', '}', ')', 'public ', 'private ', 'protected '],
			'csharp': [';', '}', ')', 'public ', 'private ', 'protected '],
			'go': ['}', ')', 'func ', 'package '],
			'rust': ['}', ')', 'fn ', 'struct ', 'impl ']
		};

		return [...commonStop, ...(languageSpecificStop[languageId] || [])];
	}

	private cleanCompletion(completion: string, languageId: string): string {
		// Remove any leading/trailing whitespace
		let cleaned = completion.trim();

		// Remove markdown code blocks if present
		cleaned = cleaned.replace(/^```[\w]*\n/, '').replace(/\n```$/, '');

		// Remove any explanatory text that might have been included
		const lines = cleaned.split('\n');
		const codeLines: string[] = [];

		for (const line of lines) {
			// Skip explanatory lines
			if (this.isExplanatoryLine(line)) {
				break;
			}
			codeLines.push(line);
		}

		cleaned = codeLines.join('\n');

		// Ensure it doesn't exceed reasonable length
		if (cleaned.length > 500) {
			cleaned = cleaned.substring(0, 500);
		}

		return cleaned;
	}

	private isExplanatoryLine(line: string): boolean {
		const explanatoryPatterns = [
			/^(this|the|here|now|then|explanation|note|important)/i,
			/^(\/\*|\/\/|\#)\s*(explanation|note|this)/i
		];

		return explanatoryPatterns.some(pattern => pattern.test(line.trim()));
	}

	private createCacheKey(context: string, languageId: string): string {
		// Create a hash-like key from context
		const contextHash = this.simpleHash(context);
		return `${languageId}:${contextHash}`;
	}

	private simpleHash(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return hash.toString(36);
	}

	private getCachedCompletion(key: string): string | null {
		const now = Date.now();

		// Clean expired entries
		this.cache = this.cache.filter(entry =>
			now - entry.timestamp < this.cacheExpiryMs
		);

		const cached = this.cache.find(entry => entry.key === key);
		return cached ? cached.completion : null;
	}

	private setCachedCompletion(key: string, completion: string): void {
		const now = Date.now();

		// Remove existing entry with same key
		this.cache = this.cache.filter(entry => entry.key !== key);

		// Add new entry
		this.cache.push({ key, completion, timestamp: now });

		// Limit cache size
		if (this.cache.length > this.maxCacheSize) {
			this.cache.sort((a, b) => b.timestamp - a.timestamp);
			this.cache = this.cache.slice(0, this.maxCacheSize);
		}
	}

	public clearCache(): void {
		this.cache = [];
	}
}