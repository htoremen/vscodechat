/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { OllamaService } from './ollamaService';
import { OllamaInlineCompletionProvider } from './completionProvider';
import { OllamaCommands } from './commands';

let ollamaService: OllamaService;
let completionProvider: OllamaInlineCompletionProvider;
let commands: OllamaCommands;
let statusBarItem: vscode.StatusBarItem;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
	console.log('🤖 Ollama extension activating...');

	// Check if Ollama is enabled
	const config = vscode.workspace.getConfiguration('ollama');
	if (!config.get<boolean>('enabled', false)) {
		console.log('Ollama is disabled in configuration. Enable it in settings to use AI features.');

		// Show a one-time notification about enabling Ollama
		const enableKey = 'ollama.enableNotificationShown';
		const hasShownNotification = context.globalState.get(enableKey, false);

		if (!hasShownNotification) {
			const result = await vscode.window.showInformationMessage(
				'Ollama AI Assistant is available but disabled. Would you like to enable it?',
				'Enable', 'Learn More', 'Don\'t Show Again'
			);

			if (result === 'Enable') {
				await config.update('enabled', true, vscode.ConfigurationTarget.Global);
				vscode.window.showInformationMessage('Ollama enabled! Make sure Ollama server is running.');
			} else if (result === 'Learn More') {
				vscode.env.openExternal(vscode.Uri.parse('https://ollama.com/'));
			}

			await context.globalState.update(enableKey, true);
		}

		return;
	}

	// Initialize Ollama service
	ollamaService = new OllamaService(
		config.get<string>('serverUrl', 'http://localhost:11434'),
		config.get<string>('model', 'codellama:7b')
	);

	// Create status bar item
	statusBarItem = createStatusBarItem();
	context.subscriptions.push(statusBarItem);

	// Test initial connection
	await updateConnectionStatus();

	// Initialize completion provider
	completionProvider = new OllamaInlineCompletionProvider(ollamaService);
	registerCompletionProviders(context);

	// Initialize and register commands
	commands = new OllamaCommands(ollamaService);
	commands.registerCommands(context);

	// Listen for configuration changes
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(async e => {
			if (e.affectsConfiguration('ollama')) {
				await handleConfigurationChange();
			}
		})
	);

	// Periodic connection check
	const connectionCheckInterval = setInterval(async () => {
		await updateConnectionStatus();
	}, 60000); // Check every minute

	context.subscriptions.push({
		dispose: () => clearInterval(connectionCheckInterval)
	});

	console.log('✅ Ollama extension activated successfully!');
}

function createStatusBarItem(): vscode.StatusBarItem {
	const statusBarItem = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right,
		100
	);

	statusBarItem.text = '$(loading~spin) Ollama';
	statusBarItem.tooltip = 'Ollama AI Assistant - Click to test connection';
	statusBarItem.command = 'ollama.testConnection';
	statusBarItem.show();

	return statusBarItem;
}

async function updateConnectionStatus(): Promise<void> {
	try {
		const isConnected = await ollamaService.testConnection();

		if (isConnected) {
			statusBarItem.text = '$(check) Ollama';
			statusBarItem.tooltip = 'Ollama AI Assistant - Connected';
			statusBarItem.color = undefined;
			statusBarItem.backgroundColor = undefined;
		} else {
			statusBarItem.text = '$(error) Ollama';
			statusBarItem.tooltip = 'Ollama AI Assistant - Disconnected (Click to test connection)';
			statusBarItem.color = new vscode.ThemeColor('errorForeground');
			statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
		}
	} catch (error) {
		statusBarItem.text = '$(error) Ollama';
		statusBarItem.tooltip = `Ollama AI Assistant - Error: ${error}`;
		statusBarItem.color = new vscode.ThemeColor('errorForeground');
		statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
		console.error('Ollama connection check failed:', error);
	}
}

function registerCompletionProviders(context: vscode.ExtensionContext): void {
	// Supported languages for code completion
	const supportedLanguages = [
		'javascript',
		'typescript',
		'python',
		'java',
		'csharp',
		'go',
		'rust',
		'cpp',
		'c',
		'php',
		'ruby',
		'swift',
		'kotlin',
		'scala',
		'dart',
		'lua',
		'perl',
		'r',
		'julia',
		'haskell',
		'ocaml',
		'fsharp'
	];

	for (const language of supportedLanguages) {
		context.subscriptions.push(
			vscode.languages.registerInlineCompletionItemProvider(
				{ language, scheme: 'file' },
				completionProvider
			)
		);
	}

	// Also register for plaintext files that might contain code
	context.subscriptions.push(
		vscode.languages.registerInlineCompletionItemProvider(
			{ language: 'plaintext', scheme: 'file' },
			completionProvider
		)
	);
}

async function handleConfigurationChange(): Promise<void> {
	const config = vscode.workspace.getConfiguration('ollama');

	// Check if Ollama was disabled
	if (!config.get<boolean>('enabled', false)) {
		vscode.window.showInformationMessage(
			'Ollama AI Assistant has been disabled. AI features will not be available until re-enabled.'
		);
		statusBarItem.hide();
		return;
	}

	// Show status bar if it was hidden
	statusBarItem.show();

	// Update service configuration
	if (ollamaService) {
		ollamaService.updateConfig(
			config.get<string>('serverUrl', 'http://localhost:11434'),
			config.get<string>('model', 'codellama:7b')
		);

		// Test connection with new settings
		await updateConnectionStatus();

		// Clear completion cache when model changes
		if (completionProvider) {
			completionProvider.clearCache();
		}

		vscode.window.showInformationMessage('Ollama configuration updated successfully.');
	}
}

export function deactivate(): void {
	console.log('🤖 Ollama extension deactivating...');

	if (statusBarItem) {
		statusBarItem.dispose();
	}

	if (completionProvider) {
		completionProvider.clearCache();
	}

	console.log('✅ Ollama extension deactivated.');
}