/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { OllamaService } from './ollamaService';

export class OllamaCommands {
	private ollamaService: OllamaService;

	constructor(ollamaService: OllamaService) {
		this.ollamaService = ollamaService;
	}

	registerCommands(context: vscode.ExtensionContext): void {
		// Test Connection Command
		context.subscriptions.push(
			vscode.commands.registerCommand('ollama.testConnection', () => this.testConnection())
		);

		// Explain Code Command
		context.subscriptions.push(
			vscode.commands.registerCommand('ollama.explainCode', () => this.explainCode())
		);

		// Refactor Code Command
		context.subscriptions.push(
			vscode.commands.registerCommand('ollama.refactorCode', () => this.refactorCode())
		);

		// Generate Tests Command
		context.subscriptions.push(
			vscode.commands.registerCommand('ollama.generateTests', () => this.generateTests())
		);

		// Generate Documentation Command
		context.subscriptions.push(
			vscode.commands.registerCommand('ollama.generateDocumentation', () => this.generateDocumentation())
		);

		// Optimize Code Command
		context.subscriptions.push(
			vscode.commands.registerCommand('ollama.optimizeCode', () => this.optimizeCode())
		);

		// Translate Code Command
		context.subscriptions.push(
			vscode.commands.registerCommand('ollama.translateCode', () => this.translateCode())
		);
	}

	private async testConnection(): Promise<void> {
		try {
			const isConnected = await this.ollamaService.testConnection();

			if (isConnected) {
				const models = await this.ollamaService.getAvailableModels();
				const currentModel = this.ollamaService.getModel();
				const serverUrl = this.ollamaService.getServerUrl();

				const modelsList = models.length > 0 ? models.join(', ') : 'None';
				const message = `✅ **Connected to Ollama**\n\n` +
					`**Server:** ${serverUrl}\n` +
					`**Current Model:** ${currentModel}\n` +
					`**Available Models:** ${modelsList}`;

				vscode.window.showInformationMessage(message);
			} else {
				const serverUrl = this.ollamaService.getServerUrl();
				const message = `❌ **Cannot connect to Ollama**\n\n` +
					`Please ensure Ollama is running at: ${serverUrl}\n\n` +
					`To start Ollama, run: \`ollama serve\``;

				vscode.window.showErrorMessage(message);
			}
		} catch (error) {
			vscode.window.showErrorMessage(`Ollama connection error: ${error}`);
		}
	}

	private async explainCode(): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showInformationMessage('No active editor found. Please open a file and select some code.');
			return;
		}

		const selection = editor.selection;
		const selectedText = editor.document.getText(selection);

		if (!selectedText.trim()) {
			vscode.window.showInformationMessage('Please select some code to explain.');
			return;
		}

		try {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "🤖 Explaining code with Ollama...",
				cancellable: true
			}, async (progress, token) => {
				progress.report({ increment: 0, message: "Analyzing code..." });

				const explanation = await this.ollamaService.explainCode(
					selectedText,
					editor.document.languageId
				);

				if (token.isCancellationRequested) {
					return;
				}

				progress.report({ increment: 50, message: "Creating explanation document..." });

				const doc = await vscode.workspace.openTextDocument({
					content: this.formatExplanation(selectedText, explanation, editor.document.languageId),
					language: 'markdown'
				});

				progress.report({ increment: 100, message: "Done!" });

				await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
			});
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to explain code: ${error}`);
		}
	}

	private async refactorCode(): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showInformationMessage('No active editor found.');
			return;
		}

		const selection = editor.selection;
		const selectedText = editor.document.getText(selection);

		if (!selectedText.trim()) {
			vscode.window.showInformationMessage('Please select some code to refactor.');
			return;
		}

		// Ask for confirmation
		const proceed = await vscode.window.showWarningMessage(
			'This will replace the selected code with a refactored version. Do you want to continue?',
			{ modal: true },
			'Yes', 'No'
		);

		if (proceed !== 'Yes') {
			return;
		}

		try {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "🔄 Refactoring code with Ollama...",
				cancellable: true
			}, async (progress, token) => {
				progress.report({ increment: 0, message: "Analyzing code..." });

				const refactoredCode = await this.ollamaService.refactorCode(
					selectedText,
					editor.document.languageId
				);

				if (token.isCancellationRequested) {
					return;
				}

				progress.report({ increment: 50, message: "Applying changes..." });

				await editor.edit(editBuilder => {
					editBuilder.replace(selection, refactoredCode);
				});

				progress.report({ increment: 100, message: "Done!" });
			});

			vscode.window.showInformationMessage('✅ Code refactored successfully!');
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to refactor code: ${error}`);
		}
	}

	private async generateTests(): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showInformationMessage('No active editor found.');
			return;
		}

		const selection = editor.selection;
		const selectedText = editor.document.getText(selection);

		if (!selectedText.trim()) {
			vscode.window.showInformationMessage('Please select a function or class to generate tests for.');
			return;
		}

		try {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "🧪 Generating tests with Ollama...",
				cancellable: true
			}, async (progress, token) => {
				progress.report({ increment: 0, message: "Analyzing code..." });

				const tests = await this.ollamaService.generateTests(
					selectedText,
					editor.document.languageId
				);

				if (token.isCancellationRequested) {
					return;
				}

				progress.report({ increment: 50, message: "Creating test file..." });

				const testFileName = this.getTestFileName(editor.document.fileName, editor.document.languageId);
				const doc = await vscode.workspace.openTextDocument({
					content: this.formatTests(selectedText, tests, editor.document.languageId),
					language: editor.document.languageId
				});

				progress.report({ increment: 100, message: "Done!" });

				await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
			});
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to generate tests: ${error}`);
		}
	}

	private async generateDocumentation(): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showInformationMessage('No active editor found.');
			return;
		}

		const selection = editor.selection;
		const selectedText = editor.document.getText(selection);

		if (!selectedText.trim()) {
			vscode.window.showInformationMessage('Please select a function or class to document.');
			return;
		}

		try {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "📚 Generating documentation with Ollama...",
				cancellable: true
			}, async (progress, token) => {
				progress.report({ increment: 0, message: "Analyzing code..." });

				const documentation = await this.ollamaService.generateDocumentation(
					selectedText,
					editor.document.languageId
				);

				if (token.isCancellationRequested) {
					return;
				}

				progress.report({ increment: 50, message: "Inserting documentation..." });

				await editor.edit(editBuilder => {
					editBuilder.insert(selection.start, documentation + '\n');
				});

				progress.report({ increment: 100, message: "Done!" });
			});

			vscode.window.showInformationMessage('✅ Documentation generated successfully!');
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to generate documentation: ${error}`);
		}
	}

	private async optimizeCode(): Promise<void> {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showInformationMessage('No active editor found.');
			return;
		}

		const selection = editor.selection;
		const selectedText = editor.document.getText(selection);