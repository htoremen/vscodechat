# Ollama AI Assistant

A built-in VS Code extension that provides AI-powered code completion and assistance using [Ollama](https://ollama.com/).

## Features

### 🤖 Intelligent Code Completion
- Real-time code suggestions as you type
- Context-aware completions based on surrounding code
- Support for 20+ programming languages
- Configurable completion delay and response length

### 🔍 Code Analysis & Explanation
- **Explain Code**: Get detailed explanations of selected code blocks
- **Refactor Code**: Improve code readability, performance, and maintainability
- **Optimize Code**: Enhance performance and efficiency
- **Generate Documentation**: Create comprehensive documentation for functions and classes

### 🧪 Test Generation
- Generate comprehensive unit tests for your functions
- Includes edge cases and proper test structure
- Supports popular testing frameworks

### 🌐 Code Translation
- Translate code between different programming languages
- Maintains functionality while adapting to language-specific patterns
- Supports JavaScript, TypeScript, Python, Java, C#, Go, Rust, and more

## Requirements

1. **Ollama Server**: [Download and install Ollama](https://ollama.com/download)
2. **AI Models**: Download at least one code-focused model:
   ```bash
   # Recommended models
   ollama pull codellama:7b        # Fast, good for completion
   ollama pull deepseek-coder:6.7b # Optimized for coding
   ollama pull qwen2:0.5b          # Very fast, basic completion
   ```

3. **Running Server**: Start Ollama server:
   ```bash
   ollama serve
   ```

## Getting Started

1. **Enable the Extension**:
   - Open VS Code Settings (`Ctrl+,` / `Cmd+,`)
   - Search for "ollama"
   - Check "Ollama: Enabled"

2. **Configure Settings**:
   ```json
   {
     "ollama.enabled": true,
     "ollama.serverUrl": "http://localhost:11434",
     "ollama.model": "codellama:7b",
     "ollama.temperature": 0.1,
     "ollama.enableAutoCompletion": true
   }
   ```

3. **Test Connection**:
   - Click the Ollama icon in the status bar
   - Or use Command Palette: "Ollama: Test Connection"

## Usage

### Code Completion
Simply start typing code. The extension will provide inline suggestions automatically.

### Using Commands
Select code and use:
- **Right-click menu** → "Ollama AI" → Choose command
- **Command Palette** (`Ctrl+Shift+P`) → Type "Ollama"
- **Keyboard shortcuts**:
  - `Ctrl+Alt+E` / `Cmd+Alt+E`: Explain Code
  - `Ctrl+Alt+R` / `Cmd+Alt+R`: Refactor Code
  - `Ctrl+Alt+T` / `Cmd+Alt+T`: Generate Tests

## Configuration

### Available Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `ollama.enabled` | `false` | Enable/disable Ollama AI assistance |
| `ollama.serverUrl` | `http://localhost:11434` | Ollama server URL |
| `ollama.model` | `codellama:7b` | Default model for code completion |
| `ollama.temperature` | `0.1` | Controls randomness (0=deterministic, 1=creative) |
| `ollama.maxTokens` | `100` | Maximum length of generated completions |
| `ollama.enableAutoCompletion` | `true` | Enable automatic inline code completion |
| `ollama.completionDelay` | `500` | Delay before triggering completion (ms) |

### Recommended Models

| Model | Size | Best For | Speed |
|-------|------|----------|-------|
| `qwen2:0.5b` | ~380MB | Quick completions | ⚡⚡⚡ |
| `codellama:7b` | ~3.8GB | Balanced coding | ⚡⚡ |
| `deepseek-coder:6.7b` | ~3.7GB | Code-specific tasks | ⚡⚡ |
| `codellama:13b` | ~7.4GB | High-quality completions | ⚡ |
| `starcoder:15b` | ~8.4GB | Complex code generation | ⚡ |

## Supported Languages

- JavaScript / TypeScript
- Python
- Java / C#
- Go / Rust
- C / C++
- PHP / Ruby
- Swift / Kotlin
- And many more...

## Troubleshooting

### Common Issues

**❌ Extension not working**
- Ensure Ollama is enabled in settings
- Check that Ollama server is running (`ollama serve`)
- Verify server URL in settings

**❌ No completions appearing**
- Check if auto-completion is enabled
- Ensure you're working in a supported language
- Try adjusting the completion delay

**❌ Slow responses**
- Try a smaller model (e.g., `qwen2:0.5b`)
- Reduce `maxTokens` setting
- Check your system resources

**❌ Connection errors**
- Verify Ollama server URL (default: `http://localhost:11434`)
- Ensure no firewall is blocking the connection
- Check Ollama server logs

### Performance Tips

1. **Use appropriate models**: Smaller models for quick completions, larger for complex tasks
2. **Adjust settings**: Lower temperature for deterministic code, higher for creative tasks
3. **Cache optimization**: The extension automatically caches recent completions
4. **Resource management**: Close unused applications to free up system resources

## Privacy & Security

- **Local Processing**: All AI processing happens locally on your machine
- **No Data Transmission**: Your code never leaves your device
- **Configurable**: Full control over what models and servers to use
- **Open Source**: Both VS Code and Ollama are open source

## Contributing

This extension is part of the VS Code built-in extensions. To contribute:

1. Visit the [VS Code repository](https://github.com/microsoft/vscode)
2. Check the contribution guidelines
3. Submit issues and pull requests

## License

Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the MIT License.

---

**Enjoy coding with AI assistance! 🚀**